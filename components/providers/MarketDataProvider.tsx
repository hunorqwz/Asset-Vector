"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface MarketTick {
  ticker: string;
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
}

interface MarketDataContextType {
  isConnected: boolean;
  latency: number | null;
  subscribe: (ticker: string) => void;
  unsubscribe: (ticker: string) => void;
  ticks: Record<string, MarketTick>;
}

const MarketDataContext = createContext<MarketDataContextType>({
  isConnected: false,
  latency: null,
  subscribe: () => {},
  unsubscribe: () => {},
  ticks: {}
});

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [ticks, setTicks] = useState<Record<string, MarketTick>>({});
  
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

    // Connect to the unified Databento CME GLOBEX streaming endpoint
    const url = `/api/futures/stream?symbols=${encodeURIComponent(tickers.join(","))}`;
    console.log(`[Market Data Provider] Connecting to Databento SSE stream: ${url}`);
    
    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        setIsConnected(true);
      });

      es.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          
          if (envelope && envelope.type === "tick") {
            const tick = envelope;
            
            // Calculate streaming latency from Databento ticks timestamps
            if (tick.timestamp) {
              const now = Date.now();
              const sentTime = new Date(tick.timestamp).getTime();
              if (!isNaN(sentTime)) {
                setLatency(Math.max(0, now - sentTime));
              }
            }
            
            if (tick.event === "trade") {
              setTicks((prev) => {
                const existing = prev[tick.ticker];
                if (existing && existing.price === tick.price && existing.timestamp === tick.timestamp) {
                  return prev;
                }
                return {
                  ...prev,
                  [tick.ticker]: {
                    ticker: tick.ticker,
                    price: tick.price,
                    size: tick.size ?? 0,
                    timestamp: tick.timestamp,
                    exchange: tick.side ?? "N",
                  },
                };
              });
            }
          }
        } catch {
          // ignore malformed SSE messages
        }
      };

      es.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error("[Market Data Provider] Failed to connect EventSource:", err);
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
    <MarketDataContext.Provider value={{ isConnected, latency, subscribe, unsubscribe, ticks }}>
      {children}
    </MarketDataContext.Provider>
  );
}

export const useMarketDataContext = () => useContext(MarketDataContext);
