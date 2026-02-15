/**
 * ASSET VECTOR | SERVER-SIDE CACHE
 * 
 * Provides a robust In-Memory LRU-style cache with Time-to-Live (TTL).
 * This prevents rate-limit abuse and ensures instant response times for hot assets.
 * 
 * Future Upgrade: Replace `Map` with Redis (Vercel KV) for serverless persistence.
 */

type CacheEntry<T> = {
  data: T;
  expiry: number;
};

const cache = new Map<string, CacheEntry<any>>();

// Standard Cache Durations
export const CACHE_TTL = {
  MARKET_DATA: 60 * 1000,    // 1 Minute (Candle close)
  PREDICTION: 60 * 60 * 1000, // 1 Hour (AI Inference)
};

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cache.delete(key); // Evict expired
    return null;
  }

  return entry.data as T;
}

export function setInCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlMs
  });
  
  // Simple cleanup strategy: If cache grows too large, clear it (for Dev safety)
  if (cache.size > 1000) {
    const keysToDelete = Array.from(cache.keys()).slice(0, 500);
    keysToDelete.forEach(k => cache.delete(k));
  }
}
