import { describe, it, expect, vi } from 'vitest';
import { getFromCache, setInCache } from '../lib/cache';
import { generateSynthesis } from '../lib/synthesis';
import { calculateReturns } from '../lib/math';

// Mock dependencies of lib/cache.ts that we don't need for the clone test
vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    query: {
      systemKv: {
        findFirst: vi.fn()
      }
    }
  }
}));

describe('Surgical Wealth v2.0 Verification', () => {
  
  describe('Cache Precision & Isolation', () => {
    it('should ensure reference isolation using structuredClone', async () => {
      const original = { ticker: 'AAPL', data: { price: 150, metrics: [1, 2, 3] } };
      const key = 'test:clone';
      
      // Set object in cache
      await setInCache(key, original, 60000);
      
      // Get from cache
      const firstGet = await getFromCache<typeof original>(key);
      expect(firstGet).toEqual(original);
      expect(firstGet).not.toBe(original); // Should be a different reference
      
      // Mutate the retrieved object
      if (firstGet) {
        firstGet.data.price = 999;
        firstGet.data.metrics.push(4);
      }
      
      // Get again - should be UNCHANGED if isolation works
      const secondGet = await getFromCache<typeof original>(key);
      expect(secondGet?.data.price).toBe(150);
      expect(secondGet?.data.metrics.length).toBe(3);
    });
  });

  describe('Synthesis Narrative Poisoning Guard', () => {
    const mockTech: any = { 
      confluenceScore: 75, 
      signal: 'BUY', 
      indicators: [],
      isValid: true,
      rsi14: 60,
      macd: { line: 1, signal: 0.5, histogram: 0.5 },
      bollingerBands: { upper: 110, middle: 105, lower: 100, percentB: 0.8 },
      predictivePivots: null,
      fibonacci: null,
      orderBlocks: [],
      volatilityCompression: { isSqueezing: false, compressionScore: 0 },
      adx: 25
    };
    const mockRegime = 'MOMENTUM' as any;
    const mockQuality: any = { score: 60, signal: 'STRONG', factors: [], level: 'A' };

    it('should redistribute weights when narrative data is insufficient', () => {
      // 1. Full Data State
      const fullSentiment = { 
        score: 0, 
        label: 'NEUTRAL' as any, 
        headlineCount: 5, 
        drivers: [], 
        drift: 'STABLE' as any, 
        velocity: 0, 
        isInsufficientData: false,
        integrityScore: 1.0,
        isConflicted: false
      };
      const fullResult = generateSynthesis(mockTech, fullSentiment, 0.6, mockRegime, 100, undefined, mockQuality);
      
      // 2. Insufficient Data State
      const emptySentiment = { 
        score: 0, 
        label: 'NEUTRAL' as any, 
        headlineCount: 0, 
        drivers: [], 
        drift: 'STABLE' as any, 
        velocity: 0, 
        isInsufficientData: true,
        integrityScore: 1.0,
        isConflicted: false 
      };
      const poisonedResult = generateSynthesis(mockTech, emptySentiment, 0.6, mockRegime, 100, undefined, mockQuality);
      
      // In full state, Neutral sentiment (0 score -> 50) pulls down the High Technicals (90) and High Quality (85).
      // In poisoned state, Sentiment weight is ZERO, so the score should be HIGHER (closer to Tech/Qual avg).
      expect(poisonedResult.score).toBeGreaterThan(fullResult.score);
      expect(poisonedResult.primaryDriver).toContain('Narrative Lag');
    });
  });

  describe('Mathematical Data Integrity', () => {
    it('should handle zero prices without corrupting returns', () => {
      const prices = [100, 0, 105, 110];
      const returns = calculateReturns(prices);
      
      // Index 1 (100->0) is a zero price, index 2 (0->105) involves a zero price
      // Logic: if prices[i-1] > 0 && prices[i] > 0 -> log-return, else 0.
      expect(returns[0]).toBe(0); // 100 -> 0 (prices[1] is not > 0)
      expect(returns[1]).toBe(0); // 0 -> 105 (prices[0] is not > 0)
      expect(returns[2]).toBeGreaterThan(0.04); // 105 -> 110 (both are > 0)
      
      expect(returns.every(r => !isNaN(r))).toBe(true);
    });
  });
});
