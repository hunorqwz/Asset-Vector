import { describe, it, expect } from 'vitest';
import { calculateDCF, calculateGrahamNumber, calculatePeterLynchFairValue } from '@/lib/valuation';

describe('Valuation Models', () => {
  describe('calculateDCF', () => {
    it('correctly calculates intrinsic value for a mature growth company', () => {
      const params = {
        fcf: 100,
        growthRateStage1: 0.15, // 15% growth first 5 years
        growthRateStage2: 0.10, // 10% growth years 6-10
        discountRate: 0.10,
        terminalGrowthRate: 0.03,
        cash: 500,
        debt: 200,
        sharesOutstanding: 100,
        projectionYears: 10
      };

      const result = calculateDCF(params);
      
      expect(result.isValid).toBe(true);
      expect(result.intrinsicValue).toBeGreaterThan(0);
      // Enterprise Value should be significant for these parameters
      expect(result.enterpriseValue).toBeGreaterThan(1500); 
    });

    it('returns invalid result when discount rate is less than terminal growth rate', () => {
       const result = calculateDCF({
        fcf: 100,
        growthRateStage1: 0.10,
        growthRateStage2: 0.05,
        discountRate: 0.03,
        terminalGrowthRate: 0.04, // This should trigger a failure
        cash: 0,
        debt: 0,
        sharesOutstanding: 100,
        projectionYears: 10
      });

      expect(result.isValid).toBe(false);
      expect(result.intrinsicValue).toBe(0);
    });
  });

  describe('calculateGrahamNumber', () => {
    it('calculates the correct value based on Graham formula', () => {
      // EPS: 10, BVPS: 40 -> sqrt(22.5 * 10 * 40) = sqrt(9000) = 94.868...
      const result = calculateGrahamNumber(10, 40);
      expect(result.value).toBeCloseTo(94.87, 2);
      expect(result.isValid).toBe(true);
    });

    it('fails for negative EPS or BVPS', () => {
        expect(calculateGrahamNumber(-1, 40).isValid).toBe(false);
        expect(calculateGrahamNumber(10, -5).isValid).toBe(false);
        expect(calculateGrahamNumber(0, 40).isValid).toBe(false);
    });
  });

  describe('calculatePeterLynchFairValue', () => {
    it('applies the growth rate cap and floor', () => {
      // EPS 2, Growth 15% (0.15) -> value = 2 * 15 = 30
      expect(calculatePeterLynchFairValue(2, 0.15).value).toBe(30);

      // Low growth floor (below 5%)
      expect(calculatePeterLynchFairValue(2, 0.02).value).toBe(10); // 2 * 5

      // High growth cap (above 40%)
      expect(calculatePeterLynchFairValue(2, 0.60).value).toBe(80); // 2 * 40
    });

    it('fails for non-positive EPS', () => {
        expect(calculatePeterLynchFairValue(-1, 0.15).isValid).toBe(false);
        expect(calculatePeterLynchFairValue(0, 0.15).isValid).toBe(false);
    });
  });
});
