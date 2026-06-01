"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface AlpacaTick {
  ticker: string;
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
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Record<string, number>>({});
  const activeSubsRef = useRef<Set<string>>(new Set());
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback((tickers: string[]) => {
    // Clean up previous event source connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (tickers.length === 0) {
      setIsConnected(false);
      return;
    }

    const url = `/api/ticks?tickers=${encodeURIComponent(tickers.join(","))}`;
    console.log(`[Alpaca Provider] Subscribing via SSE stream: ${url}`);
    
    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        setIsConnected(true);
      });

      es.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          if (tick && tick.ticker) {
            setTicks((prev) => {
              const existing = prev[tick.ticker];
              if (existing && existing.price === tick.price && existing.timestamp === tick.timestamp) {
                return prev;
              }
              return {
                ...prev,
                [tick.ticker]: tick,
              };
            });
          }
        } catch {
          // ignore malformed SSE messages
        }
      };

      es.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error("[Alpaca Provider] Failed to connect EventSource:", err);
      setIsConnected(false);
    }
  }, []);

  // Debounced sync to combine multiple subscriptions mounted in the same frame
  const syncSubscriptions = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const tickers = Array.from(activeSubsRef.current);
      connect(tickers);
    }, 100);
  }, [connect]);

  const subscribe = useCallback((ticker: string) => {
    if (!ticker) return;
    const subs = subscribersRef.current;
    subs[ticker] = (subs[ticker] || 0) + 1;
    
    if (subs[ticker] === 1) {
      activeSubsRef.current.add(ticker);
      syncSubscriptions();
    }
  }, [syncSubscriptions]);

  const unsubscribe = useCallback((ticker: string) => {
    if (!ticker) return;
    const subs = subscribersRef.current;
    if (subs[ticker]) {
      subs[ticker] -= 1;
      if (subs[ticker] <= 0) {
        delete subs[ticker];
        activeSubsRef.current.delete(ticker);
        syncSubscriptions();
      }
    }
  }, [syncSubscriptions]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return (
    <AlpacaContext.Provider value={{ isConnected, subscribe, unsubscribe, ticks }}>
      {children}
    </AlpacaContext.Provider>
  );
}

export const useAlpacaContext = () => useContext(AlpacaContext);
