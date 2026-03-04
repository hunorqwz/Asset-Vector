import { getFromCache } from './lib/cache';

async function test() {
  const CACHE_KEY = "market_pulse_data_v2";
  const cached = await getFromCache(CACHE_KEY);
  console.log("Cached Market Pulse:", JSON.stringify(cached, null, 2));
}

test().catch(console.error);
