export type MarketRegime = "MEAN_REVERSION" | "MOMENTUM" | "RANDOM_WALK";

export class RegimeDetector {
  static getHurst(p: number[]): number {
    if (p.length < 20) return 0.5;
    const rets: number[] = [];
    for (let i = 1; i < p.length; i++) rets.push(Math.log(p[i] / p[i - 1]));

    const n = rets.length, mean = rets.reduce((a, b) => a + b, 0) / n;
    let sum = 0; const cum: number[] = [];
    rets.forEach(r => { sum += (r - mean); cum.push(sum); });

    const r = Math.max(...cum) - Math.min(...cum);
    const s = Math.sqrt(rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
    return s === 0 ? 0.5 : Math.max(0, Math.min(1, Math.log(r / s) / Math.log(n)));
  }

  static detect(p: number[]): { regime: MarketRegime; score: number } {
    const h = this.getHurst(p);
    const regime = h < 0.45 ? "MEAN_REVERSION" : (h > 0.60 ? "MOMENTUM" : "RANDOM_WALK");
    return { regime, score: Number(h.toFixed(2)) };
  }
}
