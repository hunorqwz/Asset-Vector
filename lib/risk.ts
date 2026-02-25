/**
 * RISK ENTROPY PROTOCOL | INSTITUTIONAL RISK ENGINE
 * 
 * Calculates advanced risk-adjusted performance metrics including 
 * Sharpe Ratio, Sortino Ratio, and Downside Deviation.
 */

export interface RiskEntropy {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  realizedVolatility: number;
  downsideDeviation: number;
  riskFreeRate: number;
  isValid: boolean;
}

export function calculateRiskEntropy(history: { close: number }[], annualRiskFreeRate: number = 0.04): RiskEntropy {
  const prices = history.map(h => h.close);
  if (prices.length < 50) {
    return { sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, realizedVolatility: 0, downsideDeviation: 0, riskFreeRate: annualRiskFreeRate, isValid: false };
  }

  // 1. Calculate Daily Log Returns
  const rets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0) {
      rets.push(Math.log(prices[i] / prices[i-1]));
    }
  }

  // 2. Annualize Risk-Free Rate (Assuming 252 trading days)
  const dailyRf = Math.pow(1 + annualRiskFreeRate, 1/252) - 1;

  // 3. Average Daily Excess Return
  const meanRet = rets.reduce((a, b) => a + b, 0) / rets.length;
  const avgExcessReturn = meanRet - dailyRf;

  // 4. Realized Volatility (Annualized Standard Deviation)
  const variance = rets.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / (rets.length - 1);
  const stdDev = Math.sqrt(variance);
  const annualizedVol = stdDev * Math.sqrt(252);

  // 5. Downside Deviation
  const negativeRets = rets.filter(r => r < 0);
  const downsideVariance = negativeRets.reduce((a, b) => a + Math.pow(b, 2), 0) / rets.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const annualizedDownsideDev = downsideDeviation * Math.sqrt(252);

  // 6. Max Drawdown
  let maxPx = 0;
  let maxDD = 0;
  prices.forEach(p => {
    if (p > maxPx) maxPx = p;
    const dd = (p - maxPx) / maxPx;
    if (dd < maxDD) maxDD = dd;
  });

  // 7. Calculate Ratios
  // Sharpe = (Mean Excess Return) / Volatility (Annualized)
  const sharpe = annualizedVol > 0 ? (meanRet * 252 - annualRiskFreeRate) / annualizedVol : 0;
  
  // Sortino = (Mean Excess Return) / Downside Deviation (Annualized)
  const sortino = annualizedDownsideDev > 0 ? (meanRet * 252 - annualRiskFreeRate) / annualizedDownsideDev : 0;

  // Max Drawdown as a decimal (usually negative)
  const maxDDDecimal = maxDD;

  return {
    sharpeRatio: Number(sharpe.toFixed(4)),
    sortinoRatio: Number(sortino.toFixed(4)),
    maxDrawdown: Number(maxDDDecimal.toFixed(4)),
    realizedVolatility: Number(annualizedVol.toFixed(4)),
    downsideDeviation: Number(annualizedDownsideDev.toFixed(4)),
    riskFreeRate: annualRiskFreeRate,
    isValid: true
  };
}
