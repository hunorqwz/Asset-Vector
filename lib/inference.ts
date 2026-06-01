import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { SentimentReport } from "./sentiment";
import { fetchMarketPulse } from "./market-pulse";
import { getMacroSnapshot } from "./macro-analysis";
import {
  localPrecisionForecast,
  type PredictionHorizon,
  type PredictionResult,
  type MultiHorizonPrediction
} from "./local-forecast";

export type { PredictionHorizon, PredictionResult, MultiHorizonPrediction };
export { localPrecisionForecast };

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
  barsPerDay: number = 1,
  beta: number = 1.0
): Promise<MultiHorizonPrediction> {
  const horizons: PredictionHorizon[] = ["4H", "1D", "3D", "1W", "1M"];
  
  // We compute horizons in parallel to keep low latency (SPLR)
  const results = await Promise.all(
    horizons.map(h => predictNextHorizon(inputSequence, ticker, realizedVol, h, sentiment, barsPerDay, beta))
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
  barsPerDay: number = 1,
  beta: number = 1.0
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

  // ── Tier 1: External ML Server (Circuit Breaker Protected) ────────────────
  const isTripped = (await getFromCache<boolean>("ml_circuit_tripped")) || false;
  
  if (!isTripped) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const res = await fetch(process.env.ML_VECTOR_URL || "http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, horizon, sequence: inputSequence.slice(-60) }),
        signal: controller.signal
      }).catch(err => {
        clearTimeout(timeout);
        throw err;
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        // Reset the breaker on a successful response
        await setInCache("ml_failure_count", 0, 5 * 60 * 1000); 
        
        const result: PredictionResult = {
          p10: Number(data.p10),
          p50: Number(data.p50),
          p90: Number(data.p90),
          source: "Forensic Ensemble Multi-Horizon",
          horizon,
          confidence: data.confidence || 0.85
        };
        await setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
        return result;
      } else {
        throw new Error(`ML Server Error: ${res.status}`);
      }
    } catch (err) {
      // Circuit Breaker Tracker
      const currentFails = (await getFromCache<number>("ml_failure_count")) || 0;
      const newFails = currentFails + 1;
      await setInCache("ml_failure_count", newFails, 5 * 60 * 1000); // TTL 5 mins
      
      if (newFails >= 3) {
        await setInCache("ml_circuit_tripped", true, 5 * 60 * 1000); // TTL 5 min cooldown
      }
    }
  }

  // ── Tier 2: Local Precision Engine Fallback ──────────────────────────────
  
  const pulse = await fetchMarketPulse().catch(() => null);
  const vix = pulse?.macro?.vix?.value;

  const macro = await getMacroSnapshot().catch(() => null);
  const macroRegime = macro?.regime;
  const creditSpread = macro?.creditSpread?.currentValue;
  
  const result = localPrecisionForecast(
    inputSequence,
    realizedVol,
    horizon,
    sentiment,
    barsPerDay,
    vix,
    beta,
    macroRegime,
    creditSpread
  );
  
  // Sanity Guard: P10 < P50 < P90
  if (result.p10 > result.p50) result.p10 = result.p50 * 0.99;
  if (result.p90 < result.p50) result.p90 = result.p50 * 1.01;

  await setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
  return result;
}
