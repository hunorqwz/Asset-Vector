import { fetchHistoryWithInterval } from "./market-data";
import { 
  calculateArithmeticReturns as calculateReturns, 
  calculateVariance, 
  calculateCovariance, 
  calculateCorrelation, 
  calculateBeta 
} from "./math";
import { fetchMarketPulse, MarketPulseData } from "./market-pulse";
import { RegimeDetector } from "./regime";

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
  var95: number; // 95% Confidence Value at Risk (Daily)
  regimeAlignment: number; // 0-100 indicating how well the portfolio fits the current macro regime
  regimeLabel: string;
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
      var95: 0,
      regimeAlignment: 50,
      regimeLabel: "N/A",
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
  if (spyHistory.length < 252) {
     return { 
       portfolioBeta: 1, 
       correlationAlerts: [], 
       scenarios: [], 
       volatilityAnnualized: 0,
       var95: 0,
       regimeAlignment: 50,
       regimeLabel: "Insufficient History",
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
    if (assetHist.length < 252) {
      totalPortfolioBeta += pos.weight * 1; // Default to market beta if data is missing
      return;
    }

    const assetReturns = calculateReturns(assetHist.map(h => h.close));
    assetReturnsMap[pos.ticker] = assetReturns;

    const beta = calculateBeta(assetReturns, spyReturns);
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

  // 4. Calculate Portfolio Daily Returns & Volatility (Time-Synced)
  const portfolioDailyReturns: number[] = [];
  
  // Use SPY as the time master
  spyHistory.slice(1).forEach((bar, i) => {
    const t = bar.time;
    let dayRet = 0;
    let activeWeight = 0;

    positions.forEach(pos => {
      const assetHist = historyData.find(h => h.ticker === pos.ticker)?.history || [];
      const match = assetHist.find(h => h.time === t);
      const prevMatch = assetHist.find(h => h.time === spyHistory[i].time); // i is index of previous bar

      if (match && prevMatch) {
         const ret = (match.close - prevMatch.close) / prevMatch.close;
         dayRet += ret * pos.weight;
         activeWeight += pos.weight;
      }
    });

    // If we only have data for 50% of the portfolio, re-scale the return to 100%
    if (activeWeight > 0) {
      portfolioDailyReturns.push(dayRet / activeWeight);
    }
  });

  const portfolioVariance = calculateVariance(portfolioDailyReturns);
  const portfolioVolAnnual = Math.sqrt(portfolioVariance) * Math.sqrt(252);

  // 5. Macro Regime Analysis (Surgical Integration)
  const pulse = await fetchMarketPulse().catch(() => null);
  let regimeAlignment = 50;
  let regimeLabel = "Neutral / Transition";

  if (pulse) {
    const spyPrices = spyHistory.map(h => h.close);
    const mktRegime = RegimeDetector.detect(spyPrices);
    
    // Detect Market Trend Direction
    const lastPrice = spyPrices[spyPrices.length - 1];
    const prevPrice = spyPrices[spyPrices.length - 21]; // 1 month ago
    const mktTrend = lastPrice > prevPrice ? 'BULLISH' : 'BEARISH';

    if (mktRegime.regime === "MOMENTUM") {
      if (mktTrend === 'BULLISH') {
        // Bullish Momentum: High Beta is aligned
        regimeAlignment = totalPortfolioBeta > 1.1 ? 85 : (totalPortfolioBeta < 0.8 ? 40 : 65);
      } else {
        // Bearish Momentum: Low/Inverse Beta is aligned
        regimeAlignment = totalPortfolioBeta < 0.8 ? 80 : (totalPortfolioBeta > 1.2 ? 20 : 45);
      }
      regimeLabel = `${mktTrend} Trend (${mktRegime.regime})`;
    } else if (mktRegime.regime === "MEAN_REVERSION") {
      // Mean Reversion: Rewards low-beta and tactical diversification
      regimeAlignment = totalPortfolioBeta < 0.9 ? 80 : (totalPortfolioBeta > 1.2 ? 25 : 55);
      regimeLabel = `Mean Reversion (${mktRegime.regime})`;
    } else {
      regimeAlignment = totalPortfolioBeta > 0.9 && totalPortfolioBeta < 1.1 ? 75 : 50;
      regimeLabel = "Random Walk / Noise";
    }

    // Impact of Yields (US10Y)
    if (pulse.macro.us10y.change > 2 && totalPortfolioBeta > 1.2) {
      alerts.push("Yield Surge: High-Beta portfolio is extremely sensitive to rising rates. Expect valuation compression.");
      regimeAlignment -= 15;
    }
  }

  // 6. Value at Risk (VaR) 95% - Institutional Confidence
  const var95 = 1.645 * Math.sqrt(portfolioVariance);

  // 7. Dynamic Stress Scenarios (Advanced Calibration)
  const scenarios: ScenarioResult[] = [
    {
      name: "Global De-risking",
      description: "Yield curve inversion triggers 7% S&P 500 liquidation.",
      projectedReturn: -7 * totalPortfolioBeta,
      impactLevel: (Math.abs(-7 * totalPortfolioBeta) > 10) ? 'HIGH' : 'MEDIUM'
    },
    {
      name: "Short Squeeze / Relief",
      description: "Oversold bounce + Dovish Pivot rallies market 5%.",
      projectedReturn: 5 * totalPortfolioBeta,
      impactLevel: 'LOW'
    },
    {
      name: "Black Swan (Fat Tail)",
      description: "Tail risk event: VIX spikes to 40+, Market -15%.",
      projectedReturn: -15 * totalPortfolioBeta,
      impactLevel: 'HIGH'
    }
  ];

  return {
    portfolioBeta: Number(totalPortfolioBeta.toFixed(2)),
    correlationAlerts: alerts,
    scenarios,
    volatilityAnnualized: Number((portfolioVolAnnual * 100).toFixed(2)),
    var95: Number((var95 * 100).toFixed(2)),
    correlationMatrix: {
      tickers: activeTickers,
      matrix
    },
    regimeAlignment: Math.max(0, Math.min(100, regimeAlignment)),
    regimeLabel
  };
}
