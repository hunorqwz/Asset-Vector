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
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
        set: vi.fn(() => ({
            where: vi.fn(),
        })),
    })),
  },
}));

vi.mock('@/lib/market-data', () => ({
  fetchMarketData: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarketSignals', () => {
    it('returns default tickers if DB is empty', async () => {
      (db.query.assets.findMany as any).mockResolvedValue([]);
      (fetchMarketData as any).mockResolvedValue({ ticker: 'TEST', price: 100, history: [] });

      const results = await getMarketSignals();
      
      expect(results.length).toBeGreaterThan(0);
      expect(fetchMarketData).toHaveBeenCalledWith('BTC-USD', 100);
    });

    it('returns DB tickers if available', async () => {
      (db.query.assets.findMany as any).mockResolvedValue([{ ticker: 'AAPL' }]);
      (fetchMarketData as any).mockResolvedValue({ ticker: 'AAPL', price: 150, history: [] });

      const results = await getMarketSignals();
      
      expect(results[0].ticker).toBe('AAPL');
      expect(fetchMarketData).toHaveBeenCalledWith('AAPL', 100);
    });
  });

  describe('addAsset', () => {
    it('successfully adds an asset', async () => {
      (db.query.assets.findMany as any).mockResolvedValue([]);
      
      const result = await addAsset('TSLA', 'Tesla');
      
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it('fails if limit is reached', async () => {
      (db.query.assets.findMany as any).mockResolvedValue(new Array(12).fill({ ticker: 'X' }));
      
      const result = await addAsset('TSLA', 'Tesla');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('LIMIT_REACHED');
    });
  });

  describe('removeAsset', () => {
    it('successfully removes an asset', async () => {
      const result = await removeAsset('AAPL');
      
      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
