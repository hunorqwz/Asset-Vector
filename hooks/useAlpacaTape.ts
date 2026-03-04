"use client";
import { useEffect } from 'react';
import { useAlpacaContext, AlpacaTick } from '@/components/providers/AlpacaProvider';

export type { AlpacaTick };

export function useAlpacaTape(ticker: string) {
  const { isConnected, subscribe, unsubscribe, ticks } = useAlpacaContext();

  useEffect(() => {
    if (ticker) subscribe(ticker);
    return () => {
      if (ticker) unsubscribe(ticker);
    };
  }, [ticker, subscribe, unsubscribe]);

  return { lastTick: ticks[ticker] || null, isConnected };
}
