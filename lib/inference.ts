import { getFromCache, setInCache, CACHE_TTL } from "./cache";

export interface PredictionResult { p10: number; p50: number; p90: number; source: string; }

/**
 * Institutional Inference Engine (v2.1)
 * Uses stationary log-returns and Z-Score Volatility-Adjusted Features.
 */
export async function predictNextHorizon(
  inputSequence: number[][], 
  ticker: string = "UNKNOWN",
  realizedVol: number = 0.2 // Adaptive scaling
): Promise<PredictionResult> {
  const lastPrice = inputSequence[inputSequence.length - 1][3];
  const cacheKey = `pred_${ticker}_${lastPrice}_v21`;
  const cached = getFromCache<PredictionResult>(cacheKey);
  if (cached) return cached;

  // 1. Transform to Stationary Domain (Log-Returns)
  const stationarySequence = [];
  for (let i = 1; i < inputSequence.length; i++) {
    const prev = inputSequence[i-1][3];
    const curr = inputSequence[i][3];
    if (prev > 0) {
      // Z-Score Normalization: Standardizing returns by current realized volatility (v2.1)
      const ret = Math.log(curr / prev);
      const normalizedRet = realizedVol > 0 ? ret / (realizedVol / Math.sqrt(252)) : ret;
      stationarySequence.push(normalizedRet);
    }
  }

  try {
    const payload = {
      ticker,
      lastPrice,
      volatility: realizedVol,
      returns: stationarySequence.slice(-50), // Z-Score normalized
      history: inputSequence.map(x => ({ 
        open: x[0], high: x[1], low: x[2], close: x[3], volume: x[4] 
      }))
    };

    const res = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json() as { p10: number; p50: number; p90: number };
      const result: PredictionResult = { p10: data.p10, p50: data.p50, p90: data.p90, source: "TFT-v2.1 (Z-Score)" };
      setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
      return result;
    }
  } catch {}

  return generateFallback(inputSequence);
}

/**
 * Stationary Drift Fallback (v2.0)
 * Calculates future outcomes using log-normal drift and realized volatility.
 */
function generateFallback(seq: number[][]): PredictionResult {
  if (seq.length < 20) return { p10: 0, p50: 0, p90: 0, source: "Incomplete Data" };
  
  const last = seq[seq.length - 1][3];
  const returns = [];
  for (let i = 1; i < seq.length; i++) returns.push(Math.log(seq[i][3] / seq[i-1][3]));
  
  // Calculate average log-return (drift) over 20 periods
  const recentReturns = returns.slice(-20);
  const drift = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  
  // Calculate volatility (standard deviation of log-returns)
  const mean = drift;
  const variance = recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (recentReturns.length - 1);
  const vol = Math.sqrt(variance);

  // 5-period forecast using geometric Brownian motion principles
  // p50 = last * exp(drift * 5)
  const p50 = last * Math.exp(drift * 5);
  
  // Confidence intervals based on volatility scaling (sqrt of time)
  const range = vol * Math.sqrt(5) * 1.5; // 1.5 sigma
  
  return { 
    p10: last * Math.exp(drift * 5 - range), 
    p50: p50, 
    p90: last * Math.exp(drift * 5 + range), 
    source: "Log-Normal Drift (PoT Fallback)" 
  };
}
