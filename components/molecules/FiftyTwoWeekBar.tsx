import React from 'react';
import { fmt } from "@/lib/format";

export function FiftyTwoWeekBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;
  const clampedPos = Math.max(0, Math.min(100, position));

  return (
    <div className="space-y-3">
      <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
        <div className="absolute h-full rounded-full bg-gradient-to-r from-bear/30 via-white/10 to-bull/30" style={{ width: '100%' }} />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white shadow-none transition-all"
          style={{ left: `${clampedPos}%`, marginLeft: '-7px' }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[9px] text-zinc-600">52W Low</span>
          <span className="text-[11px] font-mono text-bear/80 tabular-nums">{fmt(low)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-zinc-600">Current</span>
          <span className="text-[11px] font-mono text-white font-semibold tabular-nums">{fmt(current)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-zinc-600">52W High</span>
          <span className="text-[11px] font-mono text-bull/80 tabular-nums">{fmt(high)}</span>
        </div>
      </div>
    </div>
  );
}
