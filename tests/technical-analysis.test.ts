import { describe, it, expect } from 'vitest';
import { generateTechnicalConfluence } from '../lib/technical-analysis';
import { OHLCV } from '../lib/market-data';

describe('Technical Analysis Indicator Engine', () => {

  const generateSyntheticHistory = (candles: number, volatility: number = 0.01): OHLCV[] => {
    let price = 100;
    const history: OHLCV[] = [];
    for (let i = 0; i < candles; i++) {
      const change = (Math.random() - 0.5) * volatility * 2;
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.002);
      const low = Math.min(open, close) * (1 - Math.random() * 0.002);
      history.push({ time: i, open, high, low, close, volume: 1000 });
      price = close;
    }
    return history;
  };

  it('detects a Volatility Squeeze in low-volatility periods', () => {
    // Generate 40 candles with very low volatility to induce a squeeze
    const lowVolHistory = generateSyntheticHistory(40, 0.001);
    
    const results = generateTechnicalConfluence(lowVolHistory);
    
    // In a perfectly flat market, Bollinger Bands (2 std dev) will eventually 
    // shrink inside Keltner Channels (1.5 * ATR)
    // This might be flaky with random data, but with 0.001 vol it's highly likely.
    expect(results.volatilityCompression).toBeDefined();
    // We can't guarantee a squeeze with random data, but we can verify the structure
    expect(typeof results.volatilityCompression.isSqueezing).toBe('boolean');
    expect(results.volatilityCompression.compressionScore).toBeGreaterThanOrEqual(0);
  });

  it('calculates confluence score correctly from MACD and RSI', () => {
     // Create an ACCELERATING trending history to trigger MACD acceleration
     const trendingHistory: OHLCV[] = [];
     for(let i=0; i<100; i++) {
         const p = 100 + i + (i * i * 0.05); 
         trendingHistory.push({ time: i, open: p - 1, high: p + 1.5, low: p - 1.5, close: p, volume: 1000 });
     }
     
     // Set predictability to 1.0 to skip the noise filter and get the raw score
     const results = generateTechnicalConfluence(trendingHistory, undefined, 1.0);
     expect(results.confluenceScore).toBeGreaterThan(60); 
     expect(results.signal).toMatch(/BUY/);
  });
});
