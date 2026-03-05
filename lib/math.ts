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
  const d1 = data1.slice(-minLen);
  const d2 = data2.slice(-minLen);
  const mean1 = d1.reduce((a, b) => a + b, 0) / minLen;
  const mean2 = d2.reduce((a, b) => a + b, 0) / minLen;
  
  let cov = 0;
  for (let i = 0; i < minLen; i++) {
    cov += (d1[i] - mean1) * (d2[i] - mean2);
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
  
  const scaledRf = riskFreeRate * (windowDays / 252);
  
  const assetStart = assetPriceHistory[assetPriceHistory.length - windowDays].close;
  const assetEnd = assetPriceHistory[assetPriceHistory.length - 1].close;
  const assetCumRet = assetStart !== 0 ? (assetEnd / assetStart - 1) : 0;
  
  const benchStart = benchmarkPriceHistory[benchmarkPriceHistory.length - windowDays].close;
  const benchEnd = benchmarkPriceHistory[benchmarkPriceHistory.length - 1].close;
  const benchCumRet = benchStart !== 0 ? (benchEnd / benchStart - 1) : 0;
  
  // alpha = R_p - [R_f + Beta * (R_m - R_f)]
  return assetCumRet - (scaledRf + beta * (benchCumRet - scaledRf));
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
      // Data Corruption Detected: Interpolate from neighbors to maintain continuity
      // institutional-grade gap filling
      cleanPrices[i] = (prices[i - 1] + prices[i + 1]) / 2;
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
  const meanRet = returns.reduce((a, b) => a + b, 0) / n;
  
  let num = 0, den = 0;
  for (let i = 1; i < n; i++) {
    num += (returns[i] - meanRet) * (returns[i-1] - meanRet);
    den += Math.pow(returns[i-1] - meanRet, 2);
  }
  
  const phi = den !== 0 ? num / den : 0;
  const variance = calculateVariance(returns);
  // Std error of residuals = sqrt(variance * (1 - phi^2))
  const stdError = Math.sqrt(variance * (1 - Math.pow(phi, 2)));

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
