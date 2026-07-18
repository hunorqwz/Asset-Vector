import { NextRequest } from "next/server";
import { futuresBridge, FuturesSSEClient } from "@/lib/futures-server-bridge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawTickers = searchParams.get("symbols") || "*";
  
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

  let isClosed = false;
  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    futuresBridge.unregisterClient(clientId);
    try {
      writer.close();
    } catch {}
  };

  const sendEvent = (event: any) => {
    if (isClosed) return;
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (err) {
      console.warn(`[Futures Stream] Error writing to client ${clientId}:`, err);
      cleanup();
    }
  };

  const client: FuturesSSEClient = {
    id: clientId,
    tickers,
    send: sendEvent,
  };

  // Register in our global SSE bridge
  futuresBridge.registerClient(client);

  // Send initial handshake
  try {
    writer.write(encoder.encode("event: open\ndata: connected\n\n"));
  } catch (err) {
    cleanup();
    return new Response("SSE Connection failed", { status: 500 });
  }

  // Handle client disconnect abort signal
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
