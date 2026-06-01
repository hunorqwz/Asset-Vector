import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUserProfile, deleteUserAccount } from '@/app/actions/settings';
import { createAlert } from '@/app/actions/alerts';
import { db } from '@/db';

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      userWatchlists: {
        findFirst: vi.fn(),
      },
      userPositions: {
        findFirst: vi.fn(),
      },
      priceAlerts: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({ user: { id: 'test_user_id', email: 'test@example.com' } })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Settings & Alerts Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateUserProfile', () => {
    it('successfully updates user profile name', async () => {
      const result = await updateUserProfile('New Name');
      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('deleteUserAccount', () => {
    it('successfully deletes user account', async () => {
      const result = await deleteUserAccount();
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('createAlert validation rules', () => {
    it('returns TICKER_NOT_TRACKED if ticker is not in watchlist and not in portfolio positions', async () => {
      (db.query.userWatchlists.findFirst as any).mockResolvedValue(null);
      (db.query.userPositions.findFirst as any).mockResolvedValue(null);

      const result = await createAlert('XYZ', 100.0, 'above');
      expect(result.success).toBe(false);
      expect(result.error).toBe('TICKER_NOT_TRACKED');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('successfully inserts alert if ticker is tracked in watchlist', async () => {
      (db.query.userWatchlists.findFirst as any).mockResolvedValue({ ticker: 'AAPL' });
      (db.query.userPositions.findFirst as any).mockResolvedValue(null);
      (db.query.priceAlerts.findMany as any).mockResolvedValue([]);

      const result = await createAlert('AAPL', 150.0, 'above');
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });
  });
});
