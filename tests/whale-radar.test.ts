import { describe, it, expect } from 'vitest';
import { calculateWhaleIntelligence } from '../lib/whale-radar';
import { StockDetails } from '../lib/stock-details';

describe('Whale Radar Engine', () => {
  const mockDetails = (insiders: any[], holders: any[], instPct: number): Partial<StockDetails> => ({
    insiderTransactions: insiders,
    topHolders: holders,
    keyStats: {
      heldPercentInstitutions: instPct,
      heldPercentInsiders: 0.05,
      sharesOutstanding: 1000000,
      floatShares: 800000,
      sharesShort: 10000,
      shortRatio: 1.5,
      shortPercentOfFloat: 0.02,
      trailingEps: 5.5,
      forwardEps: 6.0,
      earningsQuarterlyGrowth: 0.1,
      mostRecentQuarter: '2023-12-31',
      lastSplitFactor: null,
      lastSplitDate: null,
      beta: 1.1
    } as any
  });

  it('detects a bullish consensus when insiders buy', () => {
    const insiders = [
      { filerName: 'CEO', transactionText: 'Purchase', value: 1000000, startDate: new Date().toISOString(), shares: 1000 },
      { filerName: 'CFO', transactionText: 'Buy', value: 500000, startDate: new Date().toISOString(), shares: 500 }
    ];
    const holders = [{ name: 'Fund A', pctChange: 2, value: 10000000, pctHeld: 0.05 }];
    
    const intelligence = calculateWhaleIntelligence(mockDetails(insiders, holders, 0.7) as any);
    
    expect(intelligence.insiderSentiment).toBe('BULLISH');
    expect(intelligence.whaleConsensusScore).toBeGreaterThan(50);
  });

  it('detects a cluster buy (3+ unique buyers)', () => {
    const insiders = [
      { filerName: 'Buyer 1', transactionText: 'Buy', value: 10000, startDate: new Date().toISOString(), shares: 100 },
      { filerName: 'Buyer 2', transactionText: 'Buy', value: 10000, startDate: new Date().toISOString(), shares: 100 },
      { filerName: 'Buyer 3', transactionText: 'Buy', value: 10000, startDate: new Date().toISOString(), shares: 100 }
    ];
    
    const intelligence = calculateWhaleIntelligence(mockDetails(insiders, [], 0.5) as any);
    
    expect(intelligence.clusterBuyDetected).toBe(true);
    expect(intelligence.whaleConsensus).toBe('HIGH_CONVICTION_BUY');
  });

  it('detects distribution when institutions sell', () => {
    const insiders: any[] = [];
    const holders = [
      { name: 'Fund A', pctChange: -10, value: 10000000, pctHeld: 0.05 },
      { name: 'Fund B', pctChange: -15, value: 10000000, pctHeld: 0.05 }
    ];
    
    const intelligence = calculateWhaleIntelligence(mockDetails(insiders, holders, 0.4) as any);
    
    expect(intelligence.institutionalSentiment).toBe('BEARISH');
    expect(intelligence.whaleConsensus).toBe('DISTRIBUTION');
  });

  it('remains neutral with mixed or no data', () => {
    const intelligence = calculateWhaleIntelligence(mockDetails([], [], 0.5) as any);
    
    expect(intelligence.whaleConsensus).toBe('NEUTRAL');
    expect(intelligence.whaleConsensusScore).toBe(50);
  });
});
