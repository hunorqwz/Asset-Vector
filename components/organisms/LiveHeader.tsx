"use client";
import React from 'react';
import Link from 'next/link';
import { Badge } from "@/components/atoms/Badge";
import { LiveHeaderPrice } from "@/components/molecules/LiveHeaderPrice";
import { useAlpacaTape } from "@/hooks/useAlpacaTape";

interface LiveHeaderProps {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
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
  sector,
  industry,
  trend,
  initialPrice,
  initialDayChange,
  initialDayChangePercent,
  currency
}: LiveHeaderProps) {
  const { lastTick } = useAlpacaTape(ticker);

  return (
    <header className="glass-panel z-[100] flex items-center px-8 sticky top-0 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="w-full flex items-center justify-between py-4">
        {/* LEFT: Back + Identity */}
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-5 text-zinc-500 hover:text-white transition-all">
            <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-all group-active:scale-95 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tightest text-sm text-white group-hover:text-matrix transition-colors uppercase leading-tight">{name}</span>
              <span className="text-[11px] font-bold text-zinc-500 tracking-[0.1em] uppercase">{ticker} · {exchange}</span>
            </div>
          </Link>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-10">
            <Badge label={sector} />
            <Badge label={industry} />
            <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase border ${
              trend === 'BULLISH' ? 'bg-bull/15 border-bull/30 text-bull' :
              trend === 'BEARISH' ? 'bg-bear/15 border-bear/30 text-bear' :
              'bg-white/5 border-white/15 text-zinc-400'
            }`}>
              {trend === 'BULLISH' ? 'Bullish' : trend === 'BEARISH' ? 'Bearish' : 'Neutral'} Force
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
