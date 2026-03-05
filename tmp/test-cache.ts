
import { getFromCache, setInCache } from '../lib/cache';
import { db } from '../db';

async function testCacheIsolation() {
  console.log('--- Testing Cache Isolation (structuredClone) ---');
  
  const key = 'test_isolation_key';
  const initialData = { ticker: 'AAPL', signals: [1, 2, 3], metadata: { sector: 'Tech' } };
  
  // Set in cache
  await setInCache(key, initialData, 5000);
  
  // Retrieve from cache
  const retrieved = await getFromCache<typeof initialData>(key);
  
  if (!retrieved) {
    console.error('Failed to retrieve from cache');
    return;
  }
  
  // Mutate the retrieved object
  retrieved.signals.push(4);
  retrieved.metadata.sector = 'Modified';
  
  // Retrieve again - it should NOT be modified if structuredClone works
  const secondRetrieval = await getFromCache<typeof initialData>(key);
  
  if (!secondRetrieval) {
    console.error('Failed to retrieve from cache second time');
    return;
  }
  
  console.log('Original Data:', JSON.stringify(initialData.signals));
  console.log('Retrieved & Mutated Data:', JSON.stringify(retrieved.signals));
  console.log('Second Retrieval (Should be original):', JSON.stringify(secondRetrieval.signals));
  
  const isIsolated = secondRetrieval.signals.length === 3 && secondRetrieval.metadata.sector === 'Tech';
  console.log('Isolation Test:', isIsolated ? 'PASS' : 'FAIL');
  
  process.exit(isIsolated ? 0 : 1);
}

testCacheIsolation().catch(err => {
  console.error(err);
  process.exit(1);
});
