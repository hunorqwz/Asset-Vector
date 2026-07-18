import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { futuresAlerts } from "@/db/schema";
import { futuresBridge } from "@/lib/futures-server-bridge";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Ingest triggered order flow entry signals from the stream processor
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { ticker, type, message, price, cvd, imbalance } = data;

    if (!ticker || !type || !message || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [newAlert] = await db
      .insert(futuresAlerts)
      .values({
        ticker: ticker.toUpperCase(),
        timestamp: new Date(),
        type,
        message,
        price: price.toString(),
        cvd: cvd ? cvd.toString() : null,
        imbalance: imbalance ? imbalance.toString() : null,
        isRead: false,
      })
      .returning();

    // Broadcast live alert to all SSE-connected dashboards instantly
    futuresBridge.broadcastAlert(newAlert);

    return NextResponse.json({ success: true, alert: newAlert });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Alert log failure" }, { status: 500 });
  }
}

// Retrieve recent alerts list
export async function GET() {
  try {
    const alerts = await db.query.futuresAlerts.findMany({
      orderBy: desc(futuresAlerts.timestamp),
      limit: 50,
    });
    return NextResponse.json(alerts);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch alerts" }, { status: 500 });
  }
}
