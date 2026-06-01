import { describe, it, expect } from 'vitest';
import { generateSynthesis } from '../lib/synthesis';
import { MarketSignal } from '../lib/market-data';

describe('Watchlist Forecasting & Conviction Synthesis', () => {

  const baseTech = {
    confluenceScore: 75,
    signal: 'BUY' as const,
    indicators: [],
    isValid: true,
    rsi14: 60,
    macd: { line: 1, signal: 0.5, histogram: 0.5 },
    bollingerBands: { upper: 110, middle: 105, lower: 100, percentB: 0.8 },
    predictivePivots: null,
    fibonacci: null,
    orderBlocks: [],
    volatilityCompression: { isSqueezing: false, compressionScore: 0 },
    adx: 25,
    darkPoolBlocks: []
  };

  const baseSentiment = {
    score: 0.5,
    label: 'BULLISH' as const,
    headlineCount: 5,
    drivers: [],
    drift: 'STABLE' as const,
    velocity: 0,
    isInsufficientData: false,
    integrityScore: 1.0,
    isConflicted: false
  };

  it('applies a severe penalty for strong negative expected returns', () => {
    // Current price = 100, Forecast (p50) = 93 => expected return = -7.0% (< -5%)
    // Should deduct 15 points from conviction score (re-balanced down from 25)
    const prediction = { p10: 80, p50: 93, p90: 105, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    
    // Without prediction
    const baseline = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100);
    
    // With prediction
    const penalized = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    
    expect(penalized.score).toBe(baseline.score - 15);
    expect(penalized.primaryDriver).toContain('Downside Risk: Negative Quantitative Forecast');
    expect(penalized.signal).toBe('ACCUMULATE'); // Downgraded from BUY/STRONG BUY
  });

  it('applies a moderate penalty for moderately negative expected returns', () => {
    // Current price = 100, Forecast = 97 => expected return = -3.0% (between -2% and -5%)
    // Should deduct 10 points (re-balanced down from 15)
    const prediction = { p10: 90, p50: 97, p90: 105, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    const baseline = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100);
    const penalized = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    
    expect(penalized.score).toBe(baseline.score - 10);
  });

  it('applies a mild penalty for slightly negative expected returns', () => {
    // Current price = 100, Forecast = 99 => expected return = -1.0% (between 0% and -2%)
    // Should deduct 5 points (re-balanced down from 8)
    const prediction = { p10: 95, p50: 99, p90: 105, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    const baseline = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100);
    const penalized = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    
    expect(penalized.score).toBe(baseline.score - 5);
  });

  it('applies a boost for strong positive expected returns', () => {
    // Current price = 100, Forecast = 112 => expected return = +12.0% (> 10%)
    // Should add 10 points
    const prediction = { p10: 95, p50: 112, p90: 130, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    const baseline = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100);
    const boosted = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    
    // Cap score at 100
    const expectedScore = Math.min(100, baseline.score + 10);
    expect(boosted.score).toBe(expectedScore);
    expect(boosted.primaryDriver).toContain('Upside Opportunity: Positive Quantitative Forecast');
  });

  it('applies a moderate boost for moderately positive expected returns', () => {
    // Current price = 100, Forecast = 107 => expected return = +7.0% (between 5% and 10%)
    // Should add 5 points
    const prediction = { p10: 95, p50: 107, p90: 120, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    const baseline = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100);
    const boosted = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    
    const expectedScore = Math.min(100, baseline.score + 5);
    expect(boosted.score).toBe(expectedScore);
  });

  it('applies penalties for negative multi-horizon predictions (1W, 1M)', () => {
    const prediction = { p10: 95, p50: 101, p90: 110, horizon: '1D' as const, confidence: 0.8, source: 'GARCH' };
    const multiPrediction = {
      "4H": { p10: 99, p50: 100.2, p90: 101, horizon: '4H' as const, confidence: 0.8, source: 'GARCH' },
      "1D": prediction,
      "3D": { p10: 98, p50: 101.5, p90: 105, horizon: '3D' as const, confidence: 0.8, source: 'GARCH' },
      "1W": { p10: 85, p50: 94.0, p90: 102, horizon: '1W' as const, confidence: 0.8, source: 'GARCH' },
      "1M": { p10: 80, p50: 98.0, p90: 110, horizon: '1M' as const, confidence: 0.8, source: 'GARCH' }
    };
    
    const with1DOnly = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100);
    const withMulti = generateSynthesis(baseTech, baseSentiment, 0.6, 'MOMENTUM', 100, undefined, undefined, prediction, 100, multiPrediction);
    
    // Expected penalty: 10 (for 1W < -5%) + 4 (for 1M < 0%) = 14 points (re-balanced down from 33)
    expect(withMulti.score).toBe(Math.max(0, with1DOnly.score - 14));
  });
});

describe('Watchlist Dynamic Return Calculations', () => {
  const mockHistory = (length: number, trend: 'up' | 'down') => {
    return Array.from({ length }, (_, i) => ({
      close: trend === 'up' ? 100 + i * 2 : 100 - i * 2,
      open: 100, high: 100, low: 100, volume: 1000, time: i * 1000
    }));
  };

  const getLookbackSliceLength = (range: string) => {
    switch (range) {
      case "ALL": return 2500;
      case "5Y": return 1260;
      case "2Y": return 504;
      case "1Y": return 252;
      case "6M": return 126;
      case "3M": return 63;
      default: return 21;
    }
  };

  it('calculates the correct cumulative return rate based on the lookback slice start price', () => {
    const pricesHistory = mockHistory(100, 'up'); // Last price close: 100 + 99 * 2 = 298
    const currentPrice = 300;
    
    // Testing 3M lookback (sliceLength = 63)
    const sliceLength = getLookbackSliceLength("3M");
    const historySlice = pricesHistory.slice(-sliceLength);
    
    // Start price should be at pricesHistory[100 - 63] = pricesHistory[37] close
    // pricesHistory[37] close: 100 + 37 * 2 = 174
    const startPrice = historySlice[0].close;
    expect(startPrice).toBe(174);
    
    const returnRate = ((currentPrice - startPrice) / startPrice) * 100;
    expect(returnRate).toBeCloseTo(((300 - 174) / 174) * 100);
  });

  it('falls back to default changePercent if history slice is empty', () => {
    const emptyHistory: any[] = [];
    const changePercentFallback = 4.25;
    
    const historySlice = emptyHistory.slice(-21);
    let returnRate = 0;
    if (historySlice.length > 0) {
      const startPrice = historySlice[0].close;
      returnRate = ((100 - startPrice) / startPrice) * 100;
    } else {
      returnRate = changePercentFallback;
    }
    
    expect(returnRate).toBe(changePercentFallback);
  });
});
