"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

export interface AlpacaTick {
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
}

export function useAlpacaTape(ticker: string) {
  const [lastTick, setLastTick] = useState<AlpacaTick | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const intentionallyClosed = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;

  const connect = useCallback(() => {
    // Purge any existing retry ghost threads
    if (retryTimeout.current) clearTimeout(retryTimeout.current);

    // Silently skip — Alpaca integration is opt-in via environment variables
    if (!ticker || !apiKey || !apiSecret) return;
    if (intentionallyClosed.current) return;

    // IEX feed — available on free/paper Alpaca accounts
    const url = "wss://stream.data.alpaca.markets/v2/iex";
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "auth", key: apiKey, secret: apiSecret }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        data.forEach((msg: any) => {
          if (msg.T === "success" && msg.msg === "authenticated") {
            setIsConnected(true);
            ws.send(JSON.stringify({ action: "subscribe", trades: [ticker] }));
          } else if (msg.T === "error") {
            console.warn(`[Alpaca] Stream error: [${msg.code}] ${msg.msg}`);
            // 409 = insufficient subscription — stop retrying, the account doesn't have access
            if (msg.code === 409 || msg.code === 403) {
              intentionallyClosed.current = true;
              ws.close();
            }
          } else if (msg.T === "t") {
            setLastTick({ price: msg.p, size: msg.s, timestamp: msg.t, exchange: msg.x });
          }
        });
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      // Only retry on transient failures — not when subscription/auth is the issue
      if (!intentionallyClosed.current) {
        retryTimeout.current = setTimeout(() => connect(), 5000);
      }
    };

    ws.onerror = () => {
      // Close event carries the code/reason — handled in onclose
    };

  }, [ticker, apiKey, apiSecret]);

  useEffect(() => {
    intentionallyClosed.current = false;
    connect();

    return () => {
      intentionallyClosed.current = true;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  return { lastTick, isConnected };
}
