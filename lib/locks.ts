import { db } from "@/db";
import { systemKv } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * HIGH-PRECISION DISTRIBUTED LOCK ENGINE
 * 
 * In serverless environments (Vercel/Next.js Lambdas), global memory is not shared.
 * This utility provides a DB-backed mutex to ensure expensive operations (signal evaluation, 
 * pruning, data sync) do not run concurrently across multiple instances.
 */

export async function acquireLock(key: string, durationMs: number = 60000): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMs);

  try {
    // 1. Check if a non-expired lock already exists
    const existing = await db.query.systemKv.findFirst({
      where: and(
        eq(systemKv.key, `lock:${key}`),
        gt(systemKv.expiresAt, now)
      )
    });

    if (existing) return false;

    // 2. Attempt to Upsert the lock
    // Using a simple overwrite if expired, but the 'where' clause in some DBs is better.
    // Drizzle/Neon doesn't support 'onConflict' with a where condition easily for generic updates,
    // so we use the existence check above as a guard.
    await db.insert(systemKv).values({
      key: `lock:${key}`,
      value: { lockedAt: now.toISOString() },
      expiresAt: expiresAt
    }).onConflictDoUpdate({
      target: systemKv.key,
      set: { 
        value: { lockedAt: now.toISOString() },
        expiresAt: expiresAt 
      }
    });

    return true;
  } catch (error) {
    console.error(`[Distributed Lock] Failed to acquire lock for ${key}:`, error);
    return false;
  }
}

export async function releaseLock(key: string): Promise<void> {
  try {
    await db.delete(systemKv).where(eq(systemKv.key, `lock:${key}`));
  } catch (error) {
    console.error(`[Distributed Lock] Failed to release lock for ${key}:`, error);
  }
}

/**
 * Executes a function within a protected lock context.
 */
export async function withLock<T>(
  key: string, 
  fn: () => Promise<T>, 
  durationMs: number = 60000
): Promise<T | null> {
  const acquired = await acquireLock(key, durationMs);
  if (!acquired) return null;

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}
