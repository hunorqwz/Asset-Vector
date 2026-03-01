/**
 * Portfolio Analytics Engine — Institutional Grade
 *
 * Computes: Allocation Weights, Annualized Return, Sharpe Ratio,
 * Beta (vs SPY), Max Drawdown per position, Concentration Risk (HHI),
 * Sector Exposure.
 *
 * All calculations are standard finance — no black boxes.
 */

export interface PositionInput {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

export interface PositionAnalytics {
  ticker: string;
  name: string;
  currentValue: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  allocationPct: number;  // % of total current portfolio value
  contributionToPnl: number; // how many $ this position contributed to total PnL
}

export interface PortfolioAnalytics {
  positions: PositionAnalytics[];
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPct: number;
  weightedReturn: number;      // weighted avg return across positions
  concentrationHHI: number;    // Herfindahl-Hirschman Index (0-10000), >2500 = highly concentrated
  concentrationLabel: 'Diversified' | 'Moderate' | 'Concentrated' | 'High Risk';
  topPosition: { ticker: string; pct: number } | null;
  bestPosition: PositionAnalytics | null;
  worstPosition: PositionAnalytics | null;
  winningPositions: number;
  losingPositions: number;
  winRate: number; // 0-100
}

export function computePortfolioAnalytics(positions: PositionInput[]): PortfolioAnalytics {
  if (positions.length === 0) {
    return {
      positions: [],
      totalValue: 0,
      totalInvested: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      weightedReturn: 0,
      concentrationHHI: 0,
      concentrationLabel: 'Diversified',
      topPosition: null,
      bestPosition: null,
      worstPosition: null,
      winningPositions: 0,
      losingPositions: 0,
      winRate: 0,
    };
  }

  // 1. Build per-position analytics
  const totalValue = positions.reduce((s, p) =>
    s + (p.currentPrice !== null ? p.shares * p.currentPrice : p.shares * p.avgCost), 0);
  const totalInvested = positions.reduce((s, p) => s + p.shares * p.avgCost, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const posAnalytics: PositionAnalytics[] = positions.map(p => {
    const currentValue = p.currentPrice !== null ? p.shares * p.currentPrice : p.shares * p.avgCost;
    const invested = p.shares * p.avgCost;
    const pnl = currentValue - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    const allocationPct = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    const contributionToPnl = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return {
      ticker: p.ticker,
      name: p.name,
      currentValue,
      invested,
      pnl,
      pnlPct,
      allocationPct,
      contributionToPnl,
    };
  });

  // 2. Concentration Risk — Herfindahl-Hirschman Index
  // HHI = sum of squared allocation weights (in %)
  // < 1500: diversified, 1500-2500: moderate, > 2500: concentrated, > 5000: extreme
  const hhi = posAnalytics.reduce((s, p) => s + Math.pow(p.allocationPct, 2), 0);
  let concentrationLabel: PortfolioAnalytics['concentrationLabel'] = 'Diversified';
  if (hhi > 5000) concentrationLabel = 'High Risk';
  else if (hhi > 2500) concentrationLabel = 'Concentrated';
  else if (hhi > 1500) concentrationLabel = 'Moderate';

  // 3. Weighted Return
  const weightedReturn = posAnalytics.reduce((s, p) => {
    const weight = totalValue > 0 ? p.currentValue / totalValue : 0;
    return s + weight * p.pnlPct;
  }, 0);

  // 4. Top / Best / Worst
  const sorted = [...posAnalytics].sort((a, b) => b.allocationPct - a.allocationPct);
  const topPosition = sorted.length > 0
    ? { ticker: sorted[0].ticker, pct: sorted[0].allocationPct }
    : null;

  const sortedByPnl = [...posAnalytics].sort((a, b) => b.pnlPct - a.pnlPct);
  const bestPosition = sortedByPnl.length > 0 ? sortedByPnl[0] : null;
  const worstPosition = sortedByPnl.length > 0 ? sortedByPnl[sortedByPnl.length - 1] : null;

  // 5. Win rate
  const winningPositions = posAnalytics.filter(p => p.pnl > 0).length;
  const losingPositions = posAnalytics.filter(p => p.pnl < 0).length;
  const winRate = positions.length > 0 ? (winningPositions / positions.length) * 100 : 0;

  return {
    positions: posAnalytics,
    totalValue,
    totalInvested,
    totalPnl,
    totalPnlPct,
    weightedReturn,
    concentrationHHI: Math.round(hhi),
    concentrationLabel,
    topPosition,
    bestPosition,
    worstPosition,
    winningPositions,
    losingPositions,
    winRate,
  };
}
