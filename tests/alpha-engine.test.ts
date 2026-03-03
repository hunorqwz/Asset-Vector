import { describe, it, expect } from 'vitest';
import { calculateAlphaScore } from '@/lib/alpha-engine';
import { MarketSignal } from '@/lib/market-data';
import { StockDetails } from '@/lib/stock-details';

describe('Alpha Engine Scoring Scanners', () => {

  const mockSignal = (rsi14: number, macdHist: number, priceChange5d: number): MarketSignal => ({
    ticker: 'TEST',
    price: 150,
    time: 0,
    history: [
      { close: 145, open: 145, high: 146, low: 144, volume: 1000, time: 0 },
      { close: 150, open: 150, high: 151, low: 149, volume: 1000, time: 1000 }
    ],
    tech: { 
        rsi14, macd: { histogram: macdHist, line: 0, signal: 0 }, 
        confluenceScore: 80, signal: 'BUY', isValid: true, 
        bollingerBands: { upper: 160, middle: 150, lower: 140, percentB: 0.5 },
        orderBlocks: [] 
    },
    sentiment: { score: 0.5, label: 'BULLISH', headlineCount: 1, drivers: [], drift: 'ACCELERATING_BULL' },
    regime: 'TRENDING_UP',
    synthesis: { score: 80, signal: 'STRONG BUY', confidence: 'HIGH' }
  } as unknown as MarketSignal);

  const mockDetails = (forwardPE: number, pegRatio: number, beta: number): StockDetails => ({
    ticker: 'TEST',
    price: { current: 150, change: 0, changePercent: 0, fiftyDayAverage: 140 },
    valuation: { trailingPE: 20, forwardPE, pegRatio, priceToBook: 3 },
    keyStats: { marketCap: 1e12, beta, trailingEps: 5, dividendYield: 0.02 },
    earningsHistory: []
  } as any as StockDetails);

  it('triggers the MOMENTUM scanner for trending assets', () => {
    // RSI 70, MACD Hist 2, Above 50d Average
    const signal = mockSignal(70, 2, 5); 
    const details = mockDetails(20, 1.5, 1.2);

    const result = calculateAlphaScore(signal, details);
    expect(result.scanner).toBe('MOMENTUM');
    expect(result.score).toBeGreaterThan(0);
  });

  it('triggers the VALUE scanner for inexpensive assets with high sentiment', () => {
    // RSI Neutral, Low forward PE (12), Low PEG (0.8), High Sentiment (>0.1 already in mockSignal)
    const signal = mockSignal(50, 0, 0); 
    const details = mockDetails(12, 0.8, 1.2);

    const result = calculateAlphaScore(signal, details);
    expect(result.scanner).toBe('VALUE');
    expect(result.score).toBeGreaterThan(0);
  });

  it('triggers the UNCORRELATED scanner for low-beta movers', () => {
    // RSI Neutral, Low Beta (0.7), Positive 5-day momentum (>3 in mockSignal history would need 5 bars)
    // Actually our mockSignal mock only has 2 bars. Let's provide a signal with a valid 5 bar movement.
    const signal = mockSignal(50, 0, 5);
    // Add 5 bars to match calculateAlphaScore's expectation (history.length >= 5)
    signal.history = new Array(5).fill({ close: 100 }).map((h, i) => i === 4 ? { close: 150 } : { close: 140 }) as any;
    
    const details = mockDetails(30, 2.0, 0.7);

    const result = calculateAlphaScore(signal, details);
    expect(result.scanner).toBe('UNCORRELATED');
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns score 0 and no scanner if no criteria met', () => {
      const signal = mockSignal(30, -2, -5); // Bearish
      const details = mockDetails(50, 5, 2.0); // Expensive, High beta

      const result = calculateAlphaScore(signal, details);
      expect(result.scanner).toBe(null);
      expect(result.score).toBe(0);
  });
});
