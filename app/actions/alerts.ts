"use server";
import { db } from "@/db";
import { priceAlerts, userPositions, userWatchlists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export type PriceAlert = {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: "above" | "below";
  note: string | null;
  isTriggered: boolean;
  triggeredAt: Date | null;
  triggeredPrice: number | null;
  createdAt: Date | null;
};

export async function getAlerts(): Promise<PriceAlert[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db.query.priceAlerts.findMany({
    where: eq(priceAlerts.userId, session.user.id),
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
  });

  return rows.map((r: any) => ({
    id: r.id,
    ticker: r.ticker,
    targetPrice: parseFloat(r.targetPrice),
    direction: r.direction as "above" | "below",
    note: r.note,
    isTriggered: r.isTriggered ?? false,
    triggeredAt: r.triggeredAt,
    triggeredPrice: r.triggeredPrice ? parseFloat(r.triggeredPrice) : null,
    createdAt: r.createdAt,
  }));
}

export async function createAlert(
  ticker: string,
  targetPrice: number,
  direction: "above" | "below",
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  if (!ticker || isNaN(targetPrice) || targetPrice <= 0) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Validate ticker against watchlist or portfolio to prevent untracked alerts (M6 Fix)
  const normalizedTicker = ticker.toUpperCase();
  const [inWatchlist, inPortfolio] = await Promise.all([
    db.query.userWatchlists.findFirst({ 
      where: and(eq(userWatchlists.userId, session.user.id), eq(userWatchlists.ticker, normalizedTicker)) 
    }),
    db.query.userPositions.findFirst({ 
      where: and(eq(userPositions.userId, session.user.id), eq(userPositions.ticker, normalizedTicker)) 
    })
  ]);
  
  if (!inWatchlist && !inPortfolio) {
    return { success: false, error: "TICKER_NOT_TRACKED" };
  }

  // Limit: 20 active alerts per user
  const existing = await db.query.priceAlerts.findMany({
    where: and(eq(priceAlerts.userId, session.user.id), eq(priceAlerts.isTriggered, false)),
    columns: { id: true },
  });
  if (existing.length >= 20) return { success: false, error: "LIMIT_REACHED" };

  try {
    await db.insert(priceAlerts).values({
      userId: session.user.id,
      ticker: normalizedTicker,
      targetPrice: targetPrice.toString(),
      direction,
      note: note?.trim() || null,
    });
    revalidatePath("/");
    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteAlert(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await db.delete(priceAlerts).where(
      and(eq(priceAlerts.id, id), eq(priceAlerts.userId, session.user.id))
    );
    revalidatePath("/");
    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function dismissAlert(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await db.delete(priceAlerts).where(
      and(eq(priceAlerts.id, id), eq(priceAlerts.userId, session.user.id))
    );
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ---- BACKGROUND & INSIGHT SYSTEMS ----

export type Insight = {
  ticker: string;
  type: "ALPHA" | "REGIME_SHIFT" | "SENTIMENT_SPIKE";
  label: string;
  message: string;
  score: number;
};

export type AlertSessionState = {
  triggered: PriceAlert[];
  insights: Insight[];
};

/**
 * Perform a structural audit of the user's focus tickers (Watchlist + Portfolio)
 * and detect institutional regime shifts or high Alpha scores.
 */
import { getMinimalAssetDetails } from "../actions";
import { calculateAlphaScore } from "@/lib/alpha-engine";
import { getFromCache, setInCache } from "@/lib/cache";

export async function getInstitutionalInsights(tickers: string[]): Promise<Insight[]> {
  const session = await auth();
  if (!session?.user?.id || tickers.length === 0) return [];

  const capped = tickers.slice(0, 10); // Performance cap
  const insights: Insight[] = [];

  // 1. Check cache synchronously for instant UI response (O(1))
  const pendingTickers: string[] = [];
  for (const ticker of capped) {
    const cachedItem = await getFromCache<Insight | { type: "NONE" }>(`insight:${ticker}`);
    if (cachedItem) {
      if (cachedItem.type !== "NONE") {
        insights.push(cachedItem as Insight);
      }
    } else {
      pendingTickers.push(ticker);
    }
  }

  // 2. Offload heavy API fetches to Background Thread (SPLR)
  if (pendingTickers.length > 0) {
    after(async () => {
      try {
        const results = await Promise.allSettled(pendingTickers.map(t => getMinimalAssetDetails(t)));
        
        results.forEach(async (r, i) => {
          if (r.status === 'fulfilled') {
            const data = r.value;
            const { score, scanner } = calculateAlphaScore(data, data.stockDetails);
            
            if (score > 85 && scanner) {
              const insight: Insight = {
                ticker: pendingTickers[i],
                type: "ALPHA",
                label: `${scanner} SIGNAL`,
                message: `High conviction institutional ${scanner.toLowerCase()} detected.`,
                score: Math.round(score)
              };
              // Cache success for 30 minutes
              await setInCache(`insight:${pendingTickers[i]}`, insight, 30 * 60 * 1000);
            } else {
              // Cache null state for 5 minutes so we don't spam API
              await setInCache(`insight:${pendingTickers[i]}`, { type: "NONE" }, 5 * 60 * 1000);
            }
          }
        });
      } catch (err) {
        console.error("[Insights Background Fetch] Failed:", err);
      }
    });
  }

  return insights;
}

/**
 * Called server-side on each dashboard refresh.
 * Now returns both newly triggered price alerts and real-time institutional insights.
 */
export async function checkAndTriggerAlerts(
  priceMap: Record<string, number>
): Promise<AlertSessionState> {
  const session = await auth();
  if (!session?.user?.id) return { triggered: [], insights: [] };

  const tickersExtracted = Object.keys(priceMap);
  const lockKey = `alert_eval_lock_${session.user.id}`;
  if (await getFromCache(lockKey)) {
    return { triggered: [], insights: await getInstitutionalInsights(tickersExtracted) };
  }
  await setInCache(lockKey, true, 60000); // 1-minute debounce per user (M5 Fix)

  const active = await db.query.priceAlerts.findMany({
    where: and(
      eq(priceAlerts.userId, session.user.id),
      eq(priceAlerts.isTriggered, false)
    ),
  });

  const triggered: PriceAlert[] = [];
  const tickersToAudit = Object.keys(priceMap);

  // 1. Check Price Alerts
  for (const alert of active) {
    const currentPrice = priceMap[alert.ticker];
    if (currentPrice === undefined) continue;

    const target = parseFloat(alert.targetPrice as string);
    const shouldTrigger =
      (alert.direction === "above" && currentPrice >= target) ||
      (alert.direction === "below" && currentPrice <= target);

    if (shouldTrigger) {
      try {
        await db
          .update(priceAlerts)
          .set({
            isTriggered: true,
            triggeredAt: new Date(),
            triggeredPrice: currentPrice.toString(),
          })
          .where(eq(priceAlerts.id, alert.id));

        triggered.push({
          id: alert.id,
          ticker: alert.ticker,
          targetPrice: target,
          direction: alert.direction as "above" | "below",
          note: alert.note,
          isTriggered: true,
          triggeredAt: new Date(),
          triggeredPrice: currentPrice,
          createdAt: alert.createdAt,
        });
      } catch { /* non-blocking */ }
    }
  }

  // 2. Perform Institutional Audit the tickers in the priceMap
  const insights = await getInstitutionalInsights(tickersToAudit);

  return { triggered, insights };
}

import { detectRegimeBreakout, RegimeBreakout } from "@/lib/regime-radar";

export async function getRegimeBreakout(): Promise<RegimeBreakout | null> {
  // Cached internally — safe to call on every page load
  return detectRegimeBreakout();
}
