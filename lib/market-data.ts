import YahooFinance from 'yahoo-finance2';
import { predictNextHorizon, PredictionResult } from "./inference";
import { KalmanFilter } from "./kalman";
import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { RegimeDetector, MarketRegime } from "./regime";
import { SentimentAnalyzer, SentimentReport, SentimentFallback } from "./sentiment";
import { generateTechnicalConfluence, TechnicalIndicators } from "./technical-analysis";
import { generateSynthesis, MarketSynthesis } from "./synthesis";

const yahooFinance = new YahooFinance();

import { OHLCV, ChartInterval, NarrativeArticle } from "./types";

export type { OHLCV, ChartInterval, NarrativeArticle };

import { QualityScore, calculateQualityScore } from "./quality-engine";
import { LevelTouchProbability, calculateProbabilityOfTouch } from "./probability";
import { detectSupportResistance } from "./technical-analysis";

export type RollingCorrelation = {
  ticker: string;
  correlation: number; // -1 to 1
  alpha: number; // Excess return vs benchmark (beta-adjusted)
  beta: number; // Sensitivity to market
};

export type MarketSignal = {
  ticker: string; price: number; smoothPrice: number; uncertainty: number; snr: number;
  aiPrediction?: number; trend: "BULLISH" | "BEARISH" | "NEUTRAL"; regime: MarketRegime;
  predictability: number;
  sentiment: SentimentReport; history: OHLCV[]; 
  prediction?: PredictionResult;
  news: NarrativeArticle[];
  tech: TechnicalIndicators;
  synthesis: MarketSynthesis;
  benchmark?: RollingCorrelation;
  quality?: QualityScore;
  structuralProbability?: LevelTouchProbability[];
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

// Global Benchmark Cache to prevent redundant fetches (v2.1)
let GLOBAL_BENCHMARK_DATA: { time: number; data: OHLCV[] } | null = null;

export async function fetchMarketData(ticker: string, len: number = 2500): Promise<MarketSignal> {
  const cached = getFromCache<MarketSignal>(ticker);
  if (cached) return cached;
  
  const history = await fetchHistory(ticker, len);
  const currentPrice = history[history.length - 1].close;
  const isCrypto = ticker.includes("-USD") || ticker === "BTC";
  
  // 1. Calculate Realized Volatility for Adaptive Filtering
  const prices = history.map(h => h.close);
  const returns = [];
  for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i-1]));
  const variance = returns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;
  const realizedVol = Math.sqrt(variance * 252); // Annualized

  // 2. Adaptive Kalman Smoothing (v2.0)
  const { R, Q } = KalmanFilter.deriveParameters(prices);
  const kf = new KalmanFilter(R, Q);
  let smooth = 0, uncert = 0;
  
  history.forEach(t => {
    const dynamicQ = realizedVol > 0.3 ? Q * 2 : Q; 
    kf.updateParameters(undefined, dynamicQ);
    const r = kf.filter(t.close);
    smooth = r.prediction;
    uncert = r.uncertainty;
  });

  // Benchmark Singleton Logic
  if (!GLOBAL_BENCHMARK_DATA || Date.now() - GLOBAL_BENCHMARK_DATA.time > 3600000) {
      const bHistory = await fetchHistory("SPY", 2500).catch(() => []);
      GLOBAL_BENCHMARK_DATA = { time: Date.now(), data: bHistory };
  }

  const [ai, news, fundamentals, tnxQuote] = await Promise.all([
    predictNextHorizon(history.map(t => [t.open, t.high, t.low, t.close, t.volume]), ticker, realizedVol),
    fetchHeadlines(ticker),
    !isCrypto ? yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics'] }).catch(() => null) : Promise.resolve(null),
    yahooFinance.quote("^TNX").catch(() => null) 
  ]);

  const riskFreeRate = (tnxQuote?.regularMarketPrice || 4.0) / 100;

  let benchmark: RollingCorrelation | undefined = undefined;
  if (GLOBAL_BENCHMARK_DATA && ticker !== "SPY") {
      benchmark = calculateCorrelationMetrics(history, GLOBAL_BENCHMARK_DATA.data, "SPY", riskFreeRate);
  }

  let quality: QualityScore | undefined = undefined;
  if (fundamentals) {
    const f = fundamentals as any;
    quality = calculateQualityScore({
        profitability: {
            operatingMargins: f.financialData?.operatingMargins,
            profitMargins: f.financialData?.profitMargins,
            returnOnAssets: f.financialData?.returnOnAssets,
            returnOnEquity: f.financialData?.returnOnEquity,
            revenueGrowth: f.financialData?.revenueGrowth,
            earningsGrowth: f.financialData?.earningsGrowth,
            grossMargins: f.financialData?.grossMargins
        } as any,
        financialHealth: {
            debtToEquity: f.financialData?.debtToEquity,
            currentRatio: f.financialData?.currentRatio,
            freeCashflow: f.financialData?.freeCashflow,
            totalRevenue: f.financialData?.totalRevenue
        } as any,
        valuation: {
            forwardPE: f.summaryDetail?.forwardPE,
            pegRatio: f.defaultKeyStatistics?.pegRatio
        } as any
    });
  }

  // Guard against short history (needs at least 6 bars for 5-bar lookback)
  const lookback = Math.min(5, history.length - 1);
  const slope = lookback > 0 ? (smooth - history[history.length - 1 - lookback].close) / lookback : 0;
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = Math.abs(slope) < (isCrypto ? 50 : 0.5) ? "NEUTRAL" : (slope > 0 ? "BULLISH" : "BEARISH");
  
  const aiRet = (ai.p50 - currentPrice) / currentPrice;
  if (Math.abs(aiRet) > 0.015) trend = aiRet > 0 ? "BULLISH" : "BEARISH";

  const regimeInfo = RegimeDetector.detect(history.map(h => h.close));

  const sentiment = SentimentFallback.analyze(news);
  const technical = generateTechnicalConfluence(history, smooth, regimeInfo.predictability);
  const levels = detectSupportResistance(history);
  const structuralProbability: LevelTouchProbability[] = levels.map(l => ({
    price: l.price,
    type: l.type,
    timeframe: "5D",
    probability: Number(calculateProbabilityOfTouch(currentPrice, l.price, realizedVol, 5).toFixed(4))
  }));

  const synthesis = generateSynthesis(
    technical,
    sentiment,
    regimeInfo.predictability,
    regimeInfo.regime,
    kf.getSNR(),
    benchmark,
    quality
  );

  const signal: MarketSignal = {
    ticker, price: Number(currentPrice.toFixed(2)), smoothPrice: Number(smooth.toFixed(2)),
    uncertainty: Number(uncert.toFixed(2)), snr: Number(kf.getSNR().toFixed(4)),
    aiPrediction: Number(ai.p50.toFixed(2)), trend,
    regime: regimeInfo.regime,
    predictability: regimeInfo.predictability,
    sentiment,
    tech: technical,
    synthesis,
    news,
    history,
    benchmark,
    quality,
    structuralProbability
  };

  setInCache(ticker, signal, CACHE_TTL.MARKET_DATA);
  return signal;
}

/**
 * Calculates rolling correlation, beta, and Jensen's Alpha (v2.1).
 */
function calculateCorrelationMetrics(
    assetData: OHLCV[], 
    benchmarkData: OHLCV[], 
    benchmarkTicker: string,
    riskFreeRate: number = 0.04
): RollingCorrelation {
    // 1. Sync data by time
    const benchMap = new Map(benchmarkData.map(d => [d.time, d.close]));
    const syncResults: { asset: number; bench: number }[] = [];
    
    for (let i = 1; i < assetData.length; i++) {
        const t = assetData[i].time;
        const prevT = assetData[i-1].time;
        if (benchMap.has(t) && benchMap.has(prevT)) {
            const assetRet = Math.log(assetData[i].close / assetData[i-1].close);
            const benchRet = Math.log(benchMap.get(t)! / benchMap.get(prevT)!);
            syncResults.push({ asset: assetRet, bench: benchRet });
        }
    }

    const window = syncResults.slice(-60);
    if (window.length < 10) return { ticker: benchmarkTicker, correlation: 0, alpha: 0, beta: 1 };

    const assetRets = window.map(w => w.asset);
    const benchRets = window.map(w => w.bench);

    const assetMean = assetRets.reduce((a, b) => a + b, 0) / assetRets.length;
    const benchMean = benchRets.reduce((a, b) => a + b, 0) / benchRets.length;

    let covar = 0;
    let varBench = 0;
    let varAsset = 0;

    for (let i = 0; i < window.length; i++) {
        const aDiff = assetRets[i] - assetMean;
        const bDiff = benchRets[i] - benchMean;
        covar += aDiff * bDiff;
        varBench += bDiff * bDiff;
        varAsset += aDiff * aDiff;
    }

    const beta = varBench !== 0 ? covar / varBench : 1;
    const correlation = (varBench !== 0 && varAsset !== 0) ? covar / Math.sqrt(varBench * varAsset) : 0;
    
    // Jensen's Alpha Calculation (v2.1)
    // alpha = R_p - [R_f + Beta * (R_m - R_f)]
    const assetCumRet = assetData[assetData.length - 1].close / assetData[assetData.length - Math.min(assetData.length, 252)].close - 1;
    const benchCumRet = benchmarkData[benchmarkData.length - 1].close / benchmarkData[benchmarkData.length - Math.min(benchmarkData.length, 252)].close - 1;
    
    const jensensAlpha = assetCumRet - (riskFreeRate + beta * (benchCumRet - riskFreeRate));

    return {
        ticker: benchmarkTicker,
        correlation: Number(correlation.toFixed(4)),
        beta: Number(beta.toFixed(4)),
        alpha: Number((jensensAlpha * 100).toFixed(2)) // Percentage
    };
}
