import { getFromCache, setInCache, CACHE_TTL } from "./cache";
import { calculateReturns, calculateVariance, runARIMAForecast } from "./math";
import { KalmanFilter } from "./kalman";
import { RegimeDetector } from "./regime";

export interface PredictionResult {
  p10: number;
  p50: number;
  p90: number;
  source: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiered fallback configuration
// ─────────────────────────────────────────────────────────────────────────────
const FORECAST_HORIZON = 5; // bars ahead
const CIRCUIT_BREAKER_FAILURES = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 300_000; // 5 minutes
const ML_REQUEST_TIMEOUT_MS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL PRECISION ENGINE (Tier 1 Offline)
//
// Combines three independent estimators and weights them by reliability:
//   1. ARIMA(1,1,0) on log-returns   — captures autocorrelated drift
//   2. Kalman-projected mean          — signal-noise-separated trajectory
//   3. Regime-gated volatility cone   — GBM with Hurst-adjusted distribution
//
// Final p10/p50/p90 are the weighted median of all three to remain robust
// even when one estimator degrades (insufficient data, flat market, etc.).
// ─────────────────────────────────────────────────────────────────────────────
function localPrecisionForecast(
  seq: number[][],
  realizedVol: number
): PredictionResult {
  const prices = seq.map((x) => x[3]);
  const last = prices[prices.length - 1];

  if (prices.length < 30 || last <= 0) {
    return { p10: 0, p50: 0, p90: 0, source: "Incomplete Data" };
  }

  // ── Estimator 1: ARIMA(1,1,0) ──────────────────────────────────────────
  const arima = runARIMAForecast(prices, FORECAST_HORIZON);
  const arimaP50 = arima.forecast.length > 0
    ? arima.forecast[arima.forecast.length - 1]
    : null;
  const arimaP90 = arima.confidence95.upper.length > 0
    ? arima.confidence95.upper[arima.confidence95.upper.length - 1]
    : null;
  const arimaP10 = arima.confidence95.lower.length > 0
    ? arima.confidence95.lower[arima.confidence95.lower.length - 1]
    : null;

  // ── Estimator 2: Adaptive Kalman Trend Projection ──────────────────────
  // Run the filter over the last 60 bars and extrapolate the final velocity
  const kalmanWindow = prices.slice(-60);
  const { R, Q } = KalmanFilter.deriveParameters(kalmanWindow);
  const kf = new KalmanFilter(R, Q);
  let prev = 0;
  let curr = 0;
  for (const p of kalmanWindow) {
    prev = curr;
    curr = kf.filter(p).prediction;
  }
  const kalmanVelocity = curr - prev; // per-bar linear velocity
  const kalmanP50 = last + kalmanVelocity * FORECAST_HORIZON;
  // Cone width = annualized vol * sqrt(days) * 1.645 (90% CI)
  const kalmanConeHalf = realizedVol > 0
    ? last * (realizedVol / Math.sqrt(252)) * Math.sqrt(FORECAST_HORIZON) * 1.645
    : Math.abs(kalmanVelocity) * FORECAST_HORIZON * 1.5;
  const kalmanP10 = kalmanP50 - kalmanConeHalf;
  const kalmanP90 = kalmanP50 + kalmanConeHalf;

  // ── Estimator 3: Regime-Gated GBM ──────────────────────────────────────
  // Detects the Hurst exponent; adjusts drift and volatility amplifier
  // based on whether the market is in momentum or mean-reversion mode.
  const returns = calculateReturns(prices);
  const recentReturns = returns.slice(-20);
  const drift = recentReturns.reduce((a, b) => a + b, 0) / (recentReturns.length || 1);
  const variance = calculateVariance(recentReturns);
  const vol = Math.sqrt(variance);

  const hurst = RegimeDetector.getHurst(prices);
  // In a trending market (H > 0.55), drift is more persistent → amplify
  // In mean-reversion (H < 0.45), drift decays quickly → dampen
  const driftAmplifier = hurst > 0.55 ? 1.2 : hurst < 0.45 ? 0.6 : 1.0;
  const effectiveDrift = drift * driftAmplifier;

  const gbmK = 1.96; // 95% CI
  const range = vol * Math.sqrt(FORECAST_HORIZON) * gbmK;
  const gbmP50 = last * Math.exp(effectiveDrift * FORECAST_HORIZON);
  const gbmP10 = gbmP50 * Math.exp(-range);
  const gbmP90 = gbmP50 * Math.exp(range);

  // ── Weighted Ensemble ────────────────────────────────────────────────────
  // Weights: ARIMA (downweighted if too few bars) / Kalman / GBM
  // SNR from Kalman gives us confidence in the Kalman estimate
  const kfSNR = kf.getSNR();
  const kalmanWeight = Math.min(0.45, 0.2 + kfSNR * 0.1);
  const arimaWeight = arima.forecast.length >= FORECAST_HORIZON ? 0.40 : 0.15;
  const gbmWeight = Math.max(1 - kalmanWeight - arimaWeight, 0.15);

  function weighted(a: number | null, k: number, g: number): number {
    const aW = a !== null ? arimaWeight : 0;
    const scale = aW + kalmanWeight + gbmWeight;
    const aVal = a ?? k; // fallback ARIMA → Kalman
    return ((aVal * aW) + (k * kalmanWeight) + (g * gbmWeight)) / scale;
  }

  const p50 = weighted(arimaP50, kalmanP50, gbmP50);
  const p10 = weighted(arimaP10, kalmanP10, gbmP10);
  const p90 = weighted(arimaP90, kalmanP90, gbmP90);

  // Sanity guard: p10 < p50 < p90 and all values positive
  const safeP10 = Math.min(p10, p50 * 0.999);
  const safeP90 = Math.max(p90, p50 * 1.001);

  return {
    p10: Number(Math.max(0, safeP10).toFixed(4)),
    p50: Number(Math.max(0, p50).toFixed(4)),
    p90: Number(Math.max(0, safeP90).toFixed(4)),
    source: `Local Precision Engine (ARIMA+Kalman+GBM, H=${hurst.toFixed(2)})`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE GBM DRIFT FALLBACK (Tier 2 Offline — emergency only)
// Kept intentionally lean. Used only if localPrecisionForecast returns zeros.
// ─────────────────────────────────────────────────────────────────────────────
function simpleGBMFallback(seq: number[][]): PredictionResult {
  if (seq.length < 20) return { p10: 0, p50: 0, p90: 0, source: "Incomplete Data" };

  const last = seq[seq.length - 1][3];
  const returns = calculateReturns(seq.map((x) => x[3]));
  const recent = returns.slice(-20);
  const drift = recent.reduce((a, b) => a + b, 0) / recent.length;
  const vol = Math.sqrt(calculateVariance(recent));
  const range = vol * Math.sqrt(FORECAST_HORIZON) * 1.5;
  const p50 = last * Math.exp(drift * FORECAST_HORIZON);

  return {
    p10: last * Math.exp(drift * FORECAST_HORIZON - range),
    p50,
    p90: last * Math.exp(drift * FORECAST_HORIZON + range),
    source: "Log-Normal Drift (Emergency Fallback)"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Institutional Inference Engine (v3.0 — Resilient Tiered Architecture)
 *
 * Tier 0: TFT-v2.1 ML Server (remote, highest accuracy when available)
 * Tier 1: Local Precision Engine (ARIMA + Kalman + Regime-Gated GBM ensemble)
 * Tier 2: Simple Log-Normal GBM Drift (emergency last resort)
 *
 * The circuit breaker ensures the ML server is not hammered during outages.
 * On every successful ML response the failure counter is fully reset.
 */
export async function predictNextHorizon(
  inputSequence: number[][],
  ticker: string = "UNKNOWN",
  realizedVol: number = 0.2
): Promise<PredictionResult> {
  const lastPrice = inputSequence[inputSequence.length - 1][3];

  // Quantize to 0.1% increments for cache efficiency
  const step = Math.max(lastPrice * 0.001, 0.01);
  const quantizedPrice = Math.round(lastPrice / step) * step;
  const version = process.env.VERCEL_GIT_COMMIT_SHA || 'v31';
  const cacheKey = `pred_${ticker}_${quantizedPrice.toFixed(3)}_${version}`;

  const cached = await getFromCache<PredictionResult>(cacheKey);
  if (cached) return cached;

  // Pre-compute stationary features (Z-Score normalized log-returns)
  const stationarySequence: number[] = [];
  for (let i = 1; i < inputSequence.length; i++) {
    const prev = inputSequence[i - 1][3];
    const curr = inputSequence[i][3];
    if (prev > 0) {
      const ret = Math.log(curr / prev);
      const normalizedRet = realizedVol > 0 ? ret / (realizedVol / Math.sqrt(252)) : ret;
      stationarySequence.push(normalizedRet);
    }
  }

  // ── Tier 0: Remote TFT Server ───────────────────────────────────────────
  const isCircuitTripped = await getFromCache<boolean>("ml_circuit_tripped") === true;
  if (!isCircuitTripped) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

      const INFERENCE_URL = process.env.ML_INFERENCE_URL || "http://127.0.0.1:5000/predict";
      const res = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          lastPrice,
          volatility: realizedVol,
          returns: stationarySequence.slice(-50),
          history: inputSequence.map((x) => ({
            open: x[0], high: x[1], low: x[2], close: x[3], volume: x[4]
          }))
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        // Success → reset failure counter and return
        await setInCache("ml_failure_count", 0, 3_600_000);
        const data = await res.json() as { p10: number; p50: number; p90: number };
        const result: PredictionResult = {
          p10: data.p10,
          p50: data.p50,
          p90: data.p90,
          source: "TFT-v2.1 (Z-Score)"
        };
        await setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
        return result;
      }

      throw new Error(`SERVER_ERROR_${res.status}`);

    } catch (error: any) {
      const failures = (await getFromCache<number>("ml_failure_count") || 0) + 1;
      await setInCache("ml_failure_count", failures, 3_600_000);

      if (failures >= CIRCUIT_BREAKER_FAILURES) {
        console.warn(
          `[Circuit Breaker] Tripping after ${failures} failures. ` +
          `Offline engine active for ${CIRCUIT_BREAKER_COOLDOWN_MS / 60000} min.`
        );
        await setInCache("ml_circuit_tripped", true, CIRCUIT_BREAKER_COOLDOWN_MS);
      }

      const reason = error?.name === "AbortError" ? "timeout" : `HTTP error (${error?.message})`;
      console.warn(`[Inference] ML Server unavailable (${reason}). Failure ${failures}/${CIRCUIT_BREAKER_FAILURES}. Falling back to local engine.`);
    }
  } else {
    console.info(`[Inference] Circuit breaker active for ${ticker}. Serving local precision engine.`);
  }

  // ── Tier 1: Local Precision Engine ─────────────────────────────────────
  const localResult = localPrecisionForecast(inputSequence, realizedVol);

  if (localResult.p50 > 0) {
    // Cache local results with 15-min TTL (shorter than remote, re-check sooner)
    await setInCache(cacheKey, localResult, 15 * 60 * 1000);
    return localResult;
  }

  // ── Tier 2: Simple GBM Drift (absolute last resort) ────────────────────
  const emergency = simpleGBMFallback(inputSequence);
  return emergency;
}
