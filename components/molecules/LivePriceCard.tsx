"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fmt } from "@/lib/format";
import { AlpacaTick } from "@/hooks/useAlpacaTape";

export function LivePriceCard({ 
  label, 
  initialPrice, 
  lastTick, 
  dayChange 
}: { 
  label: string; 
  initialPrice: number; 
  lastTick: AlpacaTick | null;
  dayChange: number;
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

      const timer = setTimeout(() => setPulse(null), 300);
      return () => clearTimeout(timer);
    }
  }, [lastTick]);

  const currentChange = lastTick ? (lastTick.price - initialPrice + dayChange) : dayChange;
  const isBull = currentChange >= 0;

  return (
    <div className={`p-4 flex flex-col justify-between h-full bg-[#0a0a0a] border border-white/10 -ml-px -mt-px first:ml-0 transition-all duration-300 ${
      pulse === "UP" ? "bg-bull/10" : pulse === "DOWN" ? "bg-bear/10" : "hover:bg-[#111111]"
    }`}>
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">{label}</span>
          {lastTick && (
             <div className="flex items-center gap-1.5">
               <span className="relative flex h-1.5 w-1.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-bull"></span>
               </span>
               <span className="text-[9px] font-bold text-bull uppercase tracking-tighter">Live</span>
             </div>
          )}
        </div>
        <span className={`text-[17px] font-mono font-bold tabular-nums tracking-tight block leading-none transition-colors duration-300 ${
          pulse === "UP" ? "text-bull" : pulse === "DOWN" ? "text-bear" : "text-white"
        }`}>
          {fmt(displayPrice)}
        </span>
      </div>
      <span className={`text-[11px] font-mono font-bold mt-2 tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
        {isBull ? `+${fmt(currentChange)}` : fmt(currentChange)}
      </span>
    </div>
  );
}
