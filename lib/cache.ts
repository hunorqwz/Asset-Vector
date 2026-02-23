type CacheEntry<T> = { data: T; expiry: number };
const cache = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL = {
  MARKET_DATA: 60 * 1000,
  PREDICTION: 60 * 60 * 1000,
};

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setInCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  if (cache.size > 1000) {
    const keys = Array.from(cache.keys());
    for (let i = 0; i < 500; i++) cache.delete(keys[i]);
  }
}
