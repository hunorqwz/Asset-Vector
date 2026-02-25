export class KalmanFilter {
  private R: number; private Q: number; private A: number; private B: number; private C: number;
  private cov: number = NaN; private x: number = NaN;

  constructor(R: number = 1, Q: number = 0.1, A: number = 1, B: number = 0, C: number = 1) {
    this.R = R; this.Q = Q; this.A = A; this.B = B; this.C = C;
  }

  filter(z: number, u: number = 0) {
    if (isNaN(this.x)) { this.x = z; this.cov = this.R; return { prediction: this.x, uncertainty: this.cov }; }
    const px = (this.A * this.x) + (this.B * u);
    const pc = (this.A * this.cov * this.A) + this.Q;
    const k = (pc * this.C) / ((this.C * pc * this.C) + this.R);
    this.x = px + k * (z - (this.C * px));
    this.cov = pc - (k * this.C * pc);
    return { prediction: this.x, uncertainty: this.cov, gain: k };
  }

  static deriveParameters(prices: number[]) {
    if (prices.length < 10) return { R: 1, Q: 0.01 };
    // Institutional calibration: Q is process variance, R is measurement noise.
    // Calculate variance of price changes
    const diffs = [];
    for (let i = 1; i < prices.length; i++) diffs.push(Math.abs(prices[i] - prices[i-1]));
    const avgChange = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, b) => a + Math.pow(b - avgChange, 2), 0) / diffs.length;
    
    return {
      R: variance > 0 ? variance * 2 : 1, // High measurement noise to prevent over-fitting
      Q: variance > 0 ? variance * 0.1 : 0.01 // Responsive process noise
    };
  }

  getSNR(): number { return this.Q / (this.cov + 1e-9); }
}

export function runKalmanBatch(prices: number[], overrideR?: number, overrideQ?: number) {
  const { R, Q } = KalmanFilter.deriveParameters(prices);
  const kf = new KalmanFilter(overrideR ?? R, overrideQ ?? Q);
  return prices.map(p => kf.filter(p));
}
