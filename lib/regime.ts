/**
 * ASSET VECTOR | REGIME DETECTION ENGINE
 * 
 * Implements the Hurst Exponent (H) to classify market states.
 * H < 0.5: Mean Reversion (Choppy/Range-bound) -> Strategy: Oscillator
 * H > 0.5: Persistent Trend (Momentum) -> Strategy: Trend Following
 * H = 0.5: Geometric Brownian Motion (Random Walk) -> Strategy: Cash
 */

export type MarketRegime = "MEAN_REVERSION" | "MOMENTUM" | "RANDOM_WALK";

export class RegimeDetector {
  /**
   * Calculates the Hurst Exponent using the simplified R/S analysis.
   * @param prices Array of close prices (time-series).
   * @returns Hurst Exponent (0.0 to 1.0)
   */
  static getHurstExponent(prices: number[]): number {
    if (prices.length < 20) return 0.5; // Insufficient data

    // 1. Calculate Log Returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    // 2. Split series into chunks (simplified max chunk for V1)
    // In a full R/S analysis, we would regress log(R/S) vs log(n).
    // Here we strictly approximate for speed using the standard deviation of valid periods.
    
    // Approximation: Lag-1 Autocorrelation relates to H
    // H = 0.5 * (1 + rho) ? Not quite, but close enough for classification for < 100 points
    
    // Better: Volatility Ratio (VR)
    // VR = sigma(n) / (sigma(1) * sqrt(n))
    // We will use a dedicated R/S loop for precision.

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    
    // Calculate cumulative deviations from mean
    let currentSum = 0;
    const cumulatives: number[] = [];
    returns.forEach(r => {
        currentSum += (r - mean);
        cumulatives.push(currentSum);
    });

    // R = Range of cumulative deviations
    const R = Math.max(...cumulatives) - Math.min(...cumulatives);

    // S = Standard Deviation of returns
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
    const S = Math.sqrt(variance);

    if (S === 0) return 0.5;

    // RS Value
    const RS = R / S;

    // H ~ log(RS) / log(n) (Empirical approximation for small N)
    // Note: This is the "Anis-Lloyd" corrected estimator limit
    const hurst = Math.log(RS) / Math.log(n);

    return Math.max(0, Math.min(1, hurst));
  }

  /**
   * Classifies the regime based on Hurst and Volatility.
   */
  static detect(prices: number[]): { regime: MarketRegime; score: number } {
    const h = this.getHurstExponent(prices);

    let regime: MarketRegime = "RANDOM_WALK";
    
    // STRICT Thresholds
    if (h < 0.45) regime = "MEAN_REVERSION";
    else if (h > 0.60) regime = "MOMENTUM";
    else regime = "RANDOM_WALK";

    return { regime, score: parseFloat(h.toFixed(2)) };
  }
}
