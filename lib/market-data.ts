import YahooFinance from 'yahoo-finance2';
import { predictNextHorizon, PredictionResult } from "./inference";
import { KalmanFilter } from "./kalman";
import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { RegimeDetector, MarketRegime } from "./regime";
import { SentimentAnalyzer } from "./sentiment";

const yahooFinance = new YahooFinance();
const REQUEST_QUEUE_DELAY = 1200;
const DRIFT = 0.0002;
const VOLATILITY = 0.015;

export type OHLCV = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '1d';

export type MarketSignal = {
  ticker: string; price: number; smoothPrice: number; uncertainty: number; snr: number;
  aiPrediction?: number; trend: "BULLISH" | "BEARISH" | "NEUTRAL"; regime: MarketRegime;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL"; history: OHLCV[]; 
  prediction?: PredictionResult;
};

interface YahooChartResult { quotes: { date: string; open: number; high: number; low: number; close: number; volume: number }[] }
interface YahooSearchResult { news: { title: string }[] }

/**
 * Industry-standard time range → interval mapping.
 * Mirrors what TradingView, Bloomberg, and Yahoo Finance use.
 * 
 * | Range | Interval | Yahoo Limit         |
 * |-------|----------|---------------------|
 * | 1D    | 5m       | max 60 days         |
 * | 5D    | 15m      | max 60 days         |
 * | 1M    | 1h       | max 730 days        |
 * | 3M    | 1d       | unlimited           |
 * | 6M    | 1d       | unlimited           |
 * | 1Y    | 1d       | unlimited           |
 * | 5Y    | 1d       | unlimited           |
 * | ALL   | 1d       | unlimited (from IPO)|
 * 
 * lookbackSeconds = 0 is a sentinel meaning "fetch from the very beginning"
 */
export const RANGE_INTERVAL_MAP: Record<string, { interval: ChartInterval; lookbackSeconds: number }> = {
  '1D': { interval: '5m',  lookbackSeconds: 1 * 86400 },
  '5D': { interval: '15m', lookbackSeconds: 5 * 86400 },
  '1M': { interval: '1h',  lookbackSeconds: 30 * 86400 },
  '3M': { interval: '1d',  lookbackSeconds: 90 * 86400 },
  '6M': { interval: '1d',  lookbackSeconds: 180 * 86400 },
  '1Y': { interval: '1d',  lookbackSeconds: 365 * 86400 },
  '5Y': { interval: '1d',  lookbackSeconds: 5 * 365 * 86400 },
  'ALL': { interval: '1d', lookbackSeconds: 0 },
};

/**
 * Fetch OHLCV data with a specific interval. 
 * lookbackSeconds = 0 means "fetch all available history from IPO".
 */
export async function fetchHistoryWithInterval(
  ticker: string, 
  interval: ChartInterval = '1d',
  lookbackSeconds: number = 0
): Promise<OHLCV[]> {
  const cacheKey = `chart:${ticker}:${interval}:${lookbackSeconds}`;
  const cached = getFromCache<OHLCV[]>(cacheKey);
  if (cached) return cached;

  try {
    // 0 = fetch from the very beginning (stock IPO), otherwise use lookback
    const start = lookbackSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) - lookbackSeconds;
    const result = await yahooFinance.chart(
      ticker, 
      { period1: start, interval }, 
      { validateResult: false }
    ) as unknown as YahooChartResult;
    
    if (!result?.quotes?.length) throw new Error('No data returned');
    
    const data = result.quotes
      .filter(q => q.close && q.open && q.high && q.low)
      .map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open, 
        high: q.high, 
        low: q.low, 
        close: q.close, 
        volume: q.volume || 0
      }));

    // Cache intraday data for shorter periods, daily for longer
    const ttl = interval === '1d' ? CACHE_TTL.MARKET_DATA : 30 * 1000; // 30s for intraday
    setInCache(cacheKey, data, ttl);
    
    return data;
  } catch { 
    return generateFallbackHistory(ticker, 200, interval); 
  }
}

async function fetchHistory(ticker: string, len: number): Promise<OHLCV[]> {
  try {
    // period1: 0 = fetch from the very beginning (stock IPO date)
    const result = await yahooFinance.chart(ticker, { period1: 0, interval: '1d' }, { validateResult: false }) as unknown as YahooChartResult;
    if (!result?.quotes?.length) throw new Error();
    return result.quotes.filter(q => q.close && q.open).map(q => ({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0
    })).slice(-len);
  } catch { return generateFallbackHistory(ticker, len); }
}

function generateFallbackHistory(ticker: string, len: number, interval: ChartInterval = '1d'): OHLCV[] {
  let price = ticker.includes("BTC") ? 98000 : 150;
  const history: OHLCV[] = [];
  const now = Math.floor(Date.now() / 1000);
  
  // Map interval to seconds between candles
  const intervalSeconds: Record<ChartInterval, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '1d': 86400,
  };
  const step = intervalSeconds[interval];
  
  // Reduce volatility for shorter intervals
  const vol = interval === '1d' ? VOLATILITY : VOLATILITY * 0.3;
  
  for (let i = 0; i < len; i++) {
    const change = price * (DRIFT + vol * (Math.random() - 0.5) * 2);
    const c = price + change;
    history.push({ 
      time: now - (len - 1 - i) * step, 
      open: price, 
      high: Math.max(price, c) * 1.005, 
      low: Math.min(price, c) * 0.995, 
      close: c, 
      volume: Math.random() * 1e6 
    });
    price = c;
  }
  return history;
}

async function fetchHeadlines(ticker: string): Promise<string[]> {
  try {
    const sym = ticker.split('-')[0];
    const res = await yahooFinance.search(sym, { newsCount: 5 }, { validateResult: false }) as unknown as YahooSearchResult;
    return res.news?.length ? res.news.map(n => n.title) : ["Market stable", "Volume steady"];
  } catch { return ["Market stable", "Volume steady"]; }
}

export async function fetchMarketData(ticker: string, len: number = 2500): Promise<MarketSignal> {
  const cached = getFromCache<MarketSignal>(ticker);
  if (cached) return cached;

  await new Promise(r => setTimeout(r, Math.random() * REQUEST_QUEUE_DELAY));
  
  const history = await fetchHistory(ticker, len);
  const currentPrice = history[history.length - 1].close;

  const isCrypto = ticker.includes("-USD") || ticker === "BTC";
  const kf = new KalmanFilter(isCrypto ? 500 : 2, isCrypto ? 100 : 0.5);
  let smooth = 0, uncert = 0;
  history.forEach(t => { const r = kf.filter(t.close); smooth = r.prediction; uncert = r.uncertainty; });

  const [ai, news] = await Promise.all([
    predictNextHorizon(history.map(t => [t.open, t.high, t.low, t.close, t.volume]), ticker),
    fetchHeadlines(ticker)
  ]);

  const slope = (smooth - history[history.length - 5].close) / 5;
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = Math.abs(slope) < (isCrypto ? 50 : 0.5) ? "NEUTRAL" : (slope > 0 ? "BULLISH" : "BEARISH");
  
  const aiRet = (ai.p50 - currentPrice) / currentPrice;
  if (Math.abs(aiRet) > 0.015) trend = aiRet > 0 ? "BULLISH" : "BEARISH";

  const signal: MarketSignal = {
    ticker, price: Number(currentPrice.toFixed(2)), smoothPrice: Number(smooth.toFixed(2)),
    uncertainty: Number(uncert.toFixed(2)), snr: Number(kf.getSNR().toFixed(4)),
    aiPrediction: Number(ai.p50.toFixed(2)), trend,
    regime: RegimeDetector.detect(history.map(h => h.close)).regime,
    sentiment: SentimentAnalyzer.getLabel(SentimentAnalyzer.analyze(news)),
    history
  };

  setInCache(ticker, signal, CACHE_TTL.MARKET_DATA);
  return signal;
}
