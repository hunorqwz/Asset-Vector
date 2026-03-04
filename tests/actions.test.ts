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
});
