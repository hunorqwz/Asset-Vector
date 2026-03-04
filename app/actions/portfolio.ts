"use server";
import { db } from "@/db";
import { userPositions, assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type Position = {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  openedAt: Date | null;
  notes: string | null;
};

export async function getPositions(): Promise<Position[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db.query.userPositions.findMany({
    where: eq(userPositions.userId, session.user.id),
    orderBy: (t: typeof userPositions.$inferSelect, { desc }: { desc: (col: unknown) => unknown }) => [desc(t.openedAt)],
  });

  return rows.map((r: typeof userPositions.$inferSelect) => ({
    id: r.id,
    ticker: r.ticker,
    name: r.name,
    shares: parseFloat(r.shares as string),
    avgCost: parseFloat(r.avgCost as string),
    openedAt: r.openedAt,
    notes: r.notes,
  }));
}

export async function addPosition(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  const ticker = (formData.get("ticker") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();
  const shares = parseFloat(formData.get("shares") as string);
  const avgCost = parseFloat(formData.get("avgCost") as string);

  if (!ticker || !name || isNaN(shares) || isNaN(avgCost) || shares <= 0 || avgCost <= 0) {
    return { success: false, error: "INVALID_INPUT" };
  }

  try {
    // Ensure asset exists globally
    await db.insert(assets)
      .values({ ticker, name: name.substring(0, 50), isActive: true, sector: "Unknown" })
      .onConflictDoNothing();

    await db.insert(userPositions).values({
      userId: session.user.id,
      ticker,
      name: name.substring(0, 100),
      shares: shares.toString(),
      avgCost: avgCost.toString(),
    });

    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deletePosition(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await db.delete(userPositions).where(
      and(
        eq(userPositions.id, id),
        eq(userPositions.userId, session.user.id)
      )
    );
    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updatePosition(id: string, shares: number, avgCost: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  if (isNaN(shares) || isNaN(avgCost) || shares <= 0 || avgCost <= 0) {
    return { success: false, error: "INVALID_INPUT" };
  }

  try {
    const updated = await db
      .update(userPositions)
      .set({ shares: shares.toString(), avgCost: avgCost.toString() })
      .where(
        and(
          eq(userPositions.id, id),
          eq(userPositions.userId, session.user.id)
        )
      )
      .returning({ id: userPositions.id });

    if (updated.length === 0) return { success: false, error: "NOT_FOUND" };

    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}


export async function getPositionForTicker(ticker: string): Promise<Position | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await db.query.userPositions.findFirst({
    where: and(
      eq(userPositions.userId, session.user.id),
      eq(userPositions.ticker, ticker.toUpperCase())
    ),
  });

  if (!row) return null;

  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    shares: parseFloat(row.shares as string),
    avgCost: parseFloat(row.avgCost as string),
    openedAt: row.openedAt,
    notes: row.notes,
  };
}
import { computePortfolioRisk, RiskIntelligence } from "@/lib/portfolio-risk";
import { getPortfolioPrices } from "@/app/actions";

export async function getPortfolioRiskIntelligence(): Promise<RiskIntelligence | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const rawPositions = await getPositions();
    if (rawPositions.length === 0) return null;

    const tickers = [...new Set(rawPositions.map(p => p.ticker))];
    const prices = await getPortfolioPrices(tickers);

    // Filter out tickers with no price
    const enriched = rawPositions.map(p => ({
      ...p,
      currentPrice: prices[p.ticker] || p.avgCost,
      currentValue: (prices[p.ticker] || p.avgCost) * p.shares
    }));

    const totalValue = enriched.reduce((s, p) => s + p.currentValue, 0);
    if (totalValue === 0) return null;

    // Aggregate weights per ticker (sum multiple positions if they exist)
    const tickerWeightsMap: Record<string, number> = {};
    enriched.forEach(p => {
      tickerWeightsMap[p.ticker] = (tickerWeightsMap[p.ticker] || 0) + (p.currentValue / totalValue);
    });

    const positionsForRisk = Object.entries(tickerWeightsMap).map(([ticker, weight]) => ({
      ticker,
      weight
    }));

    return await computePortfolioRisk(positionsForRisk);
  } catch (err) {
    console.error("Risk Intelligence error:", err);
    return null;
  }
}

export async function simulateHedge(simTicker: string, amountUsd: number): Promise<RiskIntelligence | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const rawPositions = await getPositions();
    const tickers = [...new Set([...rawPositions.map(p => p.ticker), simTicker])];
    const prices = await getPortfolioPrices(tickers);

    const enriched = rawPositions.map(p => ({
      ...p,
      currentValue: (prices[p.ticker] || p.avgCost) * p.shares
    }));

    const totalValue = enriched.reduce((s, p) => s + p.currentValue, 0) + amountUsd;
    if (totalValue === 0) return null;

    const tickerWeightsMap: Record<string, number> = {};
    enriched.forEach(p => {
      tickerWeightsMap[p.ticker] = (tickerWeightsMap[p.ticker] || 0) + (p.currentValue / totalValue);
    });

    // Add simulated position
    tickerWeightsMap[simTicker.toUpperCase()] = (tickerWeightsMap[simTicker.toUpperCase()] || 0) + (amountUsd / totalValue);

    const positionsForRisk = Object.entries(tickerWeightsMap).map(([ticker, weight]) => ({
      ticker,
      weight
    }));

    return await computePortfolioRisk(positionsForRisk);
  } catch (err) {
    console.error("Simulation error:", err);
    return null;
  }
}
