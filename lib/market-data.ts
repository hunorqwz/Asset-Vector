import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { predictNextHorizon } from "./inference";
// const yahooFinance = new YahooFinance(); // Removed to fix import error
import { KalmanFilter } from "./kalman";
import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { RegimeDetector, MarketRegime } from "./regime";
import { SentimentAnalyzer } from "./sentiment";

// RATE LIMITER: Simple Semaphore-like queue delay
const REQUEST_QUEUE_DELAY = 1500; // Increased to be safer for Yahoo

export type OHLCV = {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSignal = {
  ticker: string;
  price: number;
  smoothPrice: number;
  uncertainty: number;
  snr: number;
  aiPrediction?: number; // Added for UI
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  regime: MarketRegime;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  history: OHLCV[]; 
};

// SIMULATION FALLBACK CONSTANTS
const DRIFT = 0.0002;
const VOLATILITY = 0.015;

// Fetch Headlines (Simulated Mock for now)
const MOCK_HEADLINES = {
    "BTC-USD": ["Bitcoin surges to record high", "Crypto adoption growing"],
    "NVDA": ["AI chip demand remains strong", "NVIDIA earnings beat"],
    "SPY": ["Fed signals rate cuts", "Market rally continues"], 
    "VIX": ["Uncertainty drops", "Fear index at lows"]
};

/**
 * Fetches LIVE market data with Caching & Rate Limiting.
 * Uses Yahoo Finance (Free Tier) with a graceful simulation fallback.
 */
export async function fetchMarketData(ticker: string, historyLength: number = 50): Promise<MarketSignal> {
  // 1. CHECK CACHE FIRST (Zero-Latency Path)
  const cached = getFromCache<MarketSignal>(ticker);
  if (cached) {
    // console.log(`[CACHE HIT] ${ticker}`);
    return cached;
  }

  // 2. FETCH FROM PROVIDER (Throttled Path)
  // Add random jitter to prevent simultaneous requests (Race Condition Fix)
  await new Promise(resolve => setTimeout(resolve, Math.random() * REQUEST_QUEUE_DELAY + 200));

  let history: OHLCV[] = [];
  let currentPrice = 0;

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    // Use timestamp (seconds) for period1 to be safe across all versions
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    const result = await yahooFinance.chart(ticker, {
        period1: startTimestamp,
        interval: '1d'
    }, { validateResult: false }) as any;
    
    if (result && result.quotes && result.quotes.length > 0) {
      history = result.quotes
        .filter((q: any) => q.close !== null && q.open !== null)
        .map((q: any) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume || 0
        }))
        .slice(-historyLength);
      
      currentPrice = history[history.length - 1].close;
    } else {
      throw new Error("No data returned from Yahoo Finance");
    }

  } catch (error) {
    console.warn(`[Asset Vector] Live fetch failed for ${ticker}. Using Simulation.`, error);
    // FALLBACK: Generate Fake OHLCV (GBM)
    currentPrice = ticker === "BTC-USD" ? 98500 : ticker === "NVDA" ? 145 : 100;
    const now = Math.floor(Date.now() / 1000);
    const daySeconds = 86400;

    for (let i = 0; i < historyLength; i++) {
        const shock = (Math.random() - 0.5) * 2;
        const change = currentPrice * (DRIFT + VOLATILITY * shock);
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        const volume = Math.floor(Math.random() * 1000000);
        
        history.push({
            time: now - (historyLength - 1 - i) * daySeconds,
            open, high, low, close, volume
        });
        currentPrice = close;
    }
  }

  // 3. INTELLIGENCE ENGINE (Kalman Filter)
  // R (Measurement Noise) is high for Crypto, lower for Stocks
  const isCrypto = ticker.includes("-USD") || ticker === "BTC";
  const R = isCrypto ? 500 : 2; 
  const Q = isCrypto ? 100 : 0.5; // Process Noise (True Volatility)

  const kf = new KalmanFilter(R, Q);
  
  let lastSmoothPrice = 0;
  let lastUncertainty = 0;

  history.forEach(tick => {
    const res = kf.filter(tick.close);
    lastSmoothPrice = res.prediction;
    lastUncertainty = res.uncertainty;
  });

  // 3. Calculate Signal Metrics
  const snr = kf.getSNR();
  
  // --- INTELLIGENCE FUSION (Kalman + TFT AI) ---
  const aiInput = history.map(t => [t.open, t.high, t.low, t.close, t.volume]);
  const aiResult = await predictNextHorizon(aiInput);
  
  // Tactical Decision Logic (Kalman Slope Analysis)
  // If smooth price is rising -> BULLISH
  const slope = (lastSmoothPrice - history[history.length - 5].close) / 5;
  
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  
  // A. Determine Base Trend (Math)
  if (Math.abs(slope) < (isCrypto ? 50 : 0.5)) trend = "NEUTRAL";
  else if (slope > 0) trend = "BULLISH";
  else trend = "BEARISH";

  // B. AI Override (If High Confidence)
  // If AI predicts a specific P50 horizon that contradicts the slope
  const aiReturn = (aiResult.p50 - currentPrice) / currentPrice;
  if (Math.abs(aiReturn) > 0.015) { // Strong AI Signal (>1.5%)
      if (aiReturn > 0) trend = "BULLISH";
      else trend = "BEARISH";
      // console.log(`[AI OVERRIDE] ${ticker} to ${trend}`);
  }

// Fetch Headlines (Live via Yahoo Search)
  let headlines: string[] = [];
  try {
     const cleanTicker = ticker.split('-')[0]; // Remove -USD for better news matching
     const newsResult = await yahooFinance.search(cleanTicker, { newsCount: 5 }, { validateResult: false }) as { news: { title: string }[] };
     
     if (newsResult.news && newsResult.news.length > 0) {
        // limit to 5 most recent
        headlines = newsResult.news.slice(0, 5).map((n: any) => n.title);
     }
  } catch (e) {
     console.warn(`[Asset Vector] News fetch failed for ${ticker}. Using fallback.`);
  }

  // Fallback if no news found or error
  if (headlines.length === 0) {
     headlines = ["Market conditions neutral", "Trading volume steady"];
  }

  const sentScore = SentimentAnalyzer.analyze(headlines);
  const sentiment = SentimentAnalyzer.getLabel(sentScore);

  const regimeData = RegimeDetector.detect(history.map(h => h.close));

  const signal: MarketSignal = {
    ticker,
    price: parseFloat(currentPrice.toFixed(2)),
    smoothPrice: parseFloat(lastSmoothPrice.toFixed(2)),
    uncertainty: parseFloat(lastUncertainty.toFixed(2)),
    snr: parseFloat(snr.toFixed(4)),
    aiPrediction: parseFloat(aiResult.p50.toFixed(2)),
    trend,
    regime: regimeData.regime,
    sentiment,
    history
  };

  // 5. WRITE TO CACHE
  setInCache(ticker, signal, CACHE_TTL.MARKET_DATA);

  return signal;
}
