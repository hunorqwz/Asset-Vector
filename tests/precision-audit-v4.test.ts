
import { describe, it, expect } from 'vitest';
import { detectOrderBlocks } from '../lib/technical-analysis';
import { SentimentFallback } from '../lib/sentiment';

describe('Surgical Wealth v4.4 Precision Audit', () => {

  describe('Order Flow 2.0: Mitigation Mapping', () => {
    it('should correctly mark bullish zones as mitigated when price returns', () => {
      // Mock data: 10 bars total. 
      // Bar 5: Bullish Imbalance. High=105, Low=100. (Base=100)
      // Future bar (Bar 8): Price drops to 99. Bullish zone (100-105) should be mitigated.
      const data: any[] = Array.from({ length: 15 }, (_, i) => ({
        time: i * 86400,
        open: 100, high: 102, low: 98, close: 101, volume: 1000
      }));

      // Injected Imbalance at index 5
      data[5] = { time: 5 * 86400, open: 101, high: 110, low: 100, close: 109, volume: 5000 };
      
      // Mitigation at index 10
      data[10] = { time: 10 * 86400, open: 105, high: 106, low: 99, close: 100, volume: 1000 };

      const blocks = detectOrderBlocks(data);
      const bullishBlock = blocks.find(b => b.type === 'BULLISH');
      
      expect(bullishBlock).toBeDefined();
      expect(bullishBlock?.isMitigated).toBe(true);
    });

    it('should keep zones "fresh" (unmitigated) if price stays away', () => {
      const data: any[] = Array.from({ length: 15 }, (_, i) => ({
        time: i * 86400,
        open: 100, high: 102, low: 98, close: 101, volume: 1000
      }));

      // Imbalance at index 5
      data[5] = { time: 5 * 86400, open: 101, high: 110, low: 105, close: 109, volume: 5000 };
      
      // Future prices stay ABOVE the zone (100-105)
      for(let i=6; i<15; i++) {
        data[i] = { ...data[i], low: 106 }; 
      }

      const blocks = detectOrderBlocks(data);
      const bullishBlock = blocks.find(b => b.type === 'BULLISH');
      
      expect(bullishBlock).toBeDefined();
      expect(bullishBlock?.isMitigated).toBe(false);
    });
  });

  describe('Narrative Guard: Integrity Scoring', () => {
    it('should detect conflicts when a screamer headline lacks authoritative consensus', () => {
       // Only retail sources, one of which is a "Screamer" (3+ keywords)
       const headlines = [
         { title: "Panic crash warning as risk and loss plunge price", publisher: "motley fool", date: new Date().toISOString() },
         { title: "Retail uncertainty high", publisher: "seeking alpha", date: new Date().toISOString() }
       ];
       
       const report = SentimentFallback.analyze(headlines as any);
       
       // Motley fool result should be a "Screamer" (localScore >= 3)
       // conflictCount > 0 && !hasConsensus (no bloomberg/reuters)
       expect(report.isConflicted).toBe(true);
       expect(report.integrityScore).toBeLessThan(0.6);
    });

    it('should verify high integrity when headlines are aligned across authoritative sources', () => {
       const headlines = [
         { title: "Strong Earnings Beat as growth surge record high", publisher: "bloomberg", date: new Date().toISOString() },
         { title: "Institutional Confidence Growing as profit gain high", publisher: "reuters", date: new Date().toISOString() }
       ];
       
       const report = SentimentFallback.analyze(headlines as any);
       
       // (1.5 + 1.5) / (2 * 1.5) = 1.0 integrity
       expect(report.isConflicted).toBe(false);
       expect(report.integrityScore).toBeGreaterThanOrEqual(1.0);
    });
  });

});
