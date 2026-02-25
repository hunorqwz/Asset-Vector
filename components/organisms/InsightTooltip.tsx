"use client";
import React, { useState, useEffect } from 'react';

export function InsightTooltip({ insight }: { insight: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-4 h-4 flex items-center justify-center">
        <div className="w-3 h-3 border border-zinc-700 flex items-center justify-center text-[7px] text-zinc-500 font-bold bg-transparent">
          i
        </div>
      </div>
    );
  }

  return (
    <div className="group/tip relative flex items-center justify-center w-5 h-5 -ml-1">
      <div className="w-3.5 h-3.5 border border-zinc-600 flex items-center justify-center text-[8px] font-bold text-zinc-400 cursor-help group-hover/tip:border-white group-hover/tip:text-white group-hover/tip:bg-white/10 transition-all duration-300">
        i
      </div>
      
      {/* TOOLTIP CONTENT */}
      {/* Used bottom-[120%] to ensure it sits above and is not clipped by parent containers easily */}
      <div className="absolute bottom-[140%] left-1/2 -translate-x-1/2 mb-2 w-[240px] invisible group-hover/tip:visible opacity-0 group-hover/tip:opacity-100 z-[100] pointer-events-none transition-all duration-300 origin-bottom">
        <div className="bg-[#111111] p-4 border border-white/20 shadow-none">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h5 className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold">{insight.label}</h5>
              <div className="w-1.5 h-1.5 bg-white shadow-none" />
            </div>
            
            <p className="text-[11px] text-white/90 leading-relaxed font-semibold">{insight.shortDesc}</p>
            <p className="text-[10px] text-zinc-400 leading-relaxed italic">{insight.context}</p>
            
            {insight.idealRange && (
              <div className="mt-1 px-2.5 py-1.5 bg-transparent border border-white/20 flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 uppercase tracking-tighter font-bold">Recommended:</span>
                <span className="text-[10px] text-white font-mono font-bold tracking-tight">{insight.idealRange}</span>
              </div>
            )}
          </div>
          {/* Enhanced Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 -mt-1.5 rotate-45 bg-[#111111] border-r border-b border-white/20" />
        </div>
      </div>
    </div>
  );
}
