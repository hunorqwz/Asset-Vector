
import { pruneHistoricalData } from '../app/actions/signals';
import { db } from '../db';
import { marketSignals } from '../db/schema';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Data Hygiene - Pruning (app/actions/signals)', () => {
  beforeEach(async () => {
    // Clear signals
    await db.delete(marketSignals);
  });

  it('should prune old evaluated signals but keep recent ones', async () => {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // 1. Old Evaluated (SHOULD BE PRUNED)
    await db.insert(marketSignals).values({
      ticker: 'OLD_EVAL',
      isEvaluated: true,
      generatedAt: fortyDaysAgo,
    });

    // 2. Old Unevaluated (SHOULD BE KEPT for evaluation)
    await db.insert(marketSignals).values({
      ticker: 'OLD_UNEVAL',
      isEvaluated: false,
      generatedAt: fortyDaysAgo,
    });

    // 3. New Evaluated (SHOULD BE KEPT for recent metrics)
    await db.insert(marketSignals).values({
      ticker: 'NEW_EVAL',
      isEvaluated: true,
      generatedAt: tenDaysAgo,
    });

    await pruneHistoricalData();

    const remaining = await db.query.marketSignals.findMany();
    const tickers = remaining.map((r: any) => r.ticker);

    expect(tickers).not.toContain('OLD_EVAL');
    expect(tickers).toContain('OLD_UNEVAL');
    expect(tickers).toContain('NEW_EVAL');
  });
});
