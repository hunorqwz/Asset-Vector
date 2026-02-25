/**
 * STOCHASTIC MONTE CARLO SIMULATION ENGINE
 * 
 * Uses Geometric Brownian Motion (GBM) to simulate thousands of potential future 
 * price paths based on the asset's historical drift (expected return) and volatility.
 * 
 * S_t = S_0 * exp((μ - (σ^2)/2) * t + σ * W_t)
 */

export interface MonteCarloParams {
  currentPrice: number;
  historicalPrices: number[]; // Array of past closing prices
  daysToSimulate: number;
  simulations: number; // e.g. 5000 or 10000 
}

export interface MonteCarloResult {
  currentPrice: number;
  expectedPrice: number; // The mean of all end prices
  percentile5th: number; // Bear case (95% confidence price stays above this)
  percentile95th: number; // Bull case (5% chance price goes above this)
  paths: { day: number; price: number }[][]; // A small sample of paths for UI rendering (e.g. 5 paths)
  isValid: boolean;
}

export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  if (params.historicalPrices.length < 30 || params.currentPrice <= 0) {
    return { currentPrice: params.currentPrice, expectedPrice: 0, percentile5th: 0, percentile95th: 0, paths: [], isValid: false };
  }

  // 1. Calculate Daily Log Returns
  const logReturns: number[] = [];
  for (let i = 1; i < params.historicalPrices.length; i++) {
    const today = params.historicalPrices[i];
    const yesterday = params.historicalPrices[i - 1];
    if (yesterday > 0 && today > 0) {
      logReturns.push(Math.log(today / yesterday));
    }
  }

  if (logReturns.length === 0) {
     return { currentPrice: params.currentPrice, expectedPrice: 0, percentile5th: 0, percentile95th: 0, paths: [], isValid: false };
  }

  // 2. Calculate Drift (μ) and Volatility (σ)
  const meanReturn = logReturns.reduce((sum, val) => sum + val, 0) / logReturns.length;
  const variance = logReturns.reduce((sum, val) => sum + Math.pow(val - meanReturn, 2), 0) / logReturns.length;
  const volatility = Math.sqrt(variance);

  // Daily Drift = μ - (σ^2)/2
  const dailyDrift = meanReturn - (variance / 2);

  // 3. Run Simulations
  const finalPrices: number[] = [];
  const samplePaths: { day: number; price: number }[][] = [];
  const MAX_RENDER_PATHS = 5;

  for (let s = 0; s < params.simulations; s++) {
    let price = params.currentPrice;
    const path = [{ day: 0, price }];

    for (let day = 1; day <= params.daysToSimulate; day++) {
      // Standard Normal Distribution Approximation using Box-Muller transform
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

      // Geometric Brownian Motion formula
      const dailyShock = dailyDrift + (volatility * z);
      price = price * Math.exp(dailyShock);
      
      if (s < MAX_RENDER_PATHS) {
        path.push({ day, price });
      }
    }

    finalPrices.push(price);
    if (s < MAX_RENDER_PATHS) {
      samplePaths.push(path);
    }
  }

  // 4. Calculate Statistics
  // Sort final prices to easily find percentiles
  finalPrices.sort((a, b) => a - b);
  
  const expectedPrice = finalPrices.reduce((sum, val) => sum + val, 0) / finalPrices.length;
  
  // 5th percentile (bottom 5% of outcomes)
  const idx5th = Math.floor(params.simulations * 0.05);
  const percentile5th = finalPrices[idx5th];

  // 95th percentile (top 5% of outcomes)
  const idx95th = Math.floor(params.simulations * 0.95);
  const percentile95th = finalPrices[idx95th];

  return {
    currentPrice: params.currentPrice,
    expectedPrice,
    percentile5th,
    percentile95th,
    paths: samplePaths,
    isValid: true
  };
}
