
import { validateAndCleanData } from '../lib/math';
import { describe, it, expect } from 'vitest';

describe('Data Integrity Engine - Outlier Removal (lib/math)', () => {
  it('should clean a single bad print spike', () => {
    const prices = [100, 101, 100, 102, 115, 101, 100, 99, 101, 100, 100, 101]; // 115 is the spike
    const cleaned = validateAndCleanData(prices, 3.5); // Threshold for MAD
    
    // The 115 at index 4 should be replaced by (102 + 101) / 2 = 101.5
    expect(cleaned[4]).toBeCloseTo(101.5);
    expect(cleaned[0]).toBe(100);
    expect(cleaned[11]).toBe(101);
  });

  it('should not mutate stable data', () => {
    const stable = [100, 101, 100, 99, 100, 101, 100, 99, 100, 101, 100, 99];
    const cleaned = validateAndCleanData(stable, 5);
    expect(cleaned).toEqual(stable);
  });

  it('should handle small datasets gracefully', () => {
    const small = [100, 200]; 
    const cleaned = validateAndCleanData(small);
    expect(cleaned).toEqual(small);
  });

  it('should handle extreme outlier clusters by interpolating neighbors', () => {
    const sequence = [10, 10, 10, 50, 10, 10, 10]; // 50 is extreme
    const cleaned = validateAndCleanData(sequence, 3);
    // Index 3 (50) should be interpolated from 10 and 10 -> 10
    expect(cleaned[3]).toBe(10);
  });
});
