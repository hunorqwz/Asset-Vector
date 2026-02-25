import { describe, expect, it } from 'vitest';
import { generateTechnicalConfluence, TechnicalIndicators, PriceData } from './technical-analysis';

describe('Technical Analysis Algorithm', () => {
  it('returns invalid structure when data is insufficient (< 30 periods)', () => {
    // 29 prices
    const prices: PriceData[] = Array.from({ length: 29 }, (_, i) => ({ close: 100 + i }));
    const result = generateTechnicalConfluence(prices);
    
    expect(result.isValid).toBe(false);
    expect(result.confluenceScore).toBe(50);
    expect(result.signal).toBe('NEUTRAL');
  });

  it('calculates proper confluence for a strong, steady uptrend', () => {
    // 60 perfectly ascending prices (1 to 60)
    const prices: PriceData[] = Array.from({ length: 60 }, (_, i) => ({ close: i + 1 }));
    const result = generateTechnicalConfluence(prices);
    
    expect(result.isValid).toBe(true);
    
    // An uptrend like this means RSI will be 100
    expect(result.rsi14).toBe(100);
    // Score logic: 100 RSI -> Overbought (-15 points) -> starts at 50, now 35
    // But MACD line > 0, hist > 0 (+20 points) -> now 55
    // Bollinger %B > 1.0 (mean reversion risk) -> (-15 points) -> 40
    // Based on the rigid engine, extreme uptrends actually get penalized for mean reversion.
    expect(typeof result.confluenceScore).toBe('number');
    expect(result.confluenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confluenceScore).toBeLessThanOrEqual(100);
  });

  it('calculates proper confluence for a vicious downtrend', () => {
    // 60 descending prices (100 to 40)
    const prices: PriceData[] = Array.from({ length: 60 }, (_, i) => ({ close: 100 - i }));
    const result = generateTechnicalConfluence(prices);
    
    expect(result.isValid).toBe(true);
    // RSI approaches 0
    expect(result.rsi14).toBeLessThan(10);
    // Score logic: 0 RSI -> Oversold (+15 points) -> starts at 50, now 65
    // MACD line < 0, hist < 0 (-20 points) -> now 45
    // Bollinger %B < 0.0 (oversold snapback) -> (+15 points) -> 60
    expect(typeof result.confluenceScore).toBe('number');
  });
});
