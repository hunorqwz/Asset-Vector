import { describe, it, expect } from "vitest";
import { evaluatePositionSentinel, SentinelPosition } from "../lib/trade-sentinel";
import { MarketCandle } from "../lib/market-scanner";

describe("Dynamic In-Trade Sentinel Engine", () => {
  const mockPosition: SentinelPosition = {
    id: "pos-123",
    ticker: "GC.V.0",
    direction: "BUY",
    entryPrice: 2400.0,
    currentStopLoss: 2395.0,
    currentTakeProfit: 2415.0,
    size: 2,
    openedAt: new Date(),
  };

  const generateCandles = (startPrice: number, endPrice: number, cvdStart: number, cvdEnd: number): MarketCandle[] => {
    const candles: MarketCandle[] = [];
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const price = startPrice + ((endPrice - startPrice) / steps) * i;
      const cvd = cvdStart + ((cvdEnd - cvdStart) / steps) * i;
      candles.push({
        time: 1700000000 + i * 60,
        open: price,
        high: price + 1.0,
        low: price - 1.0,
        close: price + 0.5,
        volume: 200,
        cvd,
      });
    }
    return candles;
  };

  it("should return HOLD when trade is progressing normally within standard parameters", () => {
    const candles = generateCandles(2400.0, 2402.0, 1000, 1050);
    const rec = evaluatePositionSentinel(mockPosition, candles);

    expect(rec.type).toBe("HOLD");
    expect(rec.confidence).toBe(60);
  });

  it("should trigger TP_EXTENSION recommendation when strong momentum surge (+CVD delta) occurs", () => {
    // Price moves from 2400 -> 2410 with massive positive CVD delta (1000 -> 1500 = +500 delta)
    const candles = generateCandles(2400.0, 2410.0, 1000, 1500);
    const rec = evaluatePositionSentinel(mockPosition, candles);

    expect(rec.type).toBe("TP_EXTENSION");
    expect(rec.confidence).toBe(90);
    expect(rec.suggestedStopLoss).toBeGreaterThanOrEqual(2400.0); // Moved to Breakeven
    expect(rec.suggestedTakeProfit).toBeGreaterThan(mockPosition.currentTakeProfit);
  });

  it("should trigger PARTIAL_PROFIT_50 recommendation when opposing Level 2 depth queue appears", () => {
    const candles = generateCandles(2400.0, 2405.0, 1000, 1050);
    // Opposing ask queue is 4x bid size (e.g. 400 ask vs 50 bid)
    const rec = evaluatePositionSentinel(mockPosition, candles, 50, 400);

    expect(rec.type).toBe("PARTIAL_PROFIT_50");
    expect(rec.closePercentage).toBe(50);
    expect(rec.confidence).toBe(85);
    expect(rec.suggestedStopLoss).toBeDefined();
  });
});
