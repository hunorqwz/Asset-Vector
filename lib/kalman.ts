export class KalmanFilter {
  private R: number; // Measurement Noise
  private Q: number; // Process Noise
  private A: number; // State Transition
  private C: number; // Measurement Mapping
  private cov: number = NaN;
  private x: number = NaN;

  constructor(R: number = 1, Q: number = 0.1, A: number = 1, C: number = 1) {
    this.R = R; this.Q = Q; this.A = A; this.C = C;
  }

  /**
   * Adaptive parameter update.
   * Allows the system to become more "sensitive" or "stable" based on external signals.
   */
  updateParameters(newR?: number, newQ?: number) {
    if (newR !== undefined) this.R = newR;
    if (newQ !== undefined) this.Q = newQ;
  }

  filter(z: number) {
    // Initialization
    if (isNaN(this.x)) {
      this.x = z;
      this.cov = this.R;
      return { prediction: this.x, uncertainty: this.cov, gain: 0 };
    }

    // Prediction Phase
    const predX = this.A * this.x;
    const predCov = (this.A * this.cov * this.A) + this.Q;

    // Innovation / Measurement Update Phase
    // Kalman Gain (k) determines how much we trust the new measurement (z) vs our prediction
    const k = (predCov * this.C) / ((this.C * predCov * this.C) + this.R);

    // Correct the state
    this.x = predX + k * (z - (this.C * predX));
    
    // Correct the covariance (uncertainty)
    this.cov = (1 - (k * this.C)) * predCov;

    return { 
      prediction: this.x, 
      uncertainty: this.cov, 
      gain: k 
    };
  }

  /**
   * Institutional Calibration Engine
   * Calculates optimal R and Q by analyzing the variance of price-velocity.
   */
  static deriveParameters(prices: number[]) {
    if (prices.length < 20) return { R: 1, Q: 0.01 };
    
    const diffs: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        diffs.push(Math.abs(prices[i] - prices[i - 1]));
    }

    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / diffs.length;
    
    // R (Measurement Noise): Represents how much 'flutter' is in the quote feed.
    // Q (Process Noise): Represents the rate of actual underlying price change.
    // High R/Q ratio = More smoothing, slower response.
    // Low R/Q ratio = Less smoothing, faster response.
    return {
      R: variance > 0 ? variance * 5 : 1, // Base measurement noise
      Q: variance > 0 ? variance * 0.2 : 0.01 // Base process noise
    };
  }

  getSNR(): number {
    return this.Q / (this.cov + 1e-9);
  }
}

/**
 * Runs a batch filter with institutional adaptive windowing.
 */
export function runKalmanBatch(prices: number[], volatility?: number) {
  const { R, Q } = KalmanFilter.deriveParameters(prices);
  const kf = new KalmanFilter(R, Q);
  
  return prices.map((p, i) => {
    // If we have volatility data, we can adaptively increase Q (process noise)
    // to allow the filter to "catch up" faster during high-volatility events.
    if (volatility && volatility > 0.02) {
        kf.updateParameters(undefined, Q * (1 + volatility * 10));
    } else {
        kf.updateParameters(undefined, Q);
    }
    return kf.filter(p);
  });
}
