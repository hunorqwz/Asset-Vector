import { MarketCandle } from "@/lib/market-scanner";

export interface SentinelPosition {
  id: string;
  ticker: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  currentStopLoss: number;
  currentTakeProfit: number;
  size: number;
  openedAt: Date;
}

export type SentinelRecommendationType = "TP_EXTENSION" | "PARTIAL_PROFIT_50" | "TRAILING_STOP" | "HOLD";

export interface SentinelRecommendation {
  positionId: string;
  ticker: string;
  type: SentinelRecommendationType;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  closePercentage?: number;
  confidence: number;
  headline: string;
  rationale: string;
  timestamp: Date;
}

/**
 * Calculates 14-period ATR for dynamic price offsets
 */

function calculateATR(candles: MarketCandle[], period: number = 14): number {
  if (candles.length < period) return 1.0;
  let trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

/**
 * Evaluates an active open position against live order flow and stream candles.
 */
export function evaluatePositionSentinel(
  position: SentinelPosition,
  recentCandles: MarketCandle[],
  bidSize: number = 0,
  askSize: number = 0
): SentinelRecommendation {
  if (recentCandles.length < 5) {
    return {
      positionId: position.id,
      ticker: position.ticker,
      type: "HOLD",
      confidence: 50,
      headline: "Monitoring Position",
      rationale: "Gathering initial stream candles for trade evaluation.",
      timestamp: new Date(),
    };
  }

  const currentPrice = recentCandles[recentCandles.length - 1].close;
  const atr = calculateATR(recentCandles);
  const isBuy = position.direction === "BUY";

  // Compute CVD Delta over recent window
  const firstCandle = recentCandles[0];
  const lastCandle = recentCandles[recentCandles.length - 1];
  const cvdDelta = (lastCandle.cvd || 0) - (firstCandle.cvd || 0);

  // Compute price move from entry
  const priceMove = isBuy ? currentPrice - position.entryPrice : position.entryPrice - currentPrice;
  const inProfit = priceMove > 0;

  // 1. SCENARIO A: PROFIT MAXIMIZATION (Momentum Expansion Surge)
  // If trade is in profit and CVD is surging strongly in trade direction (+200% delta)
  const isCvdSurging = isBuy ? cvdDelta > 300 : cvdDelta < -300;

  if (inProfit && isCvdSurging) {
    const isGold = position.ticker.toUpperCase().includes("GC");
    const offset = Math.max(atr * 1.5, isGold ? 4.0 : 0.0015);

    const newTp = isBuy
      ? Math.max(position.currentTakeProfit + offset, currentPrice + offset)
      : Math.min(position.currentTakeProfit - offset, currentPrice - offset);

    // Trail Stop Loss to Breakeven if not already past breakeven
    const newSl = isBuy
      ? Math.max(position.currentStopLoss, position.entryPrice)
      : Math.min(position.currentStopLoss, position.entryPrice);

    return {
      positionId: position.id,
      ticker: position.ticker,
      type: "TP_EXTENSION",
      suggestedStopLoss: parseFloat(newSl.toFixed(isGold ? 1 : 4)),
      suggestedTakeProfit: parseFloat(newTp.toFixed(isGold ? 1 : 4)),
      confidence: 90,
      headline: "High Momentum Surge Detected",
      rationale: `CVD buying/selling delta expanded significantly (+${Math.abs(cvdDelta)} contracts). Recommended: Extend Take-Profit and move Stop-Loss to Breakeven.`,
      timestamp: new Date(),
    };
  }

  // 2. SCENARIO B: CAPITAL PROTECTION (Order Flow Friction / Opposing Depth Queue)
  // If trade is in profit or near target, but opposing Level 2 queue or opposing CVD absorption occurs
  const isOpposingCvd = isBuy ? cvdDelta < -200 : cvdDelta > 200;
  const isOpposingQueue = isBuy ? (askSize > 0 && askSize >= bidSize * 3) : (bidSize > 0 && bidSize >= askSize * 3);

  if (inProfit && (isOpposingCvd || isOpposingQueue)) {
    const isGold = position.ticker.toUpperCase().includes("GC");
    const tightSl = isBuy ? currentPrice - (atr * 0.5) : currentPrice + (atr * 0.5);

    return {
      positionId: position.id,
      ticker: position.ticker,
      type: "PARTIAL_PROFIT_50",
      closePercentage: 50,
      suggestedStopLoss: parseFloat(tightSl.toFixed(isGold ? 1 : 4)),
      confidence: 85,
      headline: "Order Flow Absorption / Friction Detected",
      rationale: `Opposing order book depth queue or CVD absorption detected against position. Recommended: Lock in 50% partial profit and tighten Stop-Loss.`,
      timestamp: new Date(),
    };
  }

  // Default: Hold & Monitor
  return {
    positionId: position.id,
    ticker: position.ticker,
    type: "HOLD",
    confidence: 60,
    headline: "Position Progressing Normally",
    rationale: "Order flow telemetry and price action remain within standard volatility envelope.",
    timestamp: new Date(),
  };
}
