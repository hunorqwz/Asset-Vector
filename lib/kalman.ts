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

  getSNR(): number { return this.Q / (this.cov + 1e-9); }
}

export function runKalmanBatch(prices: number[], R: number = 1, Q: number = 0.1) {
  const kf = new KalmanFilter(R, Q);
  return prices.map(p => kf.filter(p));
}
