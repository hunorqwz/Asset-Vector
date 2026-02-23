import { getFromCache, setInCache, CACHE_TTL } from "./cache";

export interface PredictionResult { p10: number; p50: number; p90: number; source: string; }

export async function predictNextHorizon(inputSequence: number[][], ticker: string = "UNKNOWN"): Promise<PredictionResult> {
  const cacheKey = `pred_${ticker}_${inputSequence[inputSequence.length - 1][3]}`;
  const cached = getFromCache<PredictionResult>(cacheKey);
  if (cached) return cached;

  try {
    const payload = {
      ticker,
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
      const result: PredictionResult = { p10: data.p10, p50: data.p50, p90: data.p90, source: "TFT-v1" };
      setInCache(cacheKey, result, CACHE_TTL.PREDICTION);
      return result;
    }
  } catch {}

  return generateFallback(inputSequence);
}

function generateFallback(seq: number[][]): PredictionResult {
  const last = seq[seq.length - 1][3] || 100;
  return { p10: last * 0.95, p50: last * 1.00, p90: last * 1.05, source: "Heuristic" };
}
