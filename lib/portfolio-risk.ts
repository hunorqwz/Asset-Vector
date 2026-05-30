import { fetchHistoryWithInterval } from "./market-data";
import { fetchMarketPulse } from "./market-pulse";
import { 
  calculatePortfolioRiskSync,
  HorizonConflict,
  ScenarioResult,
  CorrelationMatrix,
  RiskIntelligence
} from "./portfolio-risk-calc";

export type {
  HorizonConflict,
  ScenarioResult,
  CorrelationMatrix,
  RiskIntelligence
};

export { calculatePortfolioRiskSync };

/**
 * STRATEGIC RISK ENGINE
 * calculates Portfolio Beta, Correlation Synchronicity, and Stress Scenarios asynchronously.
 * Kept for server action fallback and test compatibility.
 */
export async function computePortfolioRisk(positions: { ticker: string; weight: number }[]): Promise<RiskIntelligence> {
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

  // Fetch 1Y History for all assets + SPY Benchmark
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

  const pulse = await fetchMarketPulse().catch(() => null);

  return calculatePortfolioRiskSync(positions, historyData, pulse);
}
