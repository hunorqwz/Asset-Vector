"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface AlpacaTick {
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
}

interface AlpacaContextType {
  isConnected: boolean;
  subscribe: (ticker: string) => void;
  unsubscribe: (ticker: string) => void;
  ticks: Record<string, AlpacaTick>;
}

const AlpacaContext = createContext<AlpacaContextType>({
  isConnected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  ticks: {}
});

export function AlpacaProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [ticks, setTicks] = useState<Record<string, AlpacaTick>>({});
  
  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Record<string, number>>({});
  const activeSubsRef = useRef<Set<string>>(new Set());
  const intentionallyClosed = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;

  const connect = useCallback(() => {
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    if (!apiKey || !apiSecret) return;
    if (intentionallyClosed.current) return;

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
            const tempSubs = Array.from(activeSubsRef.current);
            if (tempSubs.length > 0) {
               ws.send(JSON.stringify({ action: "subscribe", trades: tempSubs }));
            }
          } else if (msg.T === "error") {
             console.warn(`[Alpaca Unified System] Stream error: [${msg.code}] ${msg.msg}`);
             if (msg.code === 409 || msg.code === 403) {
               intentionallyClosed.current = true;
               ws.close();
             }
          } else if (msg.T === "t" && msg.S) {
            setTicks(prev => {
              // Only update if the price or timestamp actually changed to prevent React render thrashing
              const existing = prev[msg.S];
              if (existing && existing.price === msg.p && existing.timestamp === msg.t) {
                return prev;
              }
              return {
                ...prev,
                [msg.S]: { price: msg.p, size: msg.s, timestamp: msg.t, exchange: msg.x }
              };
            });
          }
        });
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!intentionallyClosed.current) {
        retryTimeout.current = setTimeout(() => connect(), 5000);
      }
    };
  }, [apiKey, apiSecret]);

  useEffect(() => {
    intentionallyClosed.current = false;
    connect();
    return () => {
      intentionallyClosed.current = true;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  const subscribe = useCallback((ticker: string) => {
    if (!ticker) return;
    const subs = subscribersRef.current;
    subs[ticker] = (subs[ticker] || 0) + 1;
    
    if (subs[ticker] === 1) {
       activeSubsRef.current.add(ticker);
       if (socketRef.current?.readyState === WebSocket.OPEN && isConnected) {
          socketRef.current.send(JSON.stringify({ action: "subscribe", trades: [ticker] }));
       }
    }
  }, [isConnected]);

  const unsubscribe = useCallback((ticker: string) => {
    if (!ticker) return;
    const subs = subscribersRef.current;
    if (subs[ticker]) {
      subs[ticker] -= 1;
      if (subs[ticker] <= 0) {
        delete subs[ticker];
        activeSubsRef.current.delete(ticker);
        if (socketRef.current?.readyState === WebSocket.OPEN && isConnected) {
           socketRef.current.send(JSON.stringify({ action: "unsubscribe", trades: [ticker] }));
        }
      }
    }
  }, [isConnected]);

  return (
    <AlpacaContext.Provider value={{ isConnected, subscribe, unsubscribe, ticks }}>
      {children}
    </AlpacaContext.Provider>
  );
}

export const useAlpacaContext = () => useContext(AlpacaContext);
