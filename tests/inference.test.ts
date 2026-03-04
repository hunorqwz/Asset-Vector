
import { predictNextHorizon } from '../lib/inference';
import { getFromCache, setInCache } from '../lib/cache';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Inference Engine - Circuit Breaker (lib/inference)', () => {
  const dummySequence = Array(50).fill([100, 101, 99, 100, 1000]);
  const ticker = 'TEST_TICKER';

  beforeEach(async () => {
    // Clear failure count and circuit state
    await setInCache("ml_failure_count", 0, 0);
    await setInCache("ml_circuit_tripped", false, 0);
    // Deep clear the internal cache map if possible, but at least clear relevant keys
    // By providing 0 TTL it clears on next get, but we need to ensure the Map is fresh.
    // Since we can't easily reach the internal 'cache' Map in lib/cache from here without exports,
    // we use a fresh ticker for every test.
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should reset failure count on success', async () => {
    const tickerSuccess = 'SUCCESS_TICK';
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ p10: 95, p50: 105, p90: 115 })
    } as any);

    // Set initial failure count
    await setInCache("ml_failure_count", 2, 60000);

    await predictNextHorizon(dummySequence, tickerSuccess);
    
    expect(await getFromCache("ml_failure_count")).toBe(0);
  });

  it('should trip the circuit after 3 failures', async () => {
    const tickerFail = 'FAIL_TICK';
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as any);

    // Call 1
    await predictNextHorizon(dummySequence, tickerFail + "1");
    expect(await getFromCache("ml_failure_count")).toBe(1);
    expect(await getFromCache("ml_circuit_tripped")).toBeFalsy();

    // Call 2
    await predictNextHorizon(dummySequence, tickerFail + "2");
    expect(await getFromCache("ml_failure_count")).toBe(2);
    expect(await getFromCache("ml_circuit_tripped")).toBeFalsy();

    // Call 3 -> Should trip
    await predictNextHorizon(dummySequence, tickerFail + "3");
    expect(await getFromCache("ml_failure_count")).toBe(3);
    expect(await getFromCache("ml_circuit_tripped")).toBe(true);
  });

  it('should bypass fetch immediately if circuit is tripped', async () => {
    await setInCache("ml_circuit_tripped", true, 60000);
    
    const result = await predictNextHorizon(dummySequence, 'ANY_TICK');
    
    // Fetch should not have been called
    expect(fetch).not.toHaveBeenCalled();
    expect(result.source).toContain('Local Precision Engine');
  });

  it('should timeout and return fallback without tripping circuit on single timeout', async () => {
     const tickerTimeout = 'TIMEOUT_TICK';
     vi.mocked(fetch).mockImplementation((_url, options: any) => new Promise((_resolve, reject) => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
     }));

     const result = await predictNextHorizon(dummySequence, tickerTimeout);
     expect(result.source).toContain('Local Precision Engine');
     expect(await getFromCache("ml_failure_count")).toBe(1);
  });
});
