import YahooFinance from 'yahoo-finance2';
import { predictNextHorizon, predictMultiHorizon, PredictionResult, MultiHorizonPrediction } from "./inference";
import { KalmanFilter } from "./kalman";
import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { RegimeDetector, MarketRegime } from "./regime";
import { SentimentAnalyzer, SentimentReport, SentimentFallback } from "./sentiment";
import { generateTechnicalConfluence, TechnicalIndicators } from "./technical-analysis";
import { generateSynthesis, MarketSynthesis } from "./synthesis";
import { 
  calculateReturns, 
  calculateVariance, 
  calculateBeta, 
  calculateCorrelation, 
  calculateJensensAlpha,
  validateAndCleanData
} from "./math";
import { getAlpacaQuote } from "./alpaca-client";
import { db } from "@/db";
import { marketSignals, latestSignals } from "@/db/schema";
import { desc, eq, and, gt } from "drizzle-orm";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

import { OHLCV, ChartInterval, NarrativeArticle } from "./types";

export type { OHLCV, ChartInterval, NarrativeArticle };

import { QualityScore, calculateQualityScore } from "./quality-engine";
import { LevelTouchProbability, calculateProbabilityOfTouch } from "./probability";
import { detectSupportResistance, detectOrderBlocks, detectDarkPoolBlocks } from "./technical-analysis";

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
  multiHorizonPrediction?: MultiHorizonPrediction;
  news: NarrativeArticle[];
  tech: TechnicalIndicators;
  synthesis: MarketSynthesis;
  benchmark?: RollingCorrelation;
  quality?: QualityScore;
  sector?: string;
  structuralProbability?: LevelTouchProbability[];
  orderBlocks?: { price: number; type: 'BULLISH' | 'BEARISH'; strength: number }[];
  darkPoolBlocks?: { price: number; volume: number }[];
};

export const RANGE_INTERVAL_MAP: Record<string, { interval: ChartInterval; lookbackSeconds: number }> = {
  // 1D fetches 3 days of 1m data to safely handle timezone overlaps and weekend gaps for intraday view
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
  const cached = await getFromCache<OHLCV[]>(cacheKey);
  if (cached) return cached;

  const start = lookbackSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) - lookbackSeconds;
  
  try {
    const result = await Promise.race([
      yahooFinance.chart(ticker, { period1: start, interval, includePrePost: false }, { validateResult: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000)) // 8s timeout for long history
    ]).catch(err => {
      console.warn(`[Market Data] Chart fetch failed or timed out for ${ticker}:`, err.message);
      return { quotes: [] };
    }) as any;
    
    if (!result?.quotes?.length) {
      // Ticker Correction: Try appending -USD for crypto if not present
      if (!ticker.includes('-') && ticker.length <= 5) {
        const altTicker = `${ticker}-USD`;
        const altResult = await Promise.race([
          yahooFinance.chart(altTicker, { period1: start, interval, includePrePost: false }, { validateResult: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
        ]).catch(() => null) as any;
        if (altResult?.quotes?.length) return fetchHistoryWithInterval(altTicker, interval, lookbackSeconds);
      }
      return [];
    }
    
    let data = result.quotes
      .filter((q: any) => q.close != null && q.open != null && q.high != null && q.low != null)
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

    // Integrated Outlier Detection (MAD Filter)
    if (data.length >= 20) {
      const cleanPrices = validateAndCleanData(data.map((d: OHLCV) => d.close));
      data = data.map((d: OHLCV, i: number) => ({ ...d, close: cleanPrices[i] }));
    }

    if (data.length > 0) {
      await setInCache(cacheKey, data, interval === '1d' ? CACHE_TTL.CHART_DAILY : CACHE_TTL.CHART_INTRADAY);
    }
    return data;
  } catch (error) {
    console.warn(`[Market Data] Fetch failed for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetches only the real-time current price for a ticker.
 * Uses Yahoo Finance's quote endpoint — a single lightweight API call.
 * Returns null if fetch fails to prevent zero-price pollution.
 */
export async function fetchLiveQuote(ticker: string): Promise<number | null> {
  const cacheKey = `quote:${ticker}`;
  const cached = await getFromCache<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    // 1. Fetch primary from Yahoo
    const quote = await Promise.race([
      yahooFinance.quote(ticker, {}, { validateResult: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
    ]).catch(err => {
      console.warn(`[Market Data] Global Quote fetch failed or timed out for ${ticker}:`, err.message);
      return null;
    }) as any;
    
    let price: number | null = quote?.regularMarketPrice as number;

    // 2. Cross-Check Verification: Verify against Alpaca SIP Feed for Equities (Priority Path)
    const isEquity = !ticker.includes("-") && !ticker.includes("^");
    if (isEquity) {
      const alpacaQuote = await getAlpacaQuote(ticker).catch(() => null);
      if (alpacaQuote?.ap) {
        const alpacaPrice = Number(alpacaQuote.ap);
        // If Yahoo price differs from Alpaca by more than 1%, trust Alpaca (Primary Exchange Data)
        if (price !== null && price > 0 && Math.abs(price - alpacaPrice) / price > 0.01) {
          console.warn(`[Data Integrity] Divergence detected for ${ticker}. Yahoo: ${price}, Alpaca: ${alpacaPrice}. Standardizing to Alpaca.`);
          price = alpacaPrice;
        } else if (price === null || price === 0) {
          price = alpacaPrice;
        }
      }
    }

    if (price === null || typeof price !== 'number' || isNaN(price)) {
      return null; // Return null instead of 0 to prevent risk model corruption
    }

    await setInCache(cacheKey, price, CACHE_TTL.LIVE_QUOTE);
    return price;
  } catch (error) {
    console.warn(`[Market Data] Global Quote fetch failed for ${ticker}:`, error);
    return null;
  }
}

/**
 * Institutional Batch Quote Engine (v3.0)
 * Validates multiple tickers with SIP cross-checks and robust error handling.
 */
export async function fetchMultiLiveQuotes(tickers: string[]): Promise<Record<string, { price: number; changePercent: number } | null>> {
  if (tickers.length === 0) return {};
  
  const results: Record<string, { price: number; changePercent: number } | null> = {};
  
  try {
    // 1. Bulk Fetch from Yahoo (Primary) with a 10s timeout safety
    const quotesRaw = await Promise.race([
      yahooFinance.quote(tickers, {}, { validateResult: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
    ]).catch(err => {
      console.warn(`[Market Data] Yahoo batch quote fetch failed for ${tickers.length} symbols:`, err.message);
      return [];
    });

    const quotes = Array.isArray(quotesRaw) ? quotesRaw : (quotesRaw ? [quotesRaw] : []);
    
    // Map results to tickers
    for (const q of quotes) {
      if (q && q.symbol) {
        // Ensure we match regardless of case if Yahoo fluctuates
        const symbol = q.symbol.toUpperCase();
        results[symbol] = {
          price: q.regularMarketPrice || q.postMarketPrice || q.preMarketPrice || 0,
          changePercent: q.regularMarketChangePercent || 0
        };
      }
    }

    // 2. SIP Cross-Validation for high-confidence equities
    const crossCheckLimit = tickers.filter(t => !t.includes("-") && !t.includes("^")).slice(0, 3);
    
    await Promise.all(crossCheckLimit.map(async (ticker) => {
      try {
        const alpaca = await getAlpacaQuote(ticker);
        if (alpaca?.ap) {
          const alpacaPrice = Number(alpaca.ap);
          const current = results[ticker];
          
          if (current && (current.price === 0 || Math.abs(current.price - alpacaPrice) / alpacaPrice > 0.01)) {
             results[ticker] = { 
               price: alpacaPrice, 
               changePercent: current?.changePercent || 0 
             };
          }
        }
      } catch { /* Silent fail for backup provider */ }
    }));

    // Consistency Check: Ensure every requested ticker exists in results, even if null
    tickers.forEach(t => {
      if (!results[t]) results[t] = null;
      else if (results[t]?.price === 0) results[t] = null; // Treat 0 as No Data for risk safety
    });

    return results;
  } catch (error) {
    console.error("[Market Data] Critical failure in batch quote engine:", error);
    const fallback: Record<string, null> = {};
    tickers.forEach(t => fallback[t] = null);
    return fallback;
  }
}

async function fetchHeadlines(ticker: string): Promise<NarrativeArticle[]> {
  try {
    // Robust parsing: Strip -USD, .T, .SI suffixes but keep the primary symbol
    const cleanSym = ticker.replace(/-USD$|\.[A-Z]+$/i, '').split('-')[0];
    const res = await yahooFinance.search(cleanSym, { newsCount: 5 }, { validateResult: false }) as any;
    
    if (!res.news?.length) {
       return [];
    }

    return res.news.map((n: any) => ({ 
      title: n.title, 
      url: n.link, 
      date: new Date(n.providerPublishTime).toISOString() 
    }));
  } catch (error) {
    console.warn(`[News Engine] Search failed for ${ticker}:`, error);
    return [];
  }
}

// Legacy global benchmark cache removed as it violates serverless constraints.
// We now rely purely on the l1Cache/systemKv architecture inside fetchHistoryWithInterval.

export async function fetchMarketData(ticker: string, len: number = 2500): Promise<MarketSignal> {
  const cacheKey = `signal:${ticker}:${len}`;
  const cached = await getFromCache<MarketSignal>(cacheKey);
  if (cached) return cached;
  
  // Optimize: Calculate approximate lookback to avoid fetching full history (Performance Fix)
  const lookbackSeconds = len === 0 ? 0 : Math.ceil(len * 1.6 * 86400); 
  const history = await fetchHistoryWithInterval(ticker, '1d', lookbackSeconds).then(h => h.slice(-len));
  
  // Guard: Handle empty history to prevent runtime crashes (Safety Fix)
  if (!history || history.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Market Data] Generating Synthetic Data for: ${ticker}`);
    } else {
      console.warn(`[Market Data] Data unavailable for: ${ticker}. Returning partial.`);
    }
    // Return a "Zero-State" signal instead of throwing
    return {
      ticker, price: 0, smoothPrice: 0, uncertainty: 0, snr: 0, trend: "NEUTRAL",
      regime: "RANDOM_WALK", predictability: 0, 
      sentiment: { label: "NEUTRAL", score: 0.5, velocity: 0, drift: "STABLE", drivers: [], headlineCount: 0 },
      history: [], news: [], 
      tech: { 
        isValid: false, confluenceScore: 50, signal: 'NEUTRAL', rsi14: 50, 
        macd: { line: 0, signal: 0, histogram: 0 }, 
        bollingerBands: { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
        predictivePivots: null, fibonacci: null, orderBlocks: [],
        volatilityCompression: { isSqueezing: false, compressionScore: 0 }, adx: 20
      },
      synthesis: { 
        score: 50, signal: "NEUTRAL", confidence: "Low/Noise",
        primaryDriver: "Insufficient data for analysis.", 
        sentimentPriceDivergence: "NONE" 
      }
    } as MarketSignal;
  }
  
  const currentPrice = history[history.length - 1].close;
  const isCrypto = ticker.includes("-USD") || ticker === "BTC";
  
  // 1. Calculate Realized Volatility using centralized Math logic
  const prices = history.map(h => h.close);
  const returns = calculateReturns(prices);
  const variance = calculateVariance(returns);
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

  // Benchmark Fetch (relies on fetchHistoryWithInterval's own multi-tier cache)
  const spyHistory = await fetchHistoryWithInterval("SPY", "1d", 0).catch(() => []);

  // 3. Multi-Resolution Data Acquisition (v4.0)
  // Fetch higher resolution buffers for short-term precision (4H/1D)
  const [news, fundamentals, tnxQuote, history1h, history15m] = await Promise.all([
    fetchHeadlines(ticker),
    !isCrypto ? yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'assetProfile'] }).catch(() => null) : Promise.resolve(null),
    yahooFinance.quote("^TNX").catch(() => null),
    fetchHistoryWithInterval(ticker, '1h', 14 * 86400).catch(() => []), // 2 weeks of 1h
    fetchHistoryWithInterval(ticker, '15m', 5 * 86400).catch(() => [])   // 5 days of 15m
  ]);

  // Fast Fail: Wrap Gemini sentiment call in a 3.5s timeout circuit breaker
  const sentiment = await Promise.race([
    SentimentAnalyzer.analyzeAsync(ticker, news),
    new Promise<SentimentReport>((_, reject) => 
      setTimeout(() => reject(new Error('SENTIMENT_TIMEOUT')), 3500)
    )
  ]).catch(err => {
    console.warn(`[Sentiment Circuit Breaker] Failed or timed out for ${ticker}:`, err.message);
    return SentimentFallback.analyze(news); 
  });

  // 4. Surgical Wealth v4.0 Ensemble Predictions
  // We use the most appropriate resolution for each horizon if available
  const hInput = history.map(t => [t.open, t.high, t.low, t.close, t.volume]);
  const h1hInput = history1h.length > 50 ? history1h.map(t => [t.open, t.high, t.low, t.close, t.volume]) : hInput;
  const h15mInput = history15m.length > 50 ? history15m.map(t => [t.open, t.high, t.low, t.close, t.volume]) : h1hInput;

  const bars15m = isCrypto ? 96 : 26;
  const bars1h = isCrypto ? 24 : 6.5;

  const [ai, multiAi] = await Promise.all([
    predictNextHorizon(hInput, ticker, realizedVol, '1D', sentiment, 1),
    predictMultiHorizon(hInput, ticker, realizedVol, sentiment, 1)
  ]);
  
  // Refine specifically the 4H and 1D slices of multiAi with higher resolution if possible
  if (multiAi["4H"] && h15mInput !== hInput) {
      multiAi["4H"] = await predictNextHorizon(h15mInput, ticker, realizedVol, '4H', sentiment, bars15m);
  }
  if (multiAi["1D"] && h1hInput !== hInput) {
      multiAi["1D"] = await predictNextHorizon(h1hInput, ticker, realizedVol, '1D', sentiment, bars1h);
  }

  const riskFreeRate = (tnxQuote?.regularMarketPrice || 4.0) / 100;

  let benchmark: RollingCorrelation | undefined = undefined;
  if (spyHistory.length > 0 && ticker !== "SPY") {
      benchmark = calculateCorrelationMetrics(history, spyHistory, "SPY", riskFreeRate);
  }

  let quality: QualityScore | undefined = undefined;
  let sector: string | undefined = undefined;
  if (fundamentals) {
    const f = fundamentals as any;
    sector = f.assetProfile?.sector;
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
  
  // High-Precision Trend Detection: Use percentage moves instead of fixed dollar amounts
  // Threshold: 0.5% move over the lookback window
  const pctChange = currentPrice > 0 ? (slope * lookback) / currentPrice : 0;
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = Math.abs(pctChange) < 0.005 ? "NEUTRAL" : (slope > 0 ? "BULLISH" : "BEARISH");
  
  const aiRet = (ai.p50 - currentPrice) / currentPrice;
  if (Math.abs(aiRet) > 0.015) trend = aiRet > 0 ? "BULLISH" : "BEARISH";

  const regimeInfo = RegimeDetector.detect(history.map(h => h.close));

  const technical = generateTechnicalConfluence(history, smooth, regimeInfo.predictability);
  const levels = detectSupportResistance(history);
  const orderBlocks = detectOrderBlocks(history);
  const darkPoolBlocks = detectDarkPoolBlocks(history);
  
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

  // 4. Sentiment-Price Divergence Logic (v2.5)
  // Calculate price velocity over the last 5 days strictly
  const velocityLookback = Math.min(5, history.length - 1);
  const priceVelocity = velocityLookback > 0 ? (currentPrice - history[history.length - 1 - velocityLookback].close) / history[history.length - 1 - velocityLookback].close : 0;
  const sentimentVelocity = sentiment.velocity;

  if (priceVelocity < -0.02 && sentimentVelocity > 0.3) {
    synthesis.sentimentPriceDivergence = "BULLISH_DIVERGENCE";
  } else if (priceVelocity > 0.02 && sentimentVelocity < -0.3) {
    synthesis.sentimentPriceDivergence = "BEARISH_DIVERGENCE";
  } else {
    synthesis.sentimentPriceDivergence = "NONE";
  }

  const signal: MarketSignal = {
    ticker, price: Number(currentPrice.toFixed(2)), smoothPrice: Number(smooth.toFixed(2)),
    uncertainty: Number(uncert.toFixed(2)), snr: Number(kf.getSNR().toFixed(4)),
    aiPrediction: Number(ai.p50.toFixed(2)), trend,
    prediction: ai, 
    multiHorizonPrediction: multiAi,
    regime: regimeInfo.regime,
    predictability: regimeInfo.predictability,
    sentiment,
    tech: technical,
    synthesis,
    news,
    history, // Removed aggressive truncation to retain full multi-year history
    benchmark,
    quality,
    sector,
    structuralProbability,
    orderBlocks,
    darkPoolBlocks
  };

  // 5. Persist to DB for SPLR Architecture (v3.0)
  try {
    // Strip the massive 2500-bar history array before storing in Neon JSONB to prevent DB bloat.
    // The history will be dynamically reconstructed from the L1/L2 chart cache on read.
    const { history: _discardedHistory, ...signalWithoutHistory } = signal;

    // Immediate Upsert for Fast Read Cache
    await db.insert(latestSignals).values({
      ticker,
      generatedAt: new Date(),
      fullData: signalWithoutHistory as any
    }).onConflictDoUpdate({
      target: latestSignals.ticker,
      set: {
        generatedAt: new Date(),
        fullData: signalWithoutHistory as any
      }
    });

    // Rate-limited Archival (Max 1 per 4 hours)
    const archiveCacheKey = `archive_lock_${ticker}`;
    if (!await getFromCache(archiveCacheKey)) {
      await setInCache(archiveCacheKey, true, 4 * 60 * 60 * 1000); // Temporary quick lock

      // SERVERLESS HAZARD FIX: We MUST await archival checks because floating promises 
      // are killed in serverless environments before they complete.
      const existing = await db.query.marketSignals.findFirst({
        where: and(
          eq(marketSignals.ticker, ticker),
          gt(marketSignals.generatedAt, new Date(Date.now() - 4 * 60 * 60 * 1000))
        ),
      });

      if (!existing) {
        await db.insert(marketSignals).values({
          ticker,
          priceAtGeneration: currentPrice.toString(),
          score: synthesis.score.toString(),
          signalLabel: synthesis.signal,
          direction: trend,
          confidence: regimeInfo.predictability.toString(),
          snr: kf.getSNR().toString(),
          regime: regimeInfo.regime,
          isEvaluated: false
        }).catch((err: any) => console.error(`[SPLR Archive] Error for ${ticker}:`, err));
      }
    }

  } catch (err) {
    console.error(`[SPLR] Failed to persist signal caching for ${ticker}:`, err);
  }

  await setInCache(cacheKey, signal, CACHE_TTL.MARKET_SIGNAL);
  return signal;
}

/**
 * SPLR ARCHITECTURE: Get Persistent Signal
 * Checks DB cache first. Returns stale data if within revalidation window.
 */
export async function getPersistentSignal(ticker: string, len: number = 2500): Promise<MarketSignal> {
  const REFRESH_WINDOW_MS = 5 * 60 * 1000; // 5 Minutes
  
  try {
    // 1. Check for a very recent signal in the highly-available latest_signals table
    const latest = await db.query.latestSignals.findFirst({
      where: eq(latestSignals.ticker, ticker)
    });

    if (latest && latest.fullData) {
      const age = Date.now() - new Date(latest.generatedAt!).getTime();
      const signal = latest.fullData as unknown as MarketSignal;

      // If history was stripped for DB hygiene, seamlessly re-attach it using the chart cache
      if (!signal.history || signal.history.length === 0) {
        const lookbackSeconds = len === 0 ? 0 : Math.ceil(len * 1.6 * 86400); 
        signal.history = await fetchHistoryWithInterval(ticker, '1d', lookbackSeconds).then(h => h.slice(-len));
      }

      // If extremely fresh (< 1 min), just return
      if (age < 60000) return signal;

      // If within refresh window (1-5 mins), return signal BUT trigger async refresh
      if (age < REFRESH_WINDOW_MS) {
        // We trigger the refresh but don't await it to keep the response fast (SPLR)
        fetchMarketData(ticker, len).catch(e => console.error(`[SPLR Background Refresh] ${ticker} failed:`, e));
        return signal;
      }
    }
  } catch (error) {
    console.error(`[SPLR Read] Error fetching ${ticker} from persistence:`, error);
  }

  // 2. Cache miss or too old: Perform full synchronous fetch
  return fetchMarketData(ticker, len);
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

    const beta = calculateBeta(assetRets, benchRets);
    const correlation = calculateCorrelation(assetRets, benchRets);
    const jensensAlpha = calculateJensensAlpha(assetData, benchmarkData, beta, riskFreeRate);

    return {
        ticker: benchmarkTicker,
        correlation: Number(correlation.toFixed(4)),
        beta: Number(beta.toFixed(4)),
        alpha: Number((jensensAlpha * 100).toFixed(2)) // Percentage
    };
}
