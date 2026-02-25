export type MarketRegime = "MEAN_REVERSION" | "MOMENTUM" | "RANDOM_WALK";

export class RegimeDetector {
  static getHurst(prices: number[]): number {
    const p = prices.slice(-100); // Use 100-period window for significance
    if (p.length < 50) return 0.5;
    
    const rets: number[] = [];
    for (let i = 1; i < p.length; i++) {
        if (p[i-1] > 0) rets.push(Math.log(p[i] / p[i - 1]));
    }

    const n = rets.length;
    const mean = rets.reduce((a, b) => a + b, 0) / n;
    
    let sum = 0; 
    const cum: number[] = [];
    rets.forEach(r => { sum += (r - mean); cum.push(sum); });

    const range = Math.max(...cum) - Math.min(...cum);
    const stdev = Math.sqrt(rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
    
    if (stdev === 0) return 0.5;
    // Corrected R/S calculation
    const hurst = Math.log(range / stdev) / Math.log(n);
    return Math.max(0, Math.min(1, hurst));
  }

  static detect(p: number[]): { regime: MarketRegime; score: number } {
    const h = this.getHurst(p);
    // Institutional Thresholds: 
    // < 0.45: Anti-persistent (Mean Reversion)
    // > 0.55: Persistent (Momentum)
    const regime = h < 0.45 ? "MEAN_REVERSION" : (h > 0.55 ? "MOMENTUM" : "RANDOM_WALK");
    return { regime, score: Number(h.toFixed(2)) };
  }
}
