import { predictNextHorizon } from '../lib/inference';
import { getFromCache, setInCache } from '../lib/cache';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as macroAnalysis from '../lib/macro-analysis';
import { MacroIndicator } from '../lib/macro-analysis';

// Helper starting with 'mock' is allowed in vi.mock
function mockIndicator(seriesId: string, name: string, val: number): MacroIndicator {
  return {
    seriesId,
    name,
    currentValue: val,
    previousValue: val,
    change: 0,
    unit: 'pct',
    status: 'STABLE',
    history: []
  };
}

vi.mock('../lib/macro-analysis', () => {
  // Define full literals for the initial mock
  return {
    getMacroSnapshot: vi.fn().mockResolvedValue({
      regime: 'NEUTRAL',
      creditSpread: { seriesId: 'BAMLH0A0HYM2', name: 'Credit Spread', currentValue: 3.5, previousValue: 3.5, change: 0, unit: 'pct', status: 'STABLE', history: [] },
      fedFunds: { seriesId: 'FEDFUNDS', name: 'Fed Funds', currentValue: 5.25, previousValue: 5.25, change: 0, unit: 'pct', status: 'STABLE', history: [] },
      inflation: { seriesId: 'CPIAUCSL', name: 'Inflation', currentValue: 3.0, previousValue: 3.0, change: 0, unit: 'pct', status: 'STABLE', history: [] },
      yieldCurve: { seriesId: 'T10Y2Y', name: 'Yield Curve', currentValue: 0.2, previousValue: 0.2, change: 0, unit: 'pct', status: 'STABLE', history: [] },
      unemployment: { seriesId: 'UNRATE', name: 'Unemployment', currentValue: 3.7, previousValue: 3.7, change: 0, unit: 'pct', status: 'STABLE', history: [] },
      implications: []
    })
  };
});

describe('Inference Engine - Circuit Breaker (lib/inference)', () => {
  const dummySequence = Array(50).fill([100, 101, 99, 100, 1000]);

  beforeEach(async () => {
    // Clear failure count and circuit state
    await setInCache("ml_failure_count", 0, 60000);
    await setInCache("ml_circuit_tripped", false, 60000);
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(macroAnalysis.getMacroSnapshot).mockResolvedValue({
      regime: 'NEUTRAL',
      creditSpread: mockIndicator('BAMLH0A0HYM2', 'Credit Spread', 3.5),
      fedFunds: mockIndicator('FEDFUNDS', 'Fed Funds', 5.25),
      inflation: mockIndicator('CPIAUCSL', 'Inflation', 3.0),
      yieldCurve: mockIndicator('T10Y2Y', 'Yield Curve', 0.2),
      unemployment: mockIndicator('UNRATE', 'Unemployment', 3.7),
      implications: []
    });
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
    expect(result.source).toContain('Surgical Ensemble v4.2');
  });

  it('should timeout and return fallback without tripping circuit on single timeout', async () => {
     const tickerTimeout = 'TIMEOUT_TICK';
     vi.mocked(fetch).mockImplementation((_url, options: any) => new Promise((_resolve, reject) => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
     }));

     const result = await predictNextHorizon(dummySequence, tickerTimeout);
     expect(result.source).toContain('Surgical Ensemble v4.2');
     expect(await getFromCache("ml_failure_count")).toBe(1);
  });
});

describe('Inference Engine - Macro Modulation', () => {
  const dummySequence = Array(50).fill([100, 101, 99, 100, 1000]);

  beforeEach(() => {
    vi.mocked(macroAnalysis.getMacroSnapshot).mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('widens the uncertainty cone under RECESSION and high credit spreads', async () => {
    // 1. Run prediction under NEUTRAL macro regime (low credit spread)
    vi.mocked(macroAnalysis.getMacroSnapshot).mockResolvedValue({
      regime: 'NEUTRAL',
      creditSpread: mockIndicator('BAMLH0A0HYM2', 'Credit Spread', 3.5),
      fedFunds: mockIndicator('FEDFUNDS', 'Fed Funds', 5.25),
      inflation: mockIndicator('CPIAUCSL', 'Inflation', 3.0),
      yieldCurve: mockIndicator('T10Y2Y', 'Yield Curve', 0.2),
      unemployment: mockIndicator('UNRATE', 'Unemployment', 3.7),
      implications: []
    });
    // Set circuit breaker tripped so it uses local precision engine immediately
    await setInCache("ml_circuit_tripped", true, 60000);
    const neutralRes = await predictNextHorizon(dummySequence, 'NEUTRAL_MOCK');

    // 2. Run prediction under RECESSION and high credit spread
    vi.mocked(macroAnalysis.getMacroSnapshot).mockResolvedValue({
      regime: 'RECESSION',
      creditSpread: mockIndicator('BAMLH0A0HYM2', 'Credit Spread', 5.5),
      fedFunds: mockIndicator('FEDFUNDS', 'Fed Funds', 5.25),
      inflation: mockIndicator('CPIAUCSL', 'Inflation', 3.0),
      yieldCurve: mockIndicator('T10Y2Y', 'Yield Curve', -0.2),
      unemployment: mockIndicator('UNRATE', 'Unemployment', 5.0),
      implications: []
    });
    const recessionRes = await predictNextHorizon(dummySequence, 'RECESSION_MOCK');

    // Volatility cone (p90 - p10) should be significantly wider under recession & stress
    const neutralSpread = neutralRes.p90 - neutralRes.p10;
    const recessionSpread = recessionRes.p90 - recessionRes.p10;

    expect(recessionSpread).toBeGreaterThan(neutralSpread);
  });

  it('dampens the drift multiplier under RECESSION compared to GOLDILOCKS', async () => {
    // Create a trended sequence so drift is positive
    const trendSequence = Array(50).fill(0).map((_, i) => [100, 100 + i * 0.02, 100 - i * 0.02, 100 + i * 0.02, 1000]);

    // 1. Run under GOLDILOCKS (drift multiplier 1.35)
    vi.mocked(macroAnalysis.getMacroSnapshot).mockResolvedValue({
      regime: 'GOLDILOCKS',
      creditSpread: mockIndicator('BAMLH0A0HYM2', 'Credit Spread', 3.5),
      fedFunds: mockIndicator('FEDFUNDS', 'Fed Funds', 5.25),
      inflation: mockIndicator('CPIAUCSL', 'Inflation', 2.0),
      yieldCurve: mockIndicator('T10Y2Y', 'Yield Curve', 0.5),
      unemployment: mockIndicator('UNRATE', 'Unemployment', 3.5),
      implications: []
    });
    await setInCache("ml_circuit_tripped", true, 60000);
    const goldilocksRes = await predictNextHorizon(trendSequence, 'GOLDILOCKS_DRIFT');

    // 2. Run under RECESSION (drift multiplier 0.30)
    vi.mocked(macroAnalysis.getMacroSnapshot).mockResolvedValue({
      regime: 'RECESSION',
      creditSpread: mockIndicator('BAMLH0A0HYM2', 'Credit Spread', 3.5),
      fedFunds: mockIndicator('FEDFUNDS', 'Fed Funds', 5.25),
      inflation: mockIndicator('CPIAUCSL', 'Inflation', 3.0),
      yieldCurve: mockIndicator('T10Y2Y', 'Yield Curve', -0.2),
      unemployment: mockIndicator('UNRATE', 'Unemployment', 5.0),
      implications: []
    });
    const recessionRes = await predictNextHorizon(trendSequence, 'RECESSION_DRIFT');

    // Goldilocks (1.35x drift) should produce a higher forecast price (p50) than Recession (0.30x drift) in a strong uptrend
    expect(goldilocksRes.p50).toBeGreaterThan(recessionRes.p50);
  });
});
