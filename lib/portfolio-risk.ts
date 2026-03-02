import { fetchHistoryWithInterval } from "./market-data";

export interface ScenarioResult {
  name: string;
  description: string;
  projectedReturn: number;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
}

export interface RiskIntelligence {
  portfolioBeta: number;
  correlationAlerts: string[];
  scenarios: ScenarioResult[];
  volatilityAnnualized: number;
  correlationMatrix: CorrelationMatrix;
}

/**
 * STRATEGIC RISK ENGINE
 * calculates Portfolio Beta, Correlation Synchronicity, and Stress Scenarios
 */
export async function computePortfolioRisk(positions: { ticker: string; weight: number }[]): Promise<RiskIntelligence> {
  if (positions.length === 0) {
    return { 
      portfolioBeta: 0, 
      correlationAlerts: [], 
      scenarios: [], 
      volatilityAnnualized: 0,
      correlationMatrix: { tickers: [], matrix: [] }
    };
  }

  // 1. Fetch 1Y History for all assets + SPY Benchmark
  const spyTicker = "SPY";
  const tickers = [...new Set([...positions.map(p => p.ticker), spyTicker])];
  
  const historyData = await Promise.all(
    tickers.map(async t => {
      try {
        const history = await fetchHistoryWithInterval(t, '1d');
        return { ticker: t, history };
      } catch {
        return { ticker: t, history: [] };
      }
    })
  );

  const spyHistory = historyData.find(h => h.ticker === spyTicker)?.history || [];
  if (spyHistory.length < 50) {
     return { 
       portfolioBeta: 1, 
       correlationAlerts: [], 
       scenarios: [], 
       volatilityAnnualized: 0,
       correlationMatrix: { tickers: positions.map(p => p.ticker), matrix: [] }
    };
  }

  const spyReturns = calculateReturns(spyHistory.map(h => h.close));
  const spyVariance = calculateVariance(spyReturns);

  // 2. Calculate Individual Betas and Aggregate
  let totalPortfolioBeta = 0;
  const assetReturnsMap: Record<string, number[]> = {};

  positions.forEach(pos => {
    const assetHist = historyData.find(h => h.ticker === pos.ticker)?.history || [];
    if (assetHist.length < 50) {
      totalPortfolioBeta += pos.weight * 1; // Default to market beta if data is missing
      return;
    }

    const assetReturns = calculateReturns(assetHist.map(h => h.close));
    assetReturnsMap[pos.ticker] = assetReturns;

    const cov = calculateCovariance(assetReturns, spyReturns);
    const beta = spyVariance !== 0 ? cov / spyVariance : 1;
    totalPortfolioBeta += pos.weight * beta;
  });

  // 3. Concentration Guard (Hidden Correlation) & Global Matrix
  const alerts: string[] = [];
  const activeTickers = positions.map(p => p.ticker);
  const matrix: number[][] = Array(activeTickers.length).fill(0).map(() => Array(activeTickers.length).fill(1));
  
  for (let i = 0; i < activeTickers.length; i++) {
    for (let j = 0; j < activeTickers.length; j++) {
      if (i === j) continue;
      
      const t1 = activeTickers[i];
      const t2 = activeTickers[j];
      const r1 = assetReturnsMap[t1];
      const r2 = assetReturnsMap[t2];
      
      if (r1 && r2) {
        const corr = calculateCorrelation(r1, r2);
        matrix[i][j] = Number(corr.toFixed(4));
        
        // Only add alerts once per pair
        if (i < j && corr > 0.85) {
          alerts.push(`High Correlation: ${t1} & ${t2} (${Math.round(corr * 100)}%). They move in lockstep, increasing hidden risk.`);
        }
      } else {
        matrix[i][j] = 0;
      }
    }
  }

  // 4. Calculate Portfolio Daily Returns & Volatility
  const portfolioDailyReturns: number[] = [];
  const days = spyReturns.length;
  
  for (let d = 0; d < days; d++) {
    let dayRet = 0;
    positions.forEach(pos => {
      const assetRets = assetReturnsMap[pos.ticker];
      if (assetRets && assetRets[d] !== undefined) {
        dayRet += assetRets[d] * pos.weight;
      }
    });
    portfolioDailyReturns.push(dayRet);
  }

  const portfolioVariance = calculateVariance(portfolioDailyReturns);
  const portfolioVolAnnual = Math.sqrt(portfolioVariance) * Math.sqrt(252);

  // 5. Strategic Scenarios
  const scenarios: ScenarioResult[] = [
    {
      name: "Mild Tech Correction",
      description: "S&P 500 drops 5% in a broad market rotation.",
      projectedReturn: -5 * totalPortfolioBeta,
      impactLevel: (Math.abs(-5 * totalPortfolioBeta) > 10) ? 'HIGH' : (Math.abs(-5 * totalPortfolioBeta) > 5) ? 'MEDIUM' : 'LOW'
    },
    {
      name: "Systemic Crisis (2020 Style)",
      description: "Volatility surge, S&P 500 crashes 20% in 10 days.",
      projectedReturn: -20 * totalPortfolioBeta,
      impactLevel: 'HIGH'
    },
    {
      name: "Market Euphoria",
      description: "S&P 500 rallies 10% on Dovish Fed pivot.",
      projectedReturn: 10 * totalPortfolioBeta,
      impactLevel: 'MEDIUM'
    }
  ];

  return {
    portfolioBeta: Number(totalPortfolioBeta.toFixed(2)),
    correlationAlerts: alerts,
    scenarios,
    volatilityAnnualized: Number((portfolioVolAnnual * 100).toFixed(2)),
    correlationMatrix: {
      tickers: activeTickers,
      matrix
    }
  };
}

// Math Helpers
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
  }
  return returns;
}

function calculateVariance(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
}

function calculateCovariance(data1: number[], data2: number[]): number {
  const minLen = Math.min(data1.length, data2.length);
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

function calculateCorrelation(data1: number[], data2: number[]): number {
  const minLen = Math.min(data1.length, data2.length);
  const d1 = data1.slice(-minLen);
  const d2 = data2.slice(-minLen);
  
  const cov = calculateCovariance(d1, d2);
  const var1 = calculateVariance(d1);
  const var2 = calculateVariance(d2);
  
  if (var1 === 0 || var2 === 0) return 0;
  return cov / (Math.sqrt(var1) * Math.sqrt(var2));
}
