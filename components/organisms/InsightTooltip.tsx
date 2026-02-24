import React from 'react';

export function InsightTooltip({ insight }: { insight: any }) {
  return (
    <div className="group/tip relative flex items-center">
      <div className="w-3 h-3 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-600 cursor-help group-hover/tip:border-matrix/50 group-hover/tip:text-matrix transition-all">
        i
      </div>
      
      {/* TOOLTIP CONTENT */}
      <div className="absolute left-0 bottom-full mb-3 w-[240px] invisible group-hover/tip:visible opacity-0 group-hover/tip:opacity-100 z-[1000] pointer-events-none transition-all duration-200">
        <div className="glass-panel p-4 bg-black/95 border border-matrix/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] translate-y-2 group-hover/tip:translate-y-0 transition-transform">
          <div className="flex flex-col gap-2">
            <h5 className="text-[10px] uppercase tracking-widest text-matrix font-bold">{insight.label}</h5>
            <p className="text-[11px] text-white/90 leading-relaxed font-medium">{insight.shortDesc}</p>
            <p className="text-[10px] text-zinc-500 leading-relaxed italic border-t border-white/5 pt-2">{insight.context}</p>
            {insight.idealRange && (
              <div className="mt-1 px-2 py-1 bg-matrix/5 border border-matrix/10 rounded">
                <span className="text-[9px] text-matrix/70 uppercase tracking-tighter font-bold">Recommended: </span>
                <span className="text-[10px] text-matrix font-mono">{insight.idealRange}</span>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1.5 -mt-[1px] border-8 border-transparent border-t-matrix/20" />
        </div>
      </div>
    </div>
  );
}
