"use server";

import { db } from "@/db";
import { futuresPositions, futuresAlerts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type FuturesPosition = {
  id: string;
  ticker: string;
  direction: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status: "OPEN" | "CLOSED";
  exitPrice: number | null;
  pnl: number | null;
  openedAt: Date;
  closedAt: Date | null;
};

/**
 * Log a manually executed trade in the positions ledger.
 */
export async function logManualTrade(
  ticker: string,
  direction: "BUY" | "SELL",
  size: number,
  entryPrice: number,
  stopLoss: number | null,
  takeProfit: number | null
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const [newPosition] = await db
      .insert(futuresPositions)
      .values({
        userId: session.user.id,
        ticker: ticker.toUpperCase(),
        direction,
        size: size.toString(),
        entryPrice: entryPrice.toString(),
        stopLoss: stopLoss ? stopLoss.toString() : null,
        takeProfit: takeProfit ? takeProfit.toString() : null,
        status: "OPEN",
      })
      .returning();

    revalidatePath("/futures");
    return { success: true, position: newPosition };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to log trade" };
  }
}

/**
 * Close a active manual trade position and calculate PnL.
 */
export async function closeManualTrade(positionId: string, exitPrice: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const pos = await db.query.futuresPositions.findFirst({
      where: and(
        eq(futuresPositions.id, positionId),
        eq(futuresPositions.userId, session.user.id)
      ),
    });

    if (!pos || pos.status === "CLOSED") {
      return { success: false, error: "Position not found or already closed" };
    }

    const entry = parseFloat(pos.entryPrice);
    const size = parseFloat(pos.size);
    
    // PnL Calculation
    // For Buying: (Exit - Entry) * Size
    // For Selling: (Entry - Exit) * Size
    const pnl = pos.direction === "BUY"
      ? (exitPrice - entry) * size
      : (entry - exitPrice) * size;

    await db
      .update(futuresPositions)
      .set({
        status: "CLOSED",
        exitPrice: exitPrice.toString(),
        pnl: pnl.toString(),
        closedAt: new Date(),
      })
      .where(eq(futuresPositions.id, positionId));

    revalidatePath("/futures");
    return { success: true, pnl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to close trade" };
  }
}

/**
 * Fetch all manual trade positions for the logged-in user.
 */
export async function getFuturesPositions(): Promise<FuturesPosition[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await db.query.futuresPositions.findMany({
      where: eq(futuresPositions.userId, session.user.id),
      orderBy: (t: typeof futuresPositions.$inferSelect, { desc }: { desc: (col: unknown) => unknown }) => [desc(t.openedAt)],
    });

    return rows.map((r: typeof futuresPositions.$inferSelect) => ({
      id: r.id,
      ticker: r.ticker,
      direction: r.direction as "BUY" | "SELL",
      size: parseFloat(r.size),
      entryPrice: parseFloat(r.entryPrice),
      stopLoss: r.stopLoss ? parseFloat(r.stopLoss) : null,
      takeProfit: r.takeProfit ? parseFloat(r.takeProfit) : null,
      status: r.status as "OPEN" | "CLOSED",
      exitPrice: r.exitPrice ? parseFloat(r.exitPrice) : null,
      pnl: r.pnl ? parseFloat(r.pnl) : null,
      openedAt: r.openedAt,
      closedAt: r.closedAt,
    }));
  } catch (err) {
    console.error("[Futures Actions] getFuturesPositions error:", err);
    return [];
  }
}

/**
 * Mark a generated alert as read/acknowledged.
 */
export async function markAlertAsRead(alertId: string) {
  try {
    await db
      .update(futuresAlerts)
      .set({ isRead: true })
      .where(eq(futuresAlerts.id, alertId));
      
    revalidatePath("/futures");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to mark alert as read" };
  }
}
