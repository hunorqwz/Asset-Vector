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
