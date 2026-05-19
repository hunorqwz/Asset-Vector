import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMarketSignals, addAsset, removeAsset } from '@/app/actions';
import { db } from '@/db';
import { fetchMarketData } from '@/lib/market-data';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    query: {
      assets: {
        findMany: vi.fn(),
      },
      userWatchlists: {
        findMany: vi.fn(),
      },
      userPositions: {
        findMany: vi.fn(),
      }
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          onConflictDoNothing: vi.fn()
        })),
        onConflictDoNothing: vi.fn()
      })),
    })),
    update: vi.fn(() => ({
        set: vi.fn(() => ({
            where: vi.fn(),
        })),
    })),
    delete: vi.fn(() => ({
        where: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/market-data', () => ({
  getPersistentSignal: vi.fn(),
}));

vi.mock('@/app/actions', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getPortfolioPrices: vi.fn(),
  };
});

vi.mock('@/lib/portfolio-risk', () => ({
  computePortfolioRisk: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({ user: { id: 'test_user_123', email: 'test@example.com' } })),
}));

import { getPersistentSignal } from '@/lib/market-data';

describe('Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarketSignals', () => {
    it('returns empty array if DB watchlist is empty', async () => {
      (db.query.userWatchlists.findMany as any).mockResolvedValue([]);
      
      const results = await getMarketSignals();
      
      expect(results.length).toBe(0);
    });

    it('returns DB tickers if available', async () => {
      (db.query.userWatchlists.findMany as any).mockResolvedValue([{ ticker: 'AAPL' }]);
      (getPersistentSignal as any).mockResolvedValue({ ticker: 'AAPL', price: 150, history: [] });

      const results = await getMarketSignals();
      
      expect(results[0].ticker).toBe('AAPL');
      expect(getPersistentSignal).toHaveBeenCalledWith('AAPL', 2500);
    });
  });

  describe('addAsset', () => {
    it('successfully adds an asset', async () => {
      (db.query.userWatchlists.findMany as any).mockResolvedValue([]);
      
      const result = await addAsset('TSLA', 'Tesla');
      
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it('fails if limit is reached', async () => {
      (db.query.userWatchlists.findMany as any).mockResolvedValue(new Array(12).fill({ ticker: 'X' }));
      
      const result = await addAsset('TSLA', 'Tesla');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('LIMIT_REACHED');
    });
  });

  describe('removeAsset', () => {
    it('successfully removes an asset', async () => {
      const result = await removeAsset('AAPL');
      
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('getPortfolioRiskIntelligence (Telemetry Observability)', () => {
    it('intercepts silently dropped ML signals and appends a degraded telemetry systemWarning', async () => {
      const { getPortfolioRiskIntelligence } = await import('@/app/actions/portfolio');
      const { computePortfolioRisk } = await import('@/lib/portfolio-risk');
      const { getPortfolioPrices } = await import('@/app/actions');

      // Mock DB Positions
      (db.query.userPositions.findMany as any).mockResolvedValue([
        { id: '1', ticker: 'TSLA', shares: '10', avgCost: '200' },
        { id: '2', ticker: 'AAPL', shares: '5', avgCost: '150' }
      ]);

      // Mock Pricing successfully
      (getPortfolioPrices as any).mockResolvedValue({ TSLA: 250, AAPL: 160 });

      // Mock ML Signal gracefully degrading (Circuit Breaker offline/timeout)
      // This will throw error internally, caught by `.catch(() => null)` in getPortfolioRiskIntelligence
      (getPersistentSignal as any).mockRejectedValue(new Error("Timeout"));

      // Mock the Math risk generator standard return
      (computePortfolioRisk as any).mockResolvedValue({
        portfolioBeta: 1.1,
        correlationAlerts: [],
        scenarios: [],
        volatilityAnnualized: 15,
        var95: 5,
        jensensAlpha: 2,
        correlationMatrix: { tickers: ['TSLA', 'AAPL'], matrix: [[1, 0.5], [0.5, 1]] },
        regimeAlignment: 75,
        regimeLabel: 'Bullish',
        horizonConflicts: [],
        systemWarnings: [] // Fresh baseline
      });

      const result = await getPortfolioRiskIntelligence();

      expect(result).not.toBeNull();
      // It should accurately flag the 2 dropped tickets rather than failing silently
      expect(result?.systemWarnings?.length).toBeGreaterThan(0);
      expect(result?.systemWarnings?.[0]).toContain('offline for 2 asset(s)');
    });
  });
});
