import { describe, expect, it } from 'vitest';
import { calculateGrahamNumber, calculatePeterLynchFairValue } from './valuation';

describe('Valuation Models', () => {
  describe('Graham Number', () => {
    it('calculates the correct Graham Number for positive inputs', () => {
      // EPS = 5, BVPS = 20
      // sqrt(22.5 * 5 * 20) = sqrt(2250) ≈ 47.434
      const result = calculateGrahamNumber(5, 20);
      expect(result.isValid).toBe(true);
      expect(result.value).toBeCloseTo(47.434, 3);
    });

    it('returns invalid for negative or zero EPS', () => {
      expect(calculateGrahamNumber(-5, 20).isValid).toBe(false);
      expect(calculateGrahamNumber(0, 20).isValid).toBe(false);
    });

    it('returns invalid for negative or zero BVPS', () => {
      expect(calculateGrahamNumber(5, -20).isValid).toBe(false);
      expect(calculateGrahamNumber(5, 0).isValid).toBe(false);
    });

    it('returns invalid for null inputs', () => {
      expect(calculateGrahamNumber(null, 20).isValid).toBe(false);
      expect(calculateGrahamNumber(5, null).isValid).toBe(false);
    });
  });

  describe('Peter Lynch Fair Value', () => {
    it('calculates the correct Lynch Fair Value for normal growth', () => {
      // EPS = 2, Growth = 0.15 (15%)
      // 2 * 15 = 30
      const result = calculatePeterLynchFairValue(2, 0.15);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(30);
    });

    it('caps growth rate at 40% (0.4)', () => {
      // EPS = 2, Growth = 0.80 (80%) -> capped at 40%
      // 2 * 40 = 80
      const result = calculatePeterLynchFairValue(2, 0.80);
      expect(result.value).toBe(80);
    });

    it('floors growth rate at 5% (0.05)', () => {
      // EPS = 2, Growth = 0.02 (2%) -> floored at 5%
      // 2 * 5 = 10
      const result = calculatePeterLynchFairValue(2, 0.02);
      expect(result.value).toBe(10);
    });

    it('handles negative or zero EPS properly', () => {
      expect(calculatePeterLynchFairValue(-2, 0.15).isValid).toBe(false);
      expect(calculatePeterLynchFairValue(0, 0.15).isValid).toBe(false);
    });

    it('returns valid false when inputs are null', () => {
      expect(calculatePeterLynchFairValue(null, 0.15).isValid).toBe(false);
      expect(calculatePeterLynchFairValue(2, null).isValid).toBe(false);
    });
  });
});
