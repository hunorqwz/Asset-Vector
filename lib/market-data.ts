import YahooFinance from 'yahoo-finance2';
import { predictNextHorizon, PredictionResult } from "./inference";
import { KalmanFilter } from "./kalman";
import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { RegimeDetector, MarketRegime } from "./regime";
import { SentimentAnalyzer, SentimentReport, SentimentFallback } from "./sentiment";
import { generateTechnicalConfluence, TechnicalIndicators } from "./technical-analysis";

const yahooFinance = new YahooFinance();

export type OHLCV = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '1d';
export type NarrativeArticle = { title: string; url: string; date: string };

export type MarketSignal = {
  ticker: string; price: number; smoothPrice: number; uncertainty: number; snr: number;
  aiPrediction?: number; trend: "BULLISH" | "BEARISH" | "NEUTRAL"; regime: MarketRegime;
  sentiment: SentimentReport; history: OHLCV[]; 
  prediction?: PredictionResult;
  news: NarrativeArticle[];
  technicalAnalysis: TechnicalIndicators;
};

export const RANGE_INTERVAL_MAP: Record<string, { interval: ChartInterval; lookbackSeconds: number }> = {
  '1D': { interval: '1m',  lookbackSeconds: 3 * 86400 },
  '5D': { interval: '5m',  lookbackSeconds: 10 * 86400 },
  '1M': { interval: '15m', lookbackSeconds: 40 * 86400 }, 
  '3M': { interval: '1h',  lookbackSeconds: 100 * 86400 },
  '6M': { interval: '1d',  lookbackSeconds: 180 * 86400 },
  '1Y': { interval: '1d',  lookbackSeconds: 365 * 86400 },
  '5Y': { interval: '1d',  lookbackSeconds: 5 * 365 * 86400 },
  'ALL': { interval: '1d', lookbackSeconds: 0 },
};

export async function fetchHistoryWithInterval(
  ticker: string, 
  interval: ChartInterval = '1d',
  lookbackSeconds: number = 0
): Promise<OHLCV[]> {
  const cacheKey = `chart:${ticker}:${interval}:${lookbackSeconds}`;
  const cached = getFromCache<OHLCV[]>(cacheKey);
  if (cached) return cached;

  const start = lookbackSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) - lookbackSeconds;
  const result = await yahooFinance.chart(ticker, { period1: start, interval, includePrePost: false }, { validateResult: false }) as any;
  
  if (!result?.quotes?.length) throw new Error('DATA_UNAVAILABLE');
  
  const data = result.quotes
    .filter((q: any) => q.close && q.open && q.high && q.low)
    .map((q: any) => ({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open, 
      high: q.high, 
      low: q.low, 
      close: q.close, 
      volume: q.volume || 0
    }))
    .filter((q: any, i: number, arr: any[]) => {
      if (i === 0) return true;
      return !((q.volume === 0 || q.volume == null) && q.close === arr[i-1].close);
    });

  setInCache(cacheKey, data, interval === '1d' ? CACHE_TTL.MARKET_DATA : 30000);
  return data;
}

/**
 * Fetches only the real-time current price for a ticker.
 * Uses Yahoo Finance's quote endpoint — a single lightweight API call.
 * Do NOT use fetchMarketData for this — that is the full analytical pipeline.
 */
export async function fetchLiveQuote(ticker: string): Promise<number> {
  const cacheKey = `quote:${ticker}`;
  const cached = getFromCache<number>(cacheKey);
  if (cached !== null) return cached;

  const quote = await yahooFinance.quote(ticker, {}, { validateResult: false }) as any;
  const price = quote.regularMarketPrice as number;

  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error(`No valid price returned for ${ticker}`);
  }

  setInCache(cacheKey, price, CACHE_TTL.MARKET_DATA);
  return price;
}

async function fetchHistory(ticker: string, len: number): Promise<OHLCV[]> {
  const result = await yahooFinance.chart(ticker, { period1: 0, interval: '1d' }, { validateResult: false }) as any;
  if (!result?.quotes?.length) throw new Error('HISTORY_FETCH_FAILED');
  return result.quotes.filter((q: any) => q.close && q.open).map((q: any) => ({
    time: Math.floor(new Date(q.date).getTime() / 1000),
    open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0
  })).slice(-len);
}

async function fetchHeadlines(ticker: string): Promise<NarrativeArticle[]> {
  const sym = ticker.split('-')[0];
  const res = await yahooFinance.search(sym, { newsCount: 5 }, { validateResult: false }) as any;
  return res.news?.length 
    ? res.news.map((n: any) => ({ title: n.title, url: n.link, date: new Date(n.providerPublishTime).toISOString() })) 
    : [{ title: "Market liquidity stable", url: "#", date: new Date().toISOString() }];
}

export async function fetchMarketData(ticker: string, len: number = 2500): Promise<MarketSignal> {
  const cached = getFromCache<MarketSignal>(ticker);
  if (cached) return cached;
  
  const history = await fetchHistory(ticker, len);
  const currentPrice = history[history.length - 1].close;
  const isCrypto = ticker.includes("-USD") || ticker === "BTC";
  
  const { R, Q } = KalmanFilter.deriveParameters(history.map(h => h.close));
  const kf = new KalmanFilter(R, Q);
  let smooth = 0, uncert = 0;
  history.forEach(t => { const r = kf.filter(t.close); smooth = r.prediction; uncert = r.uncertainty; });

  const [ai, news] = await Promise.all([
    predictNextHorizon(history.map(t => [t.open, t.high, t.low, t.close, t.volume]), ticker),
    fetchHeadlines(ticker)
  ]);

  // Guard against short history (needs at least 6 bars for 5-bar lookback)
  const lookback = Math.min(5, history.length - 1);
  const slope = lookback > 0 ? (smooth - history[history.length - 1 - lookback].close) / lookback : 0;
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = Math.abs(slope) < (isCrypto ? 50 : 0.5) ? "NEUTRAL" : (slope > 0 ? "BULLISH" : "BEARISH");
  
  const aiRet = (ai.p50 - currentPrice) / currentPrice;
  if (Math.abs(aiRet) > 0.015) trend = aiRet > 0 ? "BULLISH" : "BEARISH";

  const signal: MarketSignal = {
    ticker, price: Number(currentPrice.toFixed(2)), smoothPrice: Number(smooth.toFixed(2)),
    uncertainty: Number(uncert.toFixed(2)), snr: Number(kf.getSNR().toFixed(4)),
    aiPrediction: Number(ai.p50.toFixed(2)), trend,
    regime: RegimeDetector.detect(history.map(h => h.close)).regime,
    sentiment: SentimentFallback.analyze(news.map(n => n.title)),
    technicalAnalysis: generateTechnicalConfluence(history),
    news,
    history
  };

  setInCache(ticker, signal, CACHE_TTL.MARKET_DATA);
  return signal;
}
