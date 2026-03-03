/**
 * Financial Mathematics Engine
 * Consolidated logic for statistical analysis and risk modeling.
 */

export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] !== 0 && !isNaN(prices[i-1])) {
       // Logarithmic returns for stationarity (institutional standard)
       returns.push(Math.log(prices[i] / prices[i-1]));
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
  return data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
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
  
  if (var1 <= 0 || var2 <= 0) return 0;
  return cov / (Math.sqrt(var1) * Math.sqrt(var2));
}

export function calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
  const cov = calculateCovariance(assetReturns, benchmarkReturns);
  const varBench = calculateVariance(benchmarkReturns);
  return varBench !== 0 ? cov / varBench : 1;
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
