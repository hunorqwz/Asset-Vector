type CacheEntry<T> = { data: T; expiry: number };
const cache = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL = {
  MARKET_DATA: 60 * 1000,
  PREDICTION: 60 * 60 * 1000,
  STOCK_DETAILS: 60 * 60 * 1000, // 1 Hour
};

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  // LRU Bump: Move key to the absolute end of the Map iteration (Most Recently Used)
  cache.delete(key);
  cache.set(key, entry);
  return entry.data as T;
}

export function setInCache<T>(key: string, data: T, ttlMs: number) {
  // Map insertion order is not updated on value override, so we delete first to guarantee LRU tail placement.
  cache.delete(key);
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  
  // LRU Garbage Collection
  if (cache.size > 1000) {
    const keys = cache.keys();
    let deleted = 0;
    
    // Evict the 30% oldest (Least Recently Used) entries, but offer benchmark immunity.
    for (const k of keys) {
      if (deleted >= 300) break;
      if (k.includes('_SPY_')) continue; // Institutional Benchmark Protection Shield
      cache.delete(k);
      deleted++;
    }
  }
}
