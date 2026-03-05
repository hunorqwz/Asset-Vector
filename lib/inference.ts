import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { calculateReturns, calculateVariance, runARIMAForecast, calculateGARCHVolatility } from "./math";
import { KalmanFilter } from "./kalman";
import { RegimeDetector } from "./regime";
import { SentimentReport } from "./sentiment";
import { detectVolumeProfileNodes } from "./technical-analysis";
import { OHLCV } from "./market-data";

export type PredictionHorizon = "4H" | "1D" | "3D" | "1W" | "1M";

export interface PredictionResult {
  p10: number;
  p50: number;
  p90: number;
  source: string;
  horizon: PredictionHorizon;
  confidence: number; 
  tilt?: number; 
}

export type MultiHorizonPrediction = Record<PredictionHorizon, PredictionResult>;

const HORIZON_MAP: Record<PredictionHorizon, number> = {
  "4H": 0.16,  
  "1D": 1,
  "3D": 3,
  "1W": 5,     
  "1M": 21     
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL PRECISION ENGINE (Tier 1 Offline)
// ─────────────────────────────────────────────────────────────────────────────
export function localPrecisionForecast(
  seq: number[][],
  realizedVol: number,
  horizon: PredictionHorizon = "1D",
  sentiment?: SentimentReport,
  barsPerDay: number = 1
): PredictionResult {
  const prices = seq.map((x) => x[3]);
  const last = prices[prices.length - 1];
  const targetBars = HORIZON_MAP[horizon];

  if (prices.length < 30 || last <= 0) {
    return { p10: 0, p50: 0, p90: 0, source: "Incomplete Data", horizon, confidence: 0 };
  }

  // 1. GARCH-Lite Volatility (Clustering Awareness)
  const returns = calculateReturns(prices);
  // Scale GARCH result (per-bar vol) to daily equivalent vol
  const garchVolDaily = calculateGARCHVolatility(returns) * Math.sqrt(barsPerDay);
  const effectiveVol = Math.max(garchVolDaily, realizedVol / Math.sqrt(252));

  const targetTotalBars = targetBars * barsPerDay;

  // ── Estimator 1: ARIMA(1,1,0) ──────────────────────────────────────────
  const arimaBars = Math.max(1, Math.round(targetTotalBars)); 
  const arima = runARIMAForecast(prices, arimaBars);
  const arimaP50 = arima.forecast.length > 0 ? arima.forecast[arima.forecast.length - 1] : null;

  // ── Estimator 2: Adaptive Kalman Trend Projection ──────────────────────
  const kalmanWindow = prices.slice(-60);
  const { R, Q } = KalmanFilter.deriveParameters(kalmanWindow);
  const kf = new KalmanFilter(R, Q);
  let currSmooth = 0, prevSmooth = 0;
  for (const p of kalmanWindow) {
    prevSmooth = currSmooth;
    currSmooth = kf.filter(p).prediction;
  }
  const kalmanVelocity = currSmooth - prevSmooth; 
  const kalmanP50 = last + kalmanVelocity * targetTotalBars;
  
  // ── Estimator 3: Regime-Gated GBM ──────────────────────────────────────
  // drift is per bar. Total drift = drift * (targetBars * barsPerDay)
  const drift = returns.slice(-20).reduce((a, b) => a + b, 0) / (20);
  const hurst = RegimeDetector.getHurst(prices);
  const driftAmplifier = hurst > 0.55 ? 1.25 : hurst < 0.45 ? 0.5 : 1.0;
  const effectiveDrift = drift * driftAmplifier;

  // Bayesian Sentiment Tilt (v4.0)
  let tilt = 0;
  if (sentiment && !sentiment.isInsufficientData) {
      // Sentiment score is [-1, 1], so 0 is neutral.
      const sentDelta = sentiment.score; // -1.0 (Bearish) to 1.0 (Bullish)
      // Sentiment velocity affects DAILY trend. Scale by 1/barsPerDay to get per-bar tilt.
      // Maximum boost is ~0.5% daily for strong sentiment + velocity.
      tilt = (sentDelta * (Math.abs(sentiment.velocity) + 0.5) * 0.005) / barsPerDay;
  }

  const finalDrift = effectiveDrift + tilt;

  // Structural Magnet Tilt (v4.1)
  // Price tends to gravitate towards high-liquidity zones (HVNs) in non-trending regimes
  const volumeProfile = detectVolumeProfileNodes(seq.map(x => ({ 
      time: 0, open: x[0], high: x[1], low: x[2], close: x[3], volume: x[4] 
  })), 30);
  const poc = volumeProfile.length > 0 ? volumeProfile[0].price : last;
  const gapToPoc = (poc - last) / last;
  
  // Magnet power: Stronger in mean-reversion regimes (Hurst < 0.45)
  // v4.2 Enhancement: Increase pull for high-liquidity stabilization
  const magnetStrength = hurst < 0.45 ? 0.35 : hurst > 0.55 ? 0.05 : 0.15;
  const structuralTilt = (gapToPoc * magnetStrength) / barsPerDay;

  // Final drift aggregation with a safety cap for institutional stability
  let totalDrift = finalDrift + structuralTilt;
  const driftCap = 0.01; // Max 1% move per bar (prevents extrapolation madness)
  totalDrift = Math.max(-driftCap, Math.min(driftCap, totalDrift));
  
  const gbmP50 = last * Math.exp(totalDrift * targetTotalBars);

  // ── Weighted Ensemble ────────────────────────────────────────────────────
  let kWeight = 0, aWeight = 0, gWeight = 0;
  if (targetBars < 1) { // 4H
    kWeight = 0.7; gWeight = 0.3; aWeight = 0;
  } else if (targetBars <= 3) { // 1D, 3D
    kWeight = 0.3; aWeight = 0.4; gWeight = 0.3;
  } else { // 1W, 1M
    kWeight = 0.1; aWeight = 0.4; gWeight = 0.5;
  }

  function weighted(a: number | null, k: number, g: number): number {
    const activeAWeight = a !== null ? aWeight : 0;
    const totalWeight = activeAWeight + kWeight + gWeight;
    return (( (a ?? k) * activeAWeight) + (k * kWeight) + (g * gWeight)) / totalWeight;
  }

  const p50 = weighted(arimaP50, kalmanP50, gbmP50);
  
  // ── High-Precision Uncertainty Cone ──────────────────────────────────────
  // Use GARCH daily vol scaled by horizon sqrt(T)
  const ci90Width = p50 * effectiveVol * Math.sqrt(targetBars) * 1.645;
  const p10 = p50 - ci90Width;
  const p90 = p50 + ci90Width;

  const kfSNR = kf.getSNR();
  const predictability = Math.abs(hurst - 0.5) * 2;
  const confidence = Number(((kfSNR * 0.4) + (predictability * 0.6)).toFixed(4));

  return {
    p10: Number(Math.max(0, p10).toFixed(4)),
    p50: Number(Math.max(0, p50).toFixed(4)),
    p90: Number(Math.max(0, p90).toFixed(4)),
    source: `Surgical Ensemble v4.0 (GARCH+Tilt)`,
    horizon,
    confidence,
    tilt: Number((tilt * 100).toFixed(4))
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Institutional Prediction Engine (v4.0)
 * Generates predictions across multiple time horizons for a comprehensive risk view.
 */
export async function predictMultiHorizon(
  inputSequence: number[][],
  ticker: string = "UNKNOWN",
  realizedVol: number = 0.2,
  sentiment?: SentimentReport,
  barsPerDay: number = 1
): Promise<MultiHorizonPrediction> {
  const horizons: PredictionHorizon[] = ["4H", "1D", "3D", "1W", "1M"];
  
  // We compute horizons in parallel to keep low latency (SPLR)
  const results = await Promise.all(
    horizons.map(h => predictNextHorizon(inputSequence, ticker, realizedVol, h, sentiment, barsPerDay))
  );

  return {
    "4H": results[0],
    "1D": results[1],
    "3D": results[2],
    "1W": results[3],
    "1M": results[4]
  };
}

/**
 * Standard Single-Horizon Prediction
 * Legacy entry point updated to support variable target horizons.
 */
export async function predictNextHorizon(
  inputSequence: number[][],
  ticker: string = "UNKNOWN",
  realizedVol: number = 0.2,
  horizon: PredictionHorizon = "1D",
  sentiment?: SentimentReport,
  barsPerDay: number = 1
): Promise<PredictionResult> {
  const lastPrice = inputSequence[inputSequence.length - 1][3];
  if (lastPrice <= 0) {
     return { p10: 0, p50: 0, p90: 0, source: "Invalid Price", horizon, confidence: 0 };
  }

  // Cache strictly by Ticker + Price + Horizon + Resolution + Version
  const quantizedPrice = Math.round(lastPrice * 100) / 100;
  const version = "v4.0"; 
  const cacheKey = `pred_${ticker}_${horizon}_b${barsPerDay}_${quantizedPrice}_${version}`;

  const cached = await getFromCache<PredictionResult>(cacheKey);
  if (cached) return cached;

  // Tiered Inference Logic
  // (In v4.0 we prioritize Local Precision Engine for all the specific horizons 
  // until the ML Server is updated to support multi-horizon requests).
  
  const result = localPrecisionForecast(inputSequence, realizedVol, horizon, sentiment, barsPerDay);
  
  // Sanity Guard: P10 < P50 < P90
  if (result.p10 > result.p50) result.p10 = result.p50 * 0.99;
  if (result.p90 < result.p50) result.p90 = result.p50 * 1.01;

  await setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
  return result;
}
