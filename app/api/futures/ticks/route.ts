import { NextRequest, NextResponse } from "next/server";
import { futuresBridge } from "@/lib/futures-server-bridge";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { symbol, ...tickData } = payload;
    
    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    // Broadcast the real-time tick (quote/trade) to all listening UI clients
    futuresBridge.broadcastTick(symbol, tickData);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid payload" }, { status: 500 });
  }
}
