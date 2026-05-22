"use client";
import React from 'react';
import Link from 'next/link';
import { LiveHeaderPrice } from "@/components/molecules/LiveHeaderPrice";
import { useAlpacaTape } from "@/hooks/useAlpacaTape";

interface LiveHeaderProps {
  ticker: string;
  name: string;
  exchange: string;

  trend: string;
  initialPrice: number;
  initialDayChange: number;
  initialDayChangePercent: number;
  currency: string;
}

export function LiveHeader({
  ticker,
  name,
  exchange,

  trend,
  initialPrice,
  initialDayChange,
  initialDayChangePercent,
  currency
}: LiveHeaderProps) {
  const { lastTick } = useAlpacaTape(ticker);

  return (
    <header className="glass-panel z-[100] flex items-center px-8 sticky top-0 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="w-full flex items-center justify-between py-3.5">
        {/* LEFT: Back + Identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-4 text-zinc-500 hover:text-white transition-all">
            <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-all group-active:scale-95 shadow-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold tracking-tight text-[15px] text-white group-hover:text-zinc-300 transition-colors uppercase leading-tight">{name}</span>
              <span className="text-[10.5px] font-bold text-zinc-500 tracking-wider uppercase font-mono mt-0.5">{ticker} · {exchange}</span>
            </div>
          </Link>
 
          {/* Trend Badge */}
          <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-8">
            <div className={`px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
              trend === 'BULLISH' ? 'bg-bull/10 border-bull/20 text-bull' :
              trend === 'BEARISH' ? 'bg-bear/10 border-bear/20 text-bear' :
              'bg-white/[0.02] border-white/10 text-zinc-400'
            }`}>
              {trend === 'BULLISH' ? 'Bullish Outlook' : trend === 'BEARISH' ? 'Bearish Outlook' : 'Neutral Outlook'}
            </div>
          </div>
        </div>
 
        {/* RIGHT: Live Price */}
        <LiveHeaderPrice 
          initialPrice={initialPrice}
          lastTick={lastTick}
          initialDayChange={initialDayChange}
          initialDayChangePercent={initialDayChangePercent}
          currency={currency}
        />
      </div>
    </header>
  );
}
