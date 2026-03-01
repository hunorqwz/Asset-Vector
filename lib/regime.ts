export type MarketRegime = "MEAN_REVERSION" | "MOMENTUM" | "RANDOM_WALK";

export class RegimeDetector {
  /**
   * Calculates the Hurst Exponent using Rescaled Range (R/S) Analysis.
   * Institutional implementation: Iterates through multiple sub-window sizes (lags)
   * to find the rate of diffusion.
   * 
   * H = 0.5: Random Walk (Geometric Brownian Motion)
   * H > 0.5: Trending / Persistent (The trend is your friend)
   * H < 0.5: Mean Reverting / Anti-persistent (The rubber band)
   */
  static getHurst(prices: number[]): number {
    const p = prices.slice(-256); // 2^8 for binary window division
    if (p.length < 100) return 0.5;
    
    const rets: number[] = [];
    for (let i = 1; i < p.length; i++) {
        if (p[i-1] > 0) rets.push(Math.log(p[i] / p[i - 1]));
    }

    const lags = [8, 16, 32, 64, 128];
    const rsValues: { lag: number; rs: number }[] = [];

    for (const lag of lags) {
      if (rets.length < lag) continue;
      
      const numWindows = Math.floor(rets.length / lag);
      let totalRS = 0;

      for (let i = 0; i < numWindows; i++) {
        const window = rets.slice(i * lag, (i + 1) * lag);
        const mean = window.reduce((a, b) => a + b, 0) / lag;
        
        // Calculate Cumulative Deviations
        let cumDev = 0;
        let maxDev = -Infinity;
        let minDev = Infinity;
        
        for (const r of window) {
          cumDev += (r - mean);
          if (cumDev > maxDev) maxDev = cumDev;
          if (cumDev < minDev) minDev = cumDev;
        }

        const range = maxDev - minDev;
        const stdev = Math.sqrt(window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lag);

        if (stdev > 0) {
          totalRS += (range / stdev);
        }
      }
      
      if (numWindows > 0) {
        rsValues.push({ lag, rs: totalRS / numWindows });
      }
    }

    if (rsValues.length < 2) return 0.5;

    // Linear Regression on log(lag) vs log(R/S)
    const x = rsValues.map(v => Math.log(v.lag));
    const y = rsValues.map(v => Math.log(v.rs));
    
    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const hurst = denominator !== 0 ? numerator / denominator : 0.5;
    return Math.max(0, Math.min(1, hurst));
  }

  static detect(p: number[]): { regime: MarketRegime; score: number; predictability: number } {
    const h = this.getHurst(p);
    
    // Predictability is the distance from 0.5 (Random Walk)
    // 0 = Random, 1 = Perfectly Trending/Reverting
    const predictability = Math.abs(h - 0.5) * 2;

    const regime = h < 0.45 ? "MEAN_REVERSION" : (h > 0.55 ? "MOMENTUM" : "RANDOM_WALK");
    
    return { 
      regime, 
      score: Number(h.toFixed(3)), 
      predictability: Number(predictability.toFixed(3)) 
    };
  }
}
