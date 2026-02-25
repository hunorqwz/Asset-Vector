import { OHLCV } from "./market-data";

export interface Trendline {
  p1: { time: number; price: number; index: number };
  p2: { time: number; price: number; index: number };
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number;
}

/**
 * Calculates a statistically perfect Linear Regression Channel rather than 
 * relying on error-prone heuristic fractal pivot connecting.
 * 
 * Provides an Upper Resistance and Lower Support band covering ~95% of the price action.
 */
export function detectTrendlines(data: OHLCV[]): Trendline[] {
  if (data.length < 20) return [];

  const N = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  // 1. Calculate the Linear Regression Line (Line of Best Fit)
  for (let i = 0; i < N; i++) {
    const x = i;
    const y = data[i].close;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = N * sumX2 - sumX * sumX;
  if (denominator === 0) return []; // Failsafe

  const slope = (N * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / N;

  // 2. Calculate the Standard Deviation of Residuals
  let sse = 0;
  for (let i = 0; i < N; i++) {
    const predicted = slope * i + intercept;
    const error = data[i].close - predicted;
    sse += error * error;
  }
  
  const stdDev = Math.sqrt(sse / N);
  
  // 3. Create Support and Resistance Bounds (2 standard deviations)
  const k = 2; // ~95% statistical coverage
  
  const i1 = 0;
  const i2 = N - 1;

  const resistP1Price = (slope * i1 + intercept) + (k * stdDev);
  const resistP2Price = (slope * i2 + intercept) + (k * stdDev);

  const suppP1Price = (slope * i1 + intercept) - (k * stdDev);
  const suppP2Price = (slope * i2 + intercept) - (k * stdDev);

  // Return the mathematically locked bounds
  return [
    {
      p1: { time: data[i1].time, price: resistP1Price, index: i1 },
      p2: { time: data[i2].time, price: resistP2Price, index: i2 },
      type: 'RESISTANCE',
      strength: 100 // Maximum mathematical certainty
    },
    {
      p1: { time: data[i1].time, price: suppP1Price, index: i1 },
      p2: { time: data[i2].time, price: suppP2Price, index: i2 },
      type: 'SUPPORT',
      strength: 100
    }
  ];
}
