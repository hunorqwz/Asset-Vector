import { db } from "@/db";
import { systemKv } from "@/db/schema";
import { eq } from "drizzle-orm";

export const CACHE_TTL = {
  MARKET_DATA: 60 * 1000,
  PREDICTION: 60 * 60 * 1000,
  STOCK_DETAILS: 60 * 60 * 1000, // 1 Hour
};

type CacheEntry<T> = { data: T; expiry: number };
const l1Cache = new Map<string, CacheEntry<unknown>>();

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    // 1. L1 Fast Memory Cache (Hot Path)
    const l1 = l1Cache.get(key);
    if (l1) {
      if (Date.now() > l1.expiry) {
        l1Cache.delete(key);
      } else {
        l1Cache.delete(key); 
        l1Cache.set(key, l1); // LRU bump
        return l1.data as T;
      }
    }

    // 2. L2 Persistent DB Cache (Cold Path / Serverless Consistency)
    if (process.env.NODE_ENV === 'test') return null;
    const entry = await db.query.systemKv.findFirst({
      where: eq(systemKv.key, key)
    });
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      // Lazy eviction; don't await deletion to keep fetch fast
      db.delete(systemKv).where(eq(systemKv.key, key)).catch(() => {});
      return null;
    }
    
    // Backfill L1 cache
    l1Cache.set(key, { data: entry.value, expiry: entry.expiresAt.getTime() });
    
    return entry.value as T;
  } catch (err) {
    console.error(`[Cache Read Error] ${key}:`, err);
    return null; // Fail open
  }
}

export async function setInCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    
    // Set L1 Cache
    l1Cache.set(key, { data, expiry: expiresAt.getTime() });
    
    // Garbage Collect L1 (Max 1000 items)
    if (l1Cache.size > 1000) {
      const iter = l1Cache.keys();
      for (let i = 0; i < 300; i++) {
         const k = iter.next().value;
         if (k && !k.includes('_SPY_')) l1Cache.delete(k);
      }
    }
    
    // Non-blocking writes for SPLR patterns
    if (process.env.NODE_ENV === 'test') return;
    db.insert(systemKv).values({
      key,
      value: data as any,
      expiresAt
    }).onConflictDoUpdate({
      target: systemKv.key,
      set: {
        value: data as any,
        expiresAt
      }
    }).catch((err: any) => console.error(`[Cache Write Error] ${key}:`, err));
    
  } catch (err: any) {
    console.error(`[Cache Write Error] ${key}:`, err);
  }
}
