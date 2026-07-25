"use client";
import { useEffect } from 'react';
import { useMarketDataContext, MarketTick } from '@/components/providers/MarketDataProvider';

export type { MarketTick };

export function useMarketDataTape(ticker: string) {
  const { isConnected, subscribe, unsubscribe, ticks } = useMarketDataContext();

  useEffect(() => {
    if (ticker) subscribe(ticker);
    return () => {
      if (ticker) unsubscribe(ticker);
    };
  }, [ticker, subscribe, unsubscribe]);

  return { lastTick: ticks[ticker] || null, isConnected };
}
