import { describe, it, expect } from "vitest";

function calculateL2DepthLevels(baseAskVal: number, baseBidVal: number, askSize: number, bidSize: number, tickStep: number) {
  const l2AskLevels = Array.from({ length: 5 }, (_, i) => {
    const p = baseAskVal + (4 - i) * tickStep;
    const s = Math.max(10, Math.round((askSize || 120) * (0.7 + (4 - i) * 0.15 + (Math.sin(p * 20) + 1) * 0.2)));
    return { price: parseFloat(p.toFixed(4)), size: s };
  });

  const l2BidLevels = Array.from({ length: 5 }, (_, i) => {
    const p = baseBidVal - i * tickStep;
    const s = Math.max(10, Math.round((bidSize || 140) * (0.7 + i * 0.15 + (Math.cos(p * 20) + 1) * 0.2)));
    return { price: parseFloat(p.toFixed(4)), size: s };
  });

  const spreadTicks = parseFloat(((baseAskVal - baseBidVal) / tickStep).toFixed(1));
  const midPrice = parseFloat(((baseAskVal + baseBidVal) / 2).toFixed(4));

  return { l2AskLevels, l2BidLevels, spreadTicks, midPrice };
}

describe("Level 2 (L2) Order Book Depth Ladder Engine", () => {
  it("should calculate correct 5-level Ask and Bid depth queues for Gold (GC.V.0)", () => {
    const ask = 2420.1;
    const bid = 2419.9;
    const tick = 0.1;

    const res = calculateL2DepthLevels(ask, bid, 100, 150, tick);

    expect(res.l2AskLevels.length).toBe(5);
    expect(res.l2BidLevels.length).toBe(5);
    expect(res.spreadTicks).toBe(2.0); // (2420.1 - 2419.9) / 0.1 = 2 ticks
    expect(res.midPrice).toBe(2420.0);

    // Lowest Ask level should equal base ask price (2420.1)
    expect(res.l2AskLevels[4].price).toBe(2420.1);
    // Highest Bid level should equal base bid price (2419.9)
    expect(res.l2BidLevels[0].price).toBe(2419.9);
  });

  it("should calculate correct 5-level Ask and Bid depth queues for Euro FX (6E.V.0)", () => {
    const ask = 1.0921;
    const bid = 1.0919;
    const tick = 0.0001;

    const res = calculateL2DepthLevels(ask, bid, 80, 110, tick);

    expect(res.l2AskLevels.length).toBe(5);
    expect(res.l2BidLevels.length).toBe(5);
    expect(res.spreadTicks).toBe(2.0); // (1.0921 - 1.0919) / 0.0001 = 2 ticks
    expect(res.midPrice).toBe(1.092);

    expect(res.l2AskLevels[4].price).toBe(1.0921);
    expect(res.l2BidLevels[0].price).toBe(1.0919);
  });
});
