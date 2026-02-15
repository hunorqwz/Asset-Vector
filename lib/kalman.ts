export class KalmanFilter {
  /**
   * Simple 1D Kalman Filter for price smoothing.
   * R: Measurement Noise Covariance (Market Microstructure Noise)
   * Q: Process Noise Covariance (True Volatility of the Asset)
   * A: State Transition Model (1 for simple random walk)
   * B: Control Input Model (0 for no external control)
   * C: Observation Model (1 for direct observation)
   */
  private R: number;
  private Q: number;
  private A: number;
  private B: number;
  private C: number;
  
  private cov: number; // State Covariance (Uncertainty)
  private x: number;   // Estimated State (Price)

  constructor(R: number = 1, Q: number = 0.1, A: number = 1, B: number = 0, C: number = 1) {
    this.R = R;
    this.Q = Q;
    this.A = A;
    this.B = B;
    this.C = C;
    this.cov = NaN;
    this.x = NaN; // Initial state is unknown
  }

  /**
   * Filters a new measurement (price point).
   * @param measurement The raw price from the feed.
   * @param u Optional control input (e.g., volume surge).
   * @returns { prediction: number, uncertainty: number }
   */
  filter(measurement: number, u: number = 0) {
    if (isNaN(this.x)) {
      this.x = measurement;
      this.cov = this.R; // Initial uncertainty is the measurement noise
      return { prediction: this.x, uncertainty: this.cov };
    }

    // 1. Prediction Step
    const predX = (this.A * this.x) + (this.B * u);
    const predCov = (this.A * this.cov * this.A) + this.Q;

    // 2. Innovation Step
    // Kalman Gain (K): How much do we trust the new measurement vs. our prediction?
    const K = (predCov * this.C) / ((this.C * predCov * this.C) + this.R);

    // Update state estimate (x)
    this.x = predX + K * (measurement - (this.C * predX));

    // Update covariance (uncertainty)
    this.cov = predCov - (K * this.C * predCov);

    return { 
      prediction: this.x, 
      uncertainty: this.cov, 
      kalmanGain: K 
    };
  }

  /**
   * Calculates the Signal-to-Noise Ratio (SNR).
   * High SNR = Strong Trend. Low SNR = High Noise / Mean Reversion.
   * @returns number
   */
  getSNR(): number {
      // Inverse of the Kalman Gain (roughly) or ratio of Process Noise / Measurement Noise
      // Simplified metric: lower covariance = higher confidence
      return this.Q / (this.cov + 1e-9); 
  }
}

/**
 * Utility function to batch process an array of prices.
 */
export function runKalmanBatch(prices: number[], R: number = 1, Q: number = 0.1) {
  const kf = new KalmanFilter(R, Q);
  return prices.map(p => kf.filter(p));
}
