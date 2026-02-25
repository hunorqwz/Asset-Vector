"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fmt, fmtChange } from "@/lib/format";
import { AlpacaTick } from "@/hooks/useAlpacaTape";

export function LiveHeaderPrice({ 
  initialPrice, 
  lastTick, 
  initialDayChange,
  initialDayChangePercent,
  currency 
}: { 
  initialPrice: number; 
  lastTick: AlpacaTick | null;
  initialDayChange: number;
  initialDayChangePercent: number;
  currency: string;
}) {
  const [displayPrice, setDisplayPrice] = useState(initialPrice);
  const [pulse, setPulse] = useState<"UP" | "DOWN" | null>(null);
  const prevPriceRef = useRef(initialPrice);

  useEffect(() => {
    if (lastTick) {
      const newPrice = lastTick.price;
      if (newPrice > prevPriceRef.current) {
        setPulse("UP");
      } else if (newPrice < prevPriceRef.current) {
        setPulse("DOWN");
      }
      
      setDisplayPrice(newPrice);
      prevPriceRef.current = newPrice;

      const timer = setTimeout(() => setPulse(null), 400);
      return () => clearTimeout(timer);
    }
  }, [lastTick]);

  const currentChange = lastTick ? (lastTick.price - initialPrice + initialDayChange) : initialDayChange;
  const currentChangePercent = lastTick ? (currentChange / (initialPrice - initialDayChange)) * 100 : initialDayChangePercent;
  const isBull = currentChange >= 0;

  return (
    <div className="flex items-center gap-10">
      <div className="flex flex-col items-end">
        <span className={`text-xl font-mono font-bold tabular-nums tracking-tighter transition-colors duration-300 ${
          pulse === "UP" ? "text-bull" : pulse === "DOWN" ? "text-bear" : "text-white"
        }`}>
          {fmt(displayPrice, currency)}
        </span>
        <div className={`flex items-center gap-2 text-[11px] font-bold font-mono tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
          <span>{isBull ? '▲' : '▼'} {fmtChange(currentChange)}</span>
          <span className={`px-2 py-0.5 rounded-md ${isBull ? 'bg-bull/15' : 'bg-bear/15'}`}>
            {isBull ? '+' : ''}{currentChangePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] mb-0.5 transition-colors ${lastTick ? 'bg-bull animate-pulse' : 'bg-zinc-600'}`} />
        <span className={`text-[11px] font-bold uppercase tracking-widest ${lastTick ? 'text-bull' : 'text-zinc-500'}`}>Live</span>
      </div>
    </div>
  );
}
