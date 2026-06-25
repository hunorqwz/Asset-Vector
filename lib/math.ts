/**
 * Financial Mathematics Engine
 * Consolidated logic for statistical analysis and risk modeling.
 */

export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    // Both current and previous prices must be strictly positive to calculate a valid log-return
    if (prices[i-1] > 0 && prices[i] > 0 && !isNaN(prices[i-1]) && !isNaN(prices[i])) {
       // Logarithmic returns for stationarity (institutional standard)
       returns.push(Math.log(prices[i] / prices[i-1]));
    } else {
       returns.push(0); // Neutral flat-line if data is corrupted or asset went to 0
    }
  }
  return returns;
}

export function calculateArithmeticReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] !== 0 && !isNaN(prices[i-1])) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
  }
  return returns;
}

export function calculateVariance(data: number[]): number {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
  return Math.max(0, variance); 
}

/**
 * Institutional GARCH-lite Volatility Model
 * Recursively estimates current variance based on prior variance and shocks.
 * Formula: σ²_t = ω + α * ε²_{t-1} + β * σ²_{t-1}
 */
export function calculateGARCHVolatility(returns: number[]): number {
  if (returns.length < 20) return Math.sqrt(calculateVariance(returns));
  
  const longTermVar = calculateVariance(returns);
  // Institutional standard coefficients for stable markets
  const omega = longTermVar * 0.05; 
  const alpha = 0.15; // weight on recent shock
  const beta = 0.80;  // weight on persistent variance
  
  let currentVar = longTermVar;
  for (const r of returns) {
    currentVar = omega + alpha * (r * r) + beta * currentVar;
  }
  
  return Math.sqrt(currentVar);
}

export function calculateCovariance(data1: number[], data2: number[]): number {
  const minLen = Math.min(data1.length, data2.length);
  if (minLen < 2) return 0;
  
  // CRITICAL: Caller MUST ensure data1 and data2 are aligned by time before passing.
  const mean1 = data1.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
  const mean2 = data2.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
  
  let cov = 0;
  for (let i = 0; i < minLen; i++) {
    cov += (data1[i] - mean1) * (data2[i] - mean2);
  }
  return cov / (minLen - 1);
}

export function calculateCorrelation(data1: number[], data2: number[]): number {
  const cov = calculateCovariance(data1, data2);
  const var1 = calculateVariance(data1);
  const var2 = calculateVariance(data2);
  
  // Guard: Zero-volatility assets cannot have correlation
  if (var1 <= 1e-12 || var2 <= 1e-12) return 0;
  return cov / (Math.sqrt(var1) * Math.sqrt(var2));
}

export function calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
  const cov = calculateCovariance(assetReturns, benchmarkReturns);
  const varBench = calculateVariance(benchmarkReturns);
  // Guard: If benchmark is flat, Beta is undefined in theory, but 0 in signal processing context
  return varBench > 1e-12 ? cov / varBench : 0;
}

export function calculateJensensAlpha(
  assetPriceHistory: { close: number }[],
  benchmarkPriceHistory: { close: number }[],
  beta: number,
  riskFreeRate: number = 0.04
): number {
  const windowDays = Math.min(assetPriceHistory.length, 252);
  if (windowDays < 2 || benchmarkPriceHistory.length < windowDays) return 0;
  
  const aSlice = assetPriceHistory.slice(-windowDays);
  const bSlice = benchmarkPriceHistory.slice(-windowDays);

  // Use Linear Arithmetic compounding for returns consistency across portfolio risk components
  if (aSlice.length > 0 && bSlice.length > 0) {
    const aFirst = aSlice[0].close;
    const aLast = aSlice[aSlice.length - 1].close;
    const bFirst = bSlice[0].close;
    const bLast = bSlice[bSlice.length - 1].close;

    if (aFirst > 0 && bFirst > 0) {
      const assetArithRet = (aLast - aFirst) / aFirst;
      const benchArithRet = (bLast - bFirst) / bFirst;
      
      // Annualize the returns
      const assetAnnRet = (assetArithRet / windowDays) * 252;
      const benchAnnRet = (benchArithRet / windowDays) * 252;
      
      // alpha = R_p - [R_f + Beta * (R_m - R_f)]
      return assetAnnRet - (riskFreeRate + beta * (benchAnnRet - riskFreeRate));
    }
  }
  return 0;
}

export function alignAndCalculateReturns(
  data1: { time: number; close: number }[],
  data2: { time: number; close: number }[]
): { returns1: number[]; returns2: number[] } {
  const map2 = new Map(data2.map(d => [d.time, d.close]));
  const sync1: number[] = [];
  const sync2: number[] = [];
  
  for (let i = 1; i < data1.length; i++) {
    const t = data1[i].time;
    const prevT = data1[i-1].time;
    
    if (map2.has(t) && map2.has(prevT)) {
      const p1 = data1[i].close;
      const prevP1 = data1[i-1].close;
      const p2 = map2.get(t)!;
      const prevP2 = map2.get(prevT)!;
      
      if (prevP1 > 0 && prevP2 > 0) {
        sync1.push(Math.log(p1 / prevP1));
        sync2.push(Math.log(p2 / prevP2));
      }
    }
  }
  return { returns1: sync1, returns2: sync2 };
}

export interface ARIMAProjection {
  forecast: number[];
  standardError: number;
  confidence95: { upper: number[]; lower: number[] };
}

/**
 * Institutional ARIMA(1,1,0) Engine
 * Integrated Auto-Regressive process for stationary price projection.
 * Formula: Y_t = μ + ϕ(Y_{t-1} - μ) + ε_t
 */
/**
 * Institutional Data Integrity Engine (v2.5)
 * Detects and filters "bad prints" (outliers) using Median Absolute Deviation (MAD).
 * Unlike Z-Score, MAD is robust to extreme outliers that would skew a simple mean.
 */
export function validateAndCleanData(prices: number[], threshold: number = 5): number[] {
  if (prices.length < 5) return prices;

  // 1. Calculate Median
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // 2. Calculate Median Absolute Deviation (MAD)
  const absoluteDeviations = prices.map(p => Math.abs(p - median));
  const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  // 3. Filter outliers using Modified Z-Score
  // Z = 0.6745 * (x - median) / MAD
  const cleanPrices: number[] = [...prices];
  for (let i = 1; i < prices.length - 1; i++) {
    const p = prices[i];
    let modifiedZ = 0;
    if (mad !== 0) {
      modifiedZ = (0.6745 * (p - median)) / mad;
    } else if (p !== median) {
      modifiedZ = Infinity; // Infinite outlier if it differs from a perfectly flat median
    }

    if (Math.abs(modifiedZ) > threshold) {
      // True Bad Tick Detection: Check if price immediately reverts.
      // If it stays at the new level, it's a structural move (e.g. gap down) and should be preserved.
      const prevPrice = cleanPrices[i - 1];
      const nextPrice = prices[i + 1];
      const revertThreshold = mad * 2; 

      if (Math.abs(nextPrice - prevPrice) < revertThreshold || mad === 0) {
        // It's a bad tick (bounced back). Interpolate to fix corruption.
        cleanPrices[i] = (prevPrice + nextPrice) / 2;
      } else {
        // Structural move, keep it.
        cleanPrices[i] = p;
      }
    }
  }

  return cleanPrices;
}

export function runARIMAForecast(prices: number[], periods: number = 5): ARIMAProjection {
  if (prices.length < 20) {
    return { forecast: [], standardError: 0, confidence95: { upper: [], lower: [] } };
  }

  // 1. Difference for stationarity (I=1)
  const returns = calculateReturns(prices);
  
  // 2. Estimate AR(1) coefficient (ϕ) using simple OLS or autocorrelation
  // For a fast, stable client-side forecast, we use the lag-1 autocorrelation
  const n = returns.length;
  
  // Use Exponentially Weighted Moving Average (EWMA) for the mean return
  // This makes the ARIMA anchor much more responsive to recent trend shifts
  const alpha = 0.15; // 15% decay factor for localized momentum
  let ewmaMean = returns[0];
  for (let i = 1; i < n; i++) {
    ewmaMean = alpha * returns[i] + (1 - alpha) * ewmaMean;
  }
  const meanRet = ewmaMean;
  
  let num = 0, den = 0;
  for (let i = 1; i < n; i++) {
    num += (returns[i] - meanRet) * (returns[i-1] - meanRet);
    den += Math.pow(returns[i-1] - meanRet, 2);
  }
  
  const phi = den !== 0 ? num / den : 0;
  // Guard phi! AR models must be stationary (|phi| < 1)
  const clampedPhi = Math.max(-0.99, Math.min(0.99, phi)); 
  const variance = calculateVariance(returns);
  // Std error of residuals = sqrt(variance * (1 - phi^2))
  const stdError = Math.sqrt(Math.max(1e-10, variance * (1 - Math.pow(clampedPhi, 2))));

  // 3. Project future returns and reconstruct prices
  const forecastPrices: number[] = [];
  const upperPrices: number[] = [];
  const lowerPrices: number[] = [];
  
  let lastPrice = prices[prices.length - 1];
  let lastRet = returns[returns.length - 1];

  for (let t = 1; t <= periods; t++) {
    // Expected next return based on AR(1)
    const nextRet = meanRet + phi * (lastRet - meanRet);
    const nextPrice = lastPrice * Math.exp(nextRet);
    
    forecastPrices.push(nextPrice);
    
    // 95% Confidence Interval (1.96 * SE * sqrt(time))
    const cumulativeError = stdError * Math.sqrt(t) * 1.96;
    upperPrices.push(nextPrice * Math.exp(cumulativeError));
    lowerPrices.push(nextPrice * Math.exp(-cumulativeError));

    lastPrice = nextPrice;
    lastRet = nextRet;
  }

  return {
    forecast: forecastPrices,
    standardError: stdError,
    confidence95: { upper: upperPrices, lower: lowerPrices }
  };
}

/**
 * Ridge OLS Solver (Gauss-Jordan with L2 Regularization)
 * Solves X * B = Y for coefficients B
 */
export function solveOLS(X: number[][], Y: number[], ridge: number = 1e-4): number[] {
  const n = X.length;
  if (n === 0) return [];
  const k = X[0].length;

  // Compute XtX = X^T * X
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let t = 0; t < n; t++) {
        sum += X[t][i] * X[t][j];
      }
      XtX[i][j] = sum;
    }
    // Add ridge penalty to diagonal for numerical stability
    XtX[i][i] += ridge;
  }

  // Compute XtY = X^T * Y
  const XtY: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let sum = 0;
    for (let t = 0; t < n; t++) {
      sum += X[t][i] * Y[t];
    }
    XtY[i] = sum;
  }

  // Solve XtX * B = XtY using Gauss-Jordan elimination
  // Augment XtX with XtY: A = [XtX | XtY]
  const A: number[][] = XtX.map((row, i) => [...row, XtY[i]]);

  for (let i = 0; i < k; i++) {
    // Find pivot
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let r = i + 1; r < k; r++) {
      if (Math.abs(A[r][i]) > maxEl) {
        maxEl = Math.abs(A[r][i]);
        maxRow = r;
      }
    }

    // Swap max row with current row
    const temp = A[maxRow];
    A[maxRow] = A[i];
    A[i] = temp;

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // Singular matrix fallback: return zero coefficients
      return new Array(k).fill(0);
    }

    // Normalize current row
    for (let c = i; c <= k; c++) {
      A[i][c] /= pivot;
    }

    // Eliminate other rows
    for (let r = 0; r < k; r++) {
      if (r !== i) {
        const factor = A[r][i];
        for (let c = i; c <= k; c++) {
          A[r][c] -= factor * A[i][c];
        }
      }
    }
  }

  // Coefficients are in the last column
  return A.map(row => row[k]);
}

/**
 * Institutional ARIMAX(1,1,0) Engine
 * Incorporates exogenous macro variables (e.g. Fed Funds, Yield Curve)
 * directly into the autoregressive return model via Ridge regression.
 * Y_t = alpha + phi * Y_{t-1} + sum(beta_i * dX_{i,t}) + e_t
 */
export function runARIMAXForecast(
  prices: number[],
  exogenousData: number[][], // prices.length x num_features
  periods: number = 5,
  latestExogenousChanges: number[] = []
): ARIMAProjection {
  if (prices.length < 20 || exogenousData.length < prices.length) {
    // Fallback to classic ARIMA if exogenous data is incomplete
    return runARIMAForecast(prices, periods);
  }

  // 1. Difference prices for return stationarity (I=1)
  const returns = calculateReturns(prices);
  const n = returns.length; // prices.length - 1

  // 2. Difference exogenous variables for stationarity
  const k = exogenousData[0].length; // number of features
  const dX: number[][] = Array.from({ length: n }, () => new Array(k).fill(0));
  for (let t = 1; t < prices.length; t++) {
    for (let j = 0; j < k; j++) {
      dX[t - 1][j] = exogenousData[t][j] - (exogenousData[t - 1]?.[j] ?? exogenousData[t][j]);
    }
  }

  // 3. Build regression matrix [Intercept, Lagged_Y, dX_1, dX_2, ...]
  // We align from t = 1 to n-1 (since lagged return requires t-1)
  const OLS_X: number[][] = [];
  const OLS_Y: number[] = [];

  for (let t = 1; t < n; t++) {
    const row = [
      1.0,               // Intercept
      returns[t - 1],    // Lagged Return
      ...dX[t]           // dX features
    ];
    OLS_X.push(row);
    OLS_Y.push(returns[t]);
  }

  // Solve OLS coefficients
  const coefficients = solveOLS(OLS_X, OLS_Y);
  if (coefficients.length === 0 || coefficients.every(c => c === 0)) {
    // Fallback to classic ARIMA if OLS is unstable
    return runARIMAForecast(prices, periods);
  }

  const alpha = coefficients[0];
  const phi = Math.max(-0.99, Math.min(0.99, coefficients[1])); // clamp AR(1)
  const betas = coefficients.slice(2);

  // Residual variance to compute Standard Error
  let residualSumSq = 0;
  for (let i = 0; i < OLS_X.length; i++) {
    let fitted = alpha + phi * OLS_X[i][1];
    for (let j = 0; j < k; j++) {
      fitted += betas[j] * OLS_X[i][2 + j];
    }
    residualSumSq += Math.pow(OLS_Y[i] - fitted, 2);
  }
  const df = OLS_X.length - OLS_X[0].length;
  const stdError = Math.sqrt(Math.max(1e-10, residualSumSq / (df > 0 ? df : 1)));

  // 4. Project future returns and reconstruct prices
  const forecastPrices: number[] = [];
  const upperPrices: number[] = [];
  const lowerPrices: number[] = [];

  let lastPrice = prices[prices.length - 1];
  let lastRet = returns[returns.length - 1];

  for (let t = 1; t <= periods; t++) {
    // Exogenous change contribution for future steps (assumed zero-drift except for the first step)
    let exoContribution = 0;
    if (t === 1 && latestExogenousChanges.length === k) {
      for (let j = 0; j < k; j++) {
        exoContribution += betas[j] * latestExogenousChanges[j];
      }
    }

    const nextRet = alpha + phi * lastRet + exoContribution;
    const nextPrice = lastPrice * Math.exp(nextRet);

    forecastPrices.push(nextPrice);

    // 95% Confidence Interval
    const cumulativeError = stdError * Math.sqrt(t) * 1.96;
    upperPrices.push(nextPrice * Math.exp(cumulativeError));
    lowerPrices.push(nextPrice * Math.exp(-cumulativeError));

    lastPrice = nextPrice;
    lastRet = nextRet;
  }

  return {
    forecast: forecastPrices,
    standardError: stdError,
    confidence95: { upper: upperPrices, lower: lowerPrices }
  };
}
