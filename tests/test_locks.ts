import { acquireLock, releaseLock } from "../lib/locks";
import { db } from "../db";
import { systemKv } from "../db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
  const testKey = "test_lock_" + Date.now();
  console.log("Testing lock:", testKey);

  // 1. Initial acquire
  const acquired1 = await acquireLock(testKey, 5000);
  console.log("Initial acquire (expected true):", acquired1);
  if (!acquired1) throw new Error("Failed to acquire initial lock");

  // 2. Second acquire (should fail)
  const acquired2 = await acquireLock(testKey, 5000);
  console.log("Second acquire while active (expected false):", acquired2);
  if (acquired2) throw new Error("Acquired lock while it was already active");

  // 3. Expire the lock manually in the DB
  const past = new Date(Date.now() - 10000); // 10 seconds ago
  await db.update(systemKv).set({ expiresAt: past }).where(eq(systemKv.key, `lock:${testKey}`));
  console.log("Manually expired the lock in the DB.");

  // 4. Third acquire (should succeed because it's expired)
  const acquired3 = await acquireLock(testKey, 5000);
  console.log("Third acquire after expiration (expected true):", acquired3);
  if (!acquired3) throw new Error("Failed to acquire lock even though it was expired");

  // 5. Concurrent acquire test
  const concurrentKey = "concurrent_lock_" + Date.now();
  console.log("Testing concurrency for:", concurrentKey);
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(acquireLock(concurrentKey, 10000));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r === true).length;
  console.log(`Concurrent acquire successes (expected 1): ${successCount} out of 10`);
  if (successCount !== 1) throw new Error(`Concurrency test failed. Expected 1 success, got ${successCount}`);

  // Cleanup
  await releaseLock(testKey);
  await releaseLock(concurrentKey);
  
  console.log("All tests passed successfully!");
  process.exit(0);
}

runTest().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
