import { Metadata } from "next";
import { PageHeader } from "@/components/organisms/PageHeader";
import { getFuturesPositions } from "@/app/actions/futures";
import { FuturesTerminal } from "@/components/organisms/FuturesTerminal";
import { db } from "@/db";
import { futuresAlerts } from "@/db/schema";
import { desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Futures Order Flow Terminal | Asset Vector",
  description: "Real-time CME Globex futures order flow, Cumulative Volume Delta (CVD), and automated entry alerts.",
};

export const dynamic = "force-dynamic";

export default async function FuturesPage() {
  const [positions, recentAlerts] = await Promise.all([
    getFuturesPositions().catch(() => []),
    db.query.futuresAlerts.findMany({
      orderBy: desc(futuresAlerts.timestamp),
      limit: 30,
    }).catch(() => []),
  ]);

  // Format decimal values to floats for UI consumption
  const formattedAlerts = (recentAlerts || []).map((a: any) => ({
    id: a.id,
    ticker: a.ticker,
    timestamp: a.timestamp,
    type: a.type,
    message: a.message,
    price: parseFloat(a.price),
    cvd: a.cvd ? parseFloat(a.cvd) : null,
    imbalance: a.imbalance ? parseFloat(a.imbalance) : null,
    isRead: a.isRead,
  }));

  return (
    <>
      <PageHeader />
      <FuturesTerminal initialPositions={positions} initialAlerts={formattedAlerts} />
    </>
  );
}
