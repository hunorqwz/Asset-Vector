import { NextRequest } from "next/server";
import { alpacaBridge, SSEClient } from "@/lib/alpaca-server-bridge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawTickers = searchParams.get("tickers") || "";
  const tickers = new Set(
    rawTickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0)
  );

  const clientId = Math.random().toString(36).substring(2, 15);
  
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Clean-up handler
  let isClosed = false;
  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    alpacaBridge.unregisterClient(clientId);
    try {
      writer.close();
    } catch {}
  };

  // Helper to send tick updates formatted as SSE data packets
  const sendTick = (tick: any) => {
    if (isClosed) return;
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(tick)}\n\n`));
    } catch (err) {
      console.warn(`[API Ticks] Error writing to stream for client ${clientId}:`, err);
      cleanup();
    }
  };

  const client: SSEClient = {
    id: clientId,
    tickers,
    send: sendTick,
  };

  // Register connection in the server bridge
  alpacaBridge.registerClient(client);

  // Send initialization handshake
  try {
    writer.write(encoder.encode("event: open\ndata: connected\n\n"));
  } catch (err) {
    cleanup();
    return new Response("Connection failed", { status: 500 });
  }

  // Monitor connection abort
  request.signal.addEventListener("abort", () => {
    cleanup();
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
