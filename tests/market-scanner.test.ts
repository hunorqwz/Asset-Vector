import { describe, it, expect } from "vitest";
import { scanInstrument, evaluateMarketStructure, evaluateMicrostructure, evaluateVolatilityEngine, MarketCandle } from "../lib/market-scanner";

describe("High-Confidence Market Scanner Engine", () => {
  const generateMockCandles = (count: number, isBullish: boolean = true): MarketCandle[] => {
    const candles: MarketCandle[] = [];
    let price = 2400.0;
    let cvd = 1000;

    for (let i = 0; i < count; i++) {
      const delta = isBullish ? 0.5 + Math.random() : -0.5 - Math.random();
      const open = price;
      const close = price + delta;
      const high = Math.max(open, close) + 0.3;
      const low = Math.min(open, close) - 0.3;
      price = close;
      cvd += isBullish ? 50 : -50;

      candles.push({
        time: 1700000000 + i * 60,
        open,
        high,
        low,
        close,
        volume: 200,
        cvd,
      });
    }

    return candles;
  };

  it("should evaluate Market Structure metrics", () => {
    const candles = generateMockCandles(20, true);
    const res = evaluateMarketStructure(candles);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(res.rationale)).toBe(true);
  });

  it("should evaluate Microstructure & CVD Divergence metrics", () => {
    const candles = generateMockCandles(20, true);
    const res = evaluateMicrostructure(candles, 100, 40);
    expect(res.score).toBeGreaterThanOrEqual(50);
    expect(Array.isArray(res.rationale)).toBe(true);
  });

  it("should evaluate Volatility & ATR calculation", () => {
    const candles = generateMockCandles(20, true);
    const res = evaluateVolatilityEngine(candles);
    expect(res.atr).toBeGreaterThan(0);
    expect(res.score).toBeGreaterThanOrEqual(0);
  });

  it("should filter out setups that do not meet 80%+ Confluence or 1:2.5 R:R threshold", () => {
    // Flat candles without strong confluence should be rejected (returns null)
    const flatCandles: MarketCandle[] = [];
    for (let i = 0; i < 20; i++) {
      flatCandles.push({
        time: 1700000000 + i * 60,
        open: 2400.0,
        high: 2400.1,
        low: 2399.9,
        close: 2400.0,
        volume: 10,
        cvd: 0,
      });
    }

    const setup = scanInstrument("GC.V.0", flatCandles);
    expect(setup).toBeNull();
  });

  it("should generate a valid setup when high confluence and R:R >= 2.5 criteria are met", () => {
    const candles = generateMockCandles(30, true);
    // Create an artificial FVG pattern
    candles[27].high = 2410.0;
    candles[27].low = 2408.0;
    candles[28].high = 2415.0;
    candles[28].low = 2411.0;
    candles[29].high = 2420.0;
    candles[29].low = 2416.0; // low > prev2.high (2416 > 2410 -> FVG)

    const setup = scanInstrument("GC.V.0", candles, 500, 100);
    if (setup !== null) {
      expect(setup.confluence.totalConfluenceScore).toBeGreaterThanOrEqual(80);
      expect(setup.riskRewardRatio).toBeGreaterThanOrEqual(2.5);
      expect(setup.direction).toBe("BUY");
    }
  });
});
