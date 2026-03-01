"use server";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

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

  // Limit: 20 active alerts per user
  const existing = await db.query.priceAlerts.findMany({
    where: and(eq(priceAlerts.userId, session.user.id), eq(priceAlerts.isTriggered, false)),
    columns: { id: true },
  });
  if (existing.length >= 20) return { success: false, error: "LIMIT_REACHED" };

  try {
    await db.insert(priceAlerts).values({
      userId: session.user.id,
      ticker: ticker.toUpperCase(),
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

/**
 * Called server-side on each dashboard refresh.
 * Checks all active (non-triggered) alerts against the current price map.
 * Marks triggered alerts in the DB.
 * Returns the list of newly triggered alerts for display.
 */
export async function checkAndTriggerAlerts(
  priceMap: Record<string, number>
): Promise<PriceAlert[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const active = await db.query.priceAlerts.findMany({
    where: and(
      eq(priceAlerts.userId, session.user.id),
      eq(priceAlerts.isTriggered, false)
    ),
  });

  const triggered: PriceAlert[] = [];

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

  return triggered;
}
