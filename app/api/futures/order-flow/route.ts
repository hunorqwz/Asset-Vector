import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { futuresCandles } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Ingest 1-minute aggregated candles from the stream processor
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { ticker, timestamp, open, high, low, close, volume, cvd, poc, vah, val, imbalance } = data;

    if (!ticker || !timestamp) {
      return NextResponse.json({ error: "Missing required identifier fields" }, { status: 400 });
    }

    await db.insert(futuresCandles).values({
      ticker: ticker.toUpperCase(),
      timestamp: new Date(timestamp),
      open: open.toString(),
      high: high.toString(),
      low: low.toString(),
      close: close.toString(),
      volume: volume.toString(),
      cvd: cvd.toString(),
      poc: poc.toString(),
      vah: vah.toString(),
      val: val.toString(),
      imbalance: imbalance.toString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Ingestion failure" }, { status: 500 });
  }
}

// Retrieve historical candles for chart hydration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = (searchParams.get("ticker") || "GC.V.0").toUpperCase();
    const limit = Math.min(1000, parseInt(searchParams.get("limit") || "300"));

    const history = await db.query.futuresCandles.findMany({
      where: eq(futuresCandles.ticker, ticker),
      limit: limit,
      orderBy: desc(futuresCandles.timestamp),
    });

    // Return history in chronological order for charting
    return NextResponse.json(history.reverse());
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "History query error" }, { status: 500 });
  }
}
