import { describe, it, expect } from "vitest";

// Mocking math functions and standard deviations to verify the stress test logic
describe("Portfolio Stress Test Math Engine Verification", () => {
  const baseVols = { AAPL: 0.015, MSFT: 0.012, TSLA: 0.025 };
  const baseCorr = {
    AAPL: { MSFT: 0.45, TSLA: 0.35 },
    MSFT: { AAPL: 0.45, TSLA: 0.30 },
    TSLA: { AAPL: 0.35, MSFT: 0.30 }
  };
  const weights = { AAPL: 0.40, MSFT: 0.40, TSLA: 0.20 }; // Sums to 1.0

  // Standard simulation logic replicated for testing
  function runSimulation(
    volMultiplier: number,
    corrShock: number,
    rateShock: number,
    marketReturnShock: number
  ) {
    const tickers = Object.keys(weights) as ("AAPL" | "MSFT" | "TSLA")[];
    
    // Scale volatilities
    const stressedVols = {
      AAPL: baseVols.AAPL * volMultiplier,
      MSFT: baseVols.MSFT * volMultiplier,
      TSLA: baseVols.TSLA * volMultiplier
    };

    // Recalculate Portfolio Variance
    let portfolioVarDaily = 0;
    for (let i = 0; i < tickers.length; i++) {
      const t1 = tickers[i];
      const w1 = weights[t1];
      const vol1 = stressedVols[t1];

      portfolioVarDaily += w1 * w1 * vol1 * vol1;

      for (let j = i + 1; j < tickers.length; j++) {
        const t2 = tickers[j];
        const w2 = weights[t2];
        const vol2 = stressedVols[t2];
        
        // Fetch baseline correlation and apply shock
        const bc = (baseCorr as any)[t1][t2];
        const stressedCorr = bc + (1 - bc) * corrShock;
        
        portfolioVarDaily += 2 * w1 * w2 * vol1 * vol2 * stressedCorr;
      }
    }

    const portfolioVolDaily = Math.sqrt(portfolioVarDaily);

    // Diversification Benefit
    let weightedVolSum = 0;
    tickers.forEach(t => {
      weightedVolSum += weights[t] * stressedVols[t];
    });
    const diversificationBenefit = weightedVolSum > 0 ? 1 - portfolioVolDaily / weightedVolSum : 0;

    return {
      portfolioVolDaily,
      diversificationBenefit,
      stressedVols
    };
  }

  it("correctly scales asset volatilities under the multiplier factor", () => {
    const multiplier = 2.0;
    const sim = runSimulation(multiplier, 0.0, 0.0, 0.0);
    
    expect(sim.stressedVols.AAPL).toBeCloseTo(baseVols.AAPL * multiplier);
    expect(sim.stressedVols.MSFT).toBeCloseTo(baseVols.MSFT * multiplier);
    expect(sim.stressedVols.TSLA).toBeCloseTo(baseVols.TSLA * multiplier);
  });

  it("reduces diversification benefits to exactly zero when correlation shock is 1.0 (lockstep market panic)", () => {
    // Under 1.0 correlation, the portfolio standard deviation is exactly equal to the weighted sum of individual volatilities.
    // Therefore, the diversification benefit should evaluate to exactly 0.
    const sim = runSimulation(1.0, 1.0, 0.0, 0.0);
    
    expect(sim.diversificationBenefit).toBeCloseTo(0.0, 5);
  });

  it("maintains a positive diversification benefit under baseline parameters (less than 1.0 correlation)", () => {
    const sim = runSimulation(1.0, 0.0, 0.0, 0.0);
    
    // Since base correlations are 0.30 - 0.45, there should be positive diversification
    expect(sim.diversificationBenefit).toBeGreaterThan(0.0);
  });

  it("increases portfolio daily volatility as correlation panic rises (even if individual volatilities are constant)", () => {
    const simBaseline = runSimulation(1.0, 0.0, 0.0, 0.0);
    const simPanic = runSimulation(1.0, 0.8, 0.0, 0.0);
    
    expect(simPanic.portfolioVolDaily).toBeGreaterThan(simBaseline.portfolioVolDaily);
  });
});
