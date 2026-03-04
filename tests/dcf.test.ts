import { describe, expect, it } from 'vitest';
import { calculateDCF, DCFParams } from '../lib/valuation';

describe('Discounted Cash Flow Model', () => {
  it('calculates the correct DCF values for normal inputs', () => {
    const params: DCFParams = {
      fcf: 1000,
      growthRateStage1: 0.10, // 10%
      growthRateStage2: 0.05, // 5%
      discountRate: 0.08, // 8%
      terminalGrowthRate: 0.02, // 2%
      cash: 500,
      debt: 200,
      sharesOutstanding: 100,
      projectionYears: 10
    };

    const result = calculateDCF(params);
    expect(result.isValid).toBe(true);
    
    // Enterprise Value should be positive
    expect(result.enterpriseValue).toBeGreaterThan(0);
    // Equity Value = EV + Cash - Debt = EV + 300
    expect(result.equityValue).toBeCloseTo(result.enterpriseValue + 300);
    // Intrinsic Value = Equity Value / 100
    expect(result.intrinsicValue).toBeCloseTo(result.equityValue / 100);
  });

  it('handles discount rate lower than terminal growth rate defensively', () => {
    const params: DCFParams = {
      fcf: 1000,
      growthRateStage1: 0.10,
      growthRateStage2: 0.05,
      discountRate: 0.01, // lower than terminal growth
      terminalGrowthRate: 0.02,
      cash: 500,
      debt: 200,
      sharesOutstanding: 100,
      projectionYears: 10
    };

    // If DR <= TGR, Gordon Growth Model throws infinity/negatives. Engine should shield this.
    const result = calculateDCF(params);
    expect(result.isValid).toBe(false);
    expect(result.intrinsicValue).toBe(0);
  });

  it('handles invalid outstanding shares defensively', () => {
    const params: DCFParams = {
      fcf: 1000,
      growthRateStage1: 0.10,
      growthRateStage2: 0.05,
      discountRate: 0.08,
      terminalGrowthRate: 0.02,
      cash: 500,
      debt: 200,
      sharesOutstanding: 0, // Zero shares
      projectionYears: 10
    };

    const result = calculateDCF(params);
    expect(result.isValid).toBe(false);
    expect(result.intrinsicValue).toBe(0);
  });
});
