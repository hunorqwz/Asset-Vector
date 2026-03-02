/**
 * Institutional Reliability Engine: Probability of Touch (PoT)
 * Calculated using log-normal distribution for first-passage time probability.
 */

export interface LevelTouchProbability {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  probability: number; // 0-1 (e.g., 0.65 = 65% chance of touch within T)
  timeframe: string; // e.g., "5D"
}

/**
 * Standard Cumulative Distribution Function (CDF) for Normal Distribution
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Calculates the probability that a price will touch a target level 
 * within a given timeframe (number of trading days).
 * 
 * Formula (First Passage Time):
 * P(touch L within T) = 2 * P(S_T > L) for L > S_0
 * P(touch L within T) = 2 * P(S_T < L) for L < S_0
 */
export function calculateProbabilityOfTouch(
  currentPrice: number,
  targetPrice: number,
  annualizedVol: number,
  days: number = 5
): number {
  if (currentPrice <= 0 || targetPrice <= 0 || annualizedVol <= 0) return 0;
  
  // T in years
  const T = days / 252;
  const sigmaRootT = annualizedVol * Math.sqrt(T);
  
  if (sigmaRootT === 0) return 0;

  // Log-price distance
  const distance = Math.abs(Math.log(targetPrice / currentPrice));
  
  // d2 = (ln(S0/L) - 0.5 * sigma^2 * T) / (sigma * sqrt(T))
  // Simplified for touch probability as: P = 2 * (1 - N(distance / sigma*sqrt(T)))
  const d = distance / sigmaRootT;
  
  // The probability of touching level L within T is 2 * (1 - NormalCDF(d))
  const prob = 2 * (1 - normalCDF(d));
  
  return Math.max(0, Math.min(1, prob));
}

/**
 * Maps the probability to a human-readable risk/reward signal.
 */
export function getTouchImpact(prob: number): string {
  if (prob > 0.8) return "HIGH PROBABILITY FLIP";
  if (prob > 0.5) return "STRUCTURAL CHALLENGE";
  if (prob > 0.2) return "TACTICAL RESISTANCE/SUPPORT";
  return "NEGLIGIBLE STRUCTURAL THREAT";
}
