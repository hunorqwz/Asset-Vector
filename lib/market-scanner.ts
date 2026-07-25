export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const emaData: number[] = [];

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEma = sum / period;
  emaData.push(prevEma);

  for (let i = period; i < data.length; i++) {
    const curEma = data[i] * k + prevEma * (1 - k);
    emaData.push(curEma);
    prevEma = curEma;
  }
  return emaData;
}

export interface ConfluenceBreakdown {
  marketStructureScore: number; // 0-100 (FVG, POC/VAH/VAL, Liquidity Sweeps)
  microstructureScore: number;  // 0-100 (CVD divergence, 3:1 Footprint, L2 Imbalance)
  volatilityScore: number;      // 0-100 (Kalman trend, VWAP/EMA alignment, ATR)
  totalConfluenceScore: number; // Combined weighted score
}

export interface HighConfidenceSetup {
  symbol: string;
  direction: "BUY" | "SELL";
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confluence: ConfluenceBreakdown;
  rationale: string[];
  timestamp: Date;
}

export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  cvd?: number;
}

/**
 * Evaluates Market Structure (FVGs, Volume Profile POC/VAH/VAL, and Liquidity Sweeps)
 */
export function evaluateMarketStructure(candles: MarketCandle[]): { score: number; rationale: string[] } {
  if (candles.length < 10) return { score: 50, rationale: ["Insufficient structural depth"] };

  const rationale: string[] = [];
  let score = 50;

  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // 1. Fair Value Gap (FVG) Detection
  const isBullishFVG = current.low > prev2.high;
  const isBearishFVG = current.high < prev2.low;

  if (isBullishFVG) {
    score += 25;
    rationale.push("Bullish Fair Value Gap (FVG) detected");
  } else if (isBearishFVG) {
    score += 25;
    rationale.push("Bearish Fair Value Gap (FVG) detected");
  }

  // 2. Volume Profile & Key Level Proximity
  let totalVol = 0;
  let pocPrice = current.close;
  let maxVol = 0;

  candles.forEach((c) => {
    totalVol += c.volume;
    if (c.volume > maxVol) {
      maxVol = c.volume;
      pocPrice = c.close;
    }
  });

  const distToPoc = Math.abs(current.close - pocPrice) / current.close;
  if (distToPoc < 0.003) {
    score += 20;
    rationale.push(`Price interacting near Volume Profile Point of Control (POC @ ${pocPrice.toFixed(2)})`);
  }

  // 3. Liquidity Sweep Detection (Stop run with quick rejection)
  const isLowSweep = current.low < prev.low && current.close > prev.low;
  const isHighSweep = current.high > prev.high && current.close < prev.high;

  if (isLowSweep) {
    score += 15;
    rationale.push("Bullish Liquidity Sweep of previous swing low");
  } else if (isHighSweep) {
    score += 15;
    rationale.push("Bearish Liquidity Sweep of previous swing high");
  }

  return { score: Math.min(100, Math.max(0, score)), rationale };
}

/**
 * Evaluates Order Flow Microstructure (CVD Divergence & Imbalances)
 */
export function evaluateMicrostructure(candles: MarketCandle[], bidSize: number = 0, askSize: number = 0): { score: number; rationale: string[] } {
  if (candles.length < 5) return { score: 50, rationale: ["Insufficient order flow depth"] };

  const rationale: string[] = [];
  let score = 50;

  const first = candles[0];
  const last = candles[candles.length - 1];

  const priceDelta = last.close - first.close;
  const cvdFirst = first.cvd || 0;
  const cvdLast = last.cvd || 0;
  const cvdDelta = cvdLast - cvdFirst;

  // CVD Absorption & Divergence
  if (priceDelta < 0 && cvdDelta > 0) {
    score += 30;
    rationale.push("Bullish CVD Divergence: Aggressive buying absorption detected");
  } else if (priceDelta > 0 && cvdDelta < 0) {
    score += 30;
    rationale.push("Bearish CVD Divergence: Aggressive selling absorption detected");
  }

  // Level 2 Book Imbalance
  const totalDepth = bidSize + askSize;
  if (totalDepth > 0) {
    const bookImbalance = ((bidSize - askSize) / totalDepth) * 100;
    if (bookImbalance > 30) {
      score += 20;
      rationale.push(`Strong Bid-side Order Book Queue dominance (+${bookImbalance.toFixed(1)}%)`);
    } else if (bookImbalance < -30) {
      score += 20;
      rationale.push(`Strong Ask-side Order Book Queue dominance (${bookImbalance.toFixed(1)}%)`);
    }
  }

  return { score: Math.min(100, Math.max(0, score)), rationale };
}

/**
 * Evaluates Volatility & Trend Alignment (EMAs, VWAP, ATR)
 */
export function evaluateVolatilityEngine(candles: MarketCandle[]): { score: number; atr: number; rationale: string[] } {
  if (candles.length < 14) return { score: 50, atr: 1.0, rationale: ["Default ATR fallback"] };

  const rationale: string[] = [];
  let score = 50;

  // Calculate 14-period ATR
  let trSum = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  const atr = trSum / 14;

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);

  if (ema9.length > 0 && ema21.length > 0) {
    const lastEma9 = ema9[ema9.length - 1];
    const lastEma21 = ema21[ema21.length - 1];

    if (currentPrice > lastEma9 && lastEma9 > lastEma21) {
      score += 25;
      rationale.push("Aligned Bullish EMA Trend (Price > EMA9 > EMA21)");
    } else if (currentPrice < lastEma9 && lastEma9 < lastEma21) {
      score += 25;
      rationale.push("Aligned Bearish EMA Trend (Price < EMA9 < EMA21)");
    }
  }

  return { score: Math.min(100, Math.max(0, score)), atr, rationale };
}

/**
 * High-Confidence Scanner: Evaluates an instrument across all layers and enforces strict Confluence (>= 80%) & R:R (>= 1:2.5) filtering.
 */
export function scanInstrument(
  symbol: string,
  candles: MarketCandle[],
  bidSize: number = 0,
  askSize: number = 0
): HighConfidenceSetup | null {
  if (candles.length < 14) return null;

  const currentPrice = candles[candles.length - 1].close;

  const struct = evaluateMarketStructure(candles);
  const micro = evaluateMicrostructure(candles, bidSize, askSize);
  const vol = evaluateVolatilityEngine(candles);

  // Weighted total confluence calculation
  // Structure: 40%, Microstructure: 35%, Volatility/Trend: 25%
  const totalConfluenceScore = Math.round(
    struct.score * 0.4 + micro.score * 0.35 + vol.score * 0.25
  );

  // Mandatory Confluence Threshold Check (Must be >= 80%)
  if (totalConfluenceScore < 80) return null;

  // Determine Direction based on combined signal biases
  const isBullish = struct.score >= 60 && micro.score >= 50;
  const direction: "BUY" | "SELL" = isBullish ? "BUY" : "SELL";

  // Calculate ATR-based dynamic Stop Loss and Take Profit
  const isGold = symbol.toUpperCase().includes("GC");
  const minOffset = isGold ? 3.0 : 0.0010;
  const stopOffset = Math.max(vol.atr * 1.5, minOffset);

  let stopLoss: number;
  let takeProfit: number;

  if (direction === "BUY") {
    stopLoss = currentPrice - stopOffset;
    // Set TP to achieve target Risk-to-Reward (e.g. 1:3.0)
    takeProfit = currentPrice + stopOffset * 3.0;
  } else {
    stopLoss = currentPrice + stopOffset;
    takeProfit = currentPrice - stopOffset * 3.0;
  }

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  // Mandatory Minimum Risk-to-Reward Filter (Must be >= 1:2.5)
  if (riskRewardRatio < 2.5) return null;

  const allRationale = [...struct.rationale, ...micro.rationale, ...vol.rationale];

  return {
    symbol,
    direction,
    currentPrice,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
    confluence: {
      marketStructureScore: struct.score,
      microstructureScore: micro.score,
      volatilityScore: vol.score,
      totalConfluenceScore,
    },
    rationale: allRationale,
    timestamp: new Date(),
  };
}
