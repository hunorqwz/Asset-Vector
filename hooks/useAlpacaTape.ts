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

  // We use process.env but since this is client side, we'll need NEXT_PUBLIC_ prefixes 
  // if we want to access them directly in the browser, OR we use a proxy.
  // For now, I'll assume the user will provide NEXT_PUBLIC_ prefixes for a dev environment 
  // or I'll implement a secure way. Let's assume NEXT_PUBLIC_ for now as per "dev environment" keys.
  const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;

  const connect = useCallback(() => {
    if (!ticker || !apiKey || !apiSecret) return;

    // Use IEX for free tier
    const url = "wss://stream.data.alpaca.markets/v2/iex";
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[Alpaca] WebSocket Connected");
      // Step 1: Auth
      ws.send(JSON.stringify({
        action: "auth",
        key: apiKey,
        secret: apiSecret
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      data.forEach((msg: any) => {
        if (msg.msg === "authenticated") {
          setIsConnected(true);
          // Step 2: Subscribe to trades
          ws.send(JSON.stringify({
            action: "subscribe",
            trades: [ticker]
          }));
        } else if (msg.T === "t") {
          // It's a trade tick
          setLastTick({
            price: msg.p,
            size: msg.s,
            timestamp: msg.t,
            exchange: msg.x
          });
        }
      });
    };

    ws.onclose = () => {
      console.log("[Alpaca] WebSocket Closed");
      setIsConnected(false);
      // Reconnect logic
      setTimeout(() => connect(), 5000);
    };

    ws.onerror = (err) => {
      console.error("[Alpaca] WebSocket Error:", err);
    };

  }, [ticker, apiKey, apiSecret]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { lastTick, isConnected };
}
