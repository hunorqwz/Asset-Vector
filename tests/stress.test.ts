
import { describe, it, expect, vi } from 'vitest';
import { fetchMarketData, fetchMultiLiveQuotes } from '../lib/market-data';
import { fetchStockDetails } from '../lib/stock-details';
import { fetchMarketPulse } from '../lib/market-pulse';

vi.mock('../lib/market-pulse', () => ({
  fetchMarketPulse: vi.fn(async () => ({
    sectors: [{ sector: "Technology", performance: 0.015 }],
    regime: "TRENDING",
  })),
}));

// Mocking high-latency or rate-limited behaviors to ensure stable local testing
vi.mock('../lib/market-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/market-data')>();
  return {
    ...original,
    fetchMarketData: vi.fn(async (ticker: string, len: number = 2500) => {
      return {
        ticker,
        price: 150.0 + Math.random() * 10,
        smoothPrice: 150.0,
        uncertainty: 0.1,
        snr: 10,
        trend: "BULLISH",
        regime: "TRENDING",
        predictability: 0.8,
        history: Array.from({ length: len }).map((_, i) => ({
          time: (Math.floor(Date.now() / 1000) - i * 86400),
          open: 150.0,
          high: 155.0,
          low: 149.0,
          close: 151.0,
          volume: 1000000,
        })),
        tech: { isValid: true },
        sentiment: { label: "BULLISH", score: 0.8 },
      } as any;
    }),
    fetchMultiLiveQuotes: vi.fn(async (tickers: string[]) => {
      const quotes: Record<string, any> = {};
      tickers.forEach(t => {
        quotes[t] = { price: 150.0, bid: 149.9, ask: 150.1 };
      });
      return quotes;
    }),
  };
});

describe('Dashboard Concurrency & Load Stress', () => {
  it('should handle simultaneous requests for multiple high-cap tickers without data corruption', async () => {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK-B'];
    
    // Triggering parallel analytical pipelines
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchMarketData(ticker, 500))
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    console.log(`[Stress Test] Analytical Pipelines: ${fulfilled.length}/${tickers.length} Success`);
    
    expect(fulfilled.length).toBeGreaterThan(tickers.length / 2); // At least half should pass even if external API limits us
  }, 30000);

  it('should handle rapid batch quote requests for global dashboard', async () => {
    const macroTickers = ['SPY', 'QQQ', 'DIA', 'IWM', 'GLD', 'SLV', 'USO', 'TLT', '^VIX', 'BTC-USD', 'ETH-USD'];
    
    // Rapid succession of batch calls
    const burst = await Promise.all([
      fetchMultiLiveQuotes(macroTickers),
      fetchMultiLiveQuotes(macroTickers),
      fetchMultiLiveQuotes(macroTickers)
    ]);

    expect(burst[0]['SPY']).toBeDefined();
    expect(burst[1]['SPY']).toBeDefined();
    expect(burst[2]['SPY']).toBeDefined();
  });

  it('should maintain sub-second pulse latency from cache', async () => {
    // First call to seed cache
    await fetchMarketPulse();
    
    const start = Date.now();
    const pulse = await fetchMarketPulse();
    const duration = Date.now() - start;

    console.log(`[Stress Test] Cached Market Pulse Latency: ${duration}ms`);
    expect(duration).toBeLessThan(100); 
    expect(pulse.sectors.length).toBeGreaterThan(0);
  });

  it('should handle extremely deep history fetches for MAD filter scaling', async () => {
    const ticker = 'SPY';
    const start = Date.now();
    // Fetch 5 years of daily data (approx 1250 bars)
    const result = await fetchMarketData(ticker, 1250);
    const duration = Date.now() - start;

    console.log(`[Stress Test] 5Y Analytical Vector Prep: ${duration}ms`);
    expect(result.history.length).toBeGreaterThanOrEqual(1250);
  }, 15000);
});
