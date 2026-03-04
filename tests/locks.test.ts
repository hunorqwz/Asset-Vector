
import { acquireLock, releaseLock, withLock } from '../lib/locks';
import { db } from '../db';
import { systemKv } from '../db/schema';
import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Distributed Lock Engine (lib/locks)', () => {
  const LOCK_KEY = 'test_unit_lock';

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(systemKv).where(eq(systemKv.key, `lock:${LOCK_KEY}`));
  });

  afterEach(async () => {
    await db.delete(systemKv).where(eq(systemKv.key, `lock:${LOCK_KEY}`));
  });

  it('should acquire a new lock successfully', async () => {
    const success = await acquireLock(LOCK_KEY, 10000);
    expect(success).toBe(true);

    const record = await db.query.systemKv.findFirst({
      where: eq(systemKv.key, `lock:${LOCK_KEY}`)
    });
    expect(record).toBeDefined();
    expect(new Date(record!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('should fail to acquire if lock is already active', async () => {
    await acquireLock(LOCK_KEY, 10000);
    const retry = await acquireLock(LOCK_KEY, 10000);
    expect(retry).toBe(false);
  });

  it('should allow acquisition if existing lock is expired', async () => {
    // Manually insert an expired lock
    await db.insert(systemKv).values({
      key: `lock:${LOCK_KEY}`,
      value: { lockedAt: new Date(Date.now() - 20000).toISOString() },
      expiresAt: new Date(Date.now() - 1000)
    });

    const success = await acquireLock(LOCK_KEY, 10000);
    expect(success).toBe(true);
  });

  it('should release a lock', async () => {
    await acquireLock(LOCK_KEY, 10000);
    await releaseLock(LOCK_KEY);
    
    const record = await db.query.systemKv.findFirst({
      where: eq(systemKv.key, `lock:${LOCK_KEY}`)
    });
    expect(record).toBeUndefined();
  });

  it('should execute withLock and release afterwards', async () => {
    let executed = false;
    await withLock(LOCK_KEY, async () => {
      executed = true;
      // Inside lock, retry should fail
      const retry = await acquireLock(LOCK_KEY, 1000);
      expect(retry).toBe(false);
    });
    
    expect(executed).toBe(true);
    // After withLock, it should be released
    const success = await acquireLock(LOCK_KEY, 1000);
    expect(success).toBe(true);
  });
});
