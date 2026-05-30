import { 
  calculateArithmeticReturns as calculateReturns, 
  calculateVariance, 
  calculateCovariance, 
  calculateCorrelation, 
  calculateBeta,
  calculateJensensAlpha
} from "./math";
import { RegimeDetector } from "./regime";
import type { MarketPulseData } from "./market-pulse";
import type { MultiHorizonPrediction } from "./inference";

export interface HorizonConflict {
  ticker: string;
  type: 'BULLISH_TRAP' | 'BEARISH_TRAP' | 'TACTICAL_DIP' | 'TACTICAL_SPIKE';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

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
  jensensAlpha: number; // Risk-adjusted outperformance
  regimeAlignment: number; // 0-100 indicating how well the portfolio fits the current macro regime
  regimeLabel: string;
  horizonConflicts: HorizonConflict[];
  systemWarnings?: string[];
}

/**
 * STRATEGIC RISK ENGINE (Synchronous Math Processor)
 * Calculates portfolio metrics given pre-fetched history and macro indicators.
 * Client-safe (no node/server/database dependencies).
 */
export function calculatePortfolioRiskSync(
  positions: { ticker: string; weight: number; multiHorizonPrediction?: MultiHorizonPrediction; currentPrice?: number }[],
  historyData: { ticker: string; history: { close: number; time: number }[] }[],
  pulse: MarketPulseData | null
): RiskIntelligence {
  if (positions.length === 0) {
    return { 
      portfolioBeta: 0, 
      correlationAlerts: [], 
      scenarios: [], 
      volatilityAnnualized: 0,
      var95: 0,
      jensensAlpha: 0,
      regimeAlignment: 50,
      regimeLabel: "N/A",
      correlationMatrix: { tickers: [], matrix: [] },
      horizonConflicts: [],
      systemWarnings: []
    };
  }

  // 1. Extract SPY history
  const spyHistory = historyData.find(h => h.ticker === "SPY")?.history || [];
  if (spyHistory.length < 252) {
     return { 
       portfolioBeta: 1, 
       correlationAlerts: [], 
       scenarios: [], 
       volatilityAnnualized: 0,
       var95: 0,
       jensensAlpha: 0,
       regimeAlignment: 50,
       regimeLabel: "Insufficient History",
       correlationMatrix: { tickers: positions.map(p => p.ticker), matrix: [] },
       horizonConflicts: [],
       systemWarnings: []
    };
  }

  const spyReturns = calculateReturns(spyHistory.map(h => h.close));
  const spyVariance = calculateVariance(spyReturns);

  // 2. Calculate Individual Betas and Aggregate
  let totalPortfolioBeta = 0;
  const assetReturnsMap: Record<string, number[]> = {};
  const alerts: string[] = [];

  positions.forEach(pos => {
    const assetHist = historyData.find(h => h.ticker === pos.ticker)?.history || [];
    if (assetHist.length < 252) {
      alerts.push(`Insufficient History: ${pos.ticker} has < 1Y data. Beta defaulted to 1.0.`);
      totalPortfolioBeta += pos.weight * 1; // Default to market beta if data is missing
      return;
    }

    const assetReturns = calculateReturns(assetHist.map(h => h.close));
    assetReturnsMap[pos.ticker] = assetReturns;

    const beta = calculateBeta(assetReturns, spyReturns);
    totalPortfolioBeta += pos.weight * beta;
  });

  // 3. Horizon Conflict Detection (Strategic Multi-Resolution Review)
  const horizonConflicts: HorizonConflict[] = [];
  positions.forEach(pos => {
    const pred = (pos as any).multiHorizonPrediction as MultiHorizonPrediction;
    if (!pred) return;

    const shortTerm = (pred["4H"].p50 + pred["1D"].p50) / 2;
    const longTerm = (pred["1W"].p50 + pred["1M"].p50) / 2;
    const currentPrice = (pos as any).currentPrice || pred["1D"].p10 / 0.95; // Heuristic fallback

    const stChange = (shortTerm - currentPrice) / currentPrice;
    const ltChange = (longTerm - currentPrice) / currentPrice;

    if (stChange > 0.005 && ltChange < -0.01) {
      horizonConflicts.push({
        ticker: pos.ticker,
        type: 'BEARISH_TRAP',
        description: `Tactical breakout (Short-term) into structural decline (Long-term). Risk of rejection at higher timeframes.`,
        severity: 'HIGH'
      });
    } else if (stChange < -0.005 && ltChange > 0.01) {
      horizonConflicts.push({
        ticker: pos.ticker,
        type: 'TACTICAL_DIP',
        description: `Short-term weakness detected within a structural accumulation phase. Potential entry/add opportunity.`,
        severity: 'MEDIUM'
      });
    }
  });

  // 4. Concentration Guard (Hidden Correlation) & Global Matrix
  const activeTickers = positions.map(p => p.ticker);
  const matrix: number[][] = Array(activeTickers.length).fill(0).map(() => Array(activeTickers.length).fill(1));
  
  // PRE-CALCULATE VARIANCES TO PREVENT O(N^2) REDUNDANT CALLS
  const variancesMap: Record<string, number> = {};
  for (const t of activeTickers) {
    if (assetReturnsMap[t]) {
      variancesMap[t] = calculateVariance(assetReturnsMap[t]);
    }
  }

  for (let i = 0; i < activeTickers.length; i++) {
    for (let j = i + 1; j < activeTickers.length; j++) {
      const t1 = activeTickers[i];
      const t2 = activeTickers[j];
      const r1 = assetReturnsMap[t1];
      const r2 = assetReturnsMap[t2];
      
      if (r1 && r2 && variancesMap[t1] > 1e-12 && variancesMap[t2] > 1e-12) {
        const cov = calculateCovariance(r1, r2);
        const corr = cov / (Math.sqrt(variancesMap[t1]) * Math.sqrt(variancesMap[t2]));
        const fixedCorr = Number(corr.toFixed(4));
        
        matrix[i][j] = fixedCorr;
        matrix[j][i] = fixedCorr;
        
        if (corr > 0.85) {
          alerts.push(`High Correlation: ${t1} & ${t2} (${Math.round(corr * 100)}%). They move in lockstep, increasing hidden risk.`);
        }
      } else {
        matrix[i][j] = 0;
        matrix[j][i] = 0;
      }
    }
  }

  // 5. Calculate Portfolio Daily Returns & Volatility (Time-Synced)
  const portfolioDailyReturns: number[] = [];
  
  // PERFORMANCE FIX: Pre-compute maps for O(1) lookups instead of O(N^2) Array.find
  const assetHistoryMaps: Record<string, Map<number, number>> = {};
  positions.forEach(pos => {
    const assetHist = historyData.find(h => h.ticker === pos.ticker)?.history || [];
    const map = new Map<number, number>();
    assetHist.forEach(h => map.set(h.time, h.close));
    assetHistoryMaps[pos.ticker] = map;
  });

  // Use SPY as the time master
  spyHistory.slice(1).forEach((bar, i) => {
    const t = bar.time;
    const prevT = spyHistory[i].time;
    let dayRet = 0;
    let activeWeight = 0;

    positions.forEach(pos => {
      const map = assetHistoryMaps[pos.ticker];
      const matchClose = map.get(t);
      const prevMatchClose = map.get(prevT);

      // Guard: Ensure prevMatchClose is defined and strictly greater than 0
      if (matchClose !== undefined && prevMatchClose !== undefined && prevMatchClose > 0) {
         const ret = (matchClose - prevMatchClose) / prevMatchClose;
         dayRet += ret * pos.weight;
         activeWeight += pos.weight;
      }
    });

    if (activeWeight > 0) {
      portfolioDailyReturns.push(dayRet / activeWeight);
    } else {
      portfolioDailyReturns.push(0);
    }
  });

  const portfolioVariance = calculateVariance(portfolioDailyReturns);
  const portfolioVolAnnual = Math.sqrt(Math.max(0, portfolioVariance)) * Math.sqrt(252);

  // 6. Macro Regime Analysis (Surgical Integration)
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
        regimeAlignment = totalPortfolioBeta > 1.1 ? 85 : (totalPortfolioBeta < 0.8 ? 40 : 65);
      } else {
        regimeAlignment = totalPortfolioBeta < 0.8 ? 80 : (totalPortfolioBeta > 1.2 ? 20 : 45);
      }
      regimeLabel = `${mktTrend} Trend (${mktRegime.regime})`;
    } else if (mktRegime.regime === "MEAN_REVERSION") {
      regimeAlignment = totalPortfolioBeta < 0.9 ? 80 : (totalPortfolioBeta > 1.2 ? 25 : 55);
      regimeLabel = `Mean Reversion (${mktRegime.regime})`;
    } else {
      regimeAlignment = totalPortfolioBeta > 0.9 && totalPortfolioBeta < 1.1 ? 75 : 50;
      regimeLabel = "Random Walk / Noise";
    }

    // Impact of Yields (US10Y)
    if (pulse.macro?.us10y?.change > 2 && totalPortfolioBeta > 1.2) {
      alerts.push("Yield Surge: High-Beta portfolio is extremely sensitive to rising rates. Expect valuation compression.");
      regimeAlignment -= 15;
    }
  }

  // 7. Value at Risk (VaR) 95% - Institutional Confidence
  const var95 = 1.645 * Math.sqrt(portfolioVariance);
  
  // 7.5 Calculate Jensen's Alpha for the Portfolio
  const syntheticHistory = [{ close: 100 }];
  portfolioDailyReturns.forEach((ret, i) => {
    syntheticHistory.push({ close: syntheticHistory[i].close * (1 + ret) });
  });

  const jensensAlpha = calculateJensensAlpha(syntheticHistory, spyHistory, totalPortfolioBeta);

  // 8. Dynamic Stress Scenarios (Advanced Calibration)
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
    jensensAlpha: Number((jensensAlpha * 100).toFixed(2)),
    correlationMatrix: {
      tickers: activeTickers,
      matrix
    },
    regimeAlignment: Math.max(0, Math.min(100, regimeAlignment)),
    regimeLabel,
    horizonConflicts,
    systemWarnings: []
  };
}
