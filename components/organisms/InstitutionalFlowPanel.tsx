import React from 'react';
import { TechnicalIndicators } from "@/lib/technical-analysis";
import { OptionsFlow } from "@/lib/stock-details";
import { fmt, fmtPct } from "@/lib/format";
import { AIIcon } from "@/components/Icons";

interface InstitutionalFlowPanelProps {
  tech: TechnicalIndicators;
  optionsFlow: OptionsFlow | null;
  currentPrice: number;
}

export const InstitutionalFlowPanel = React.memo(function InstitutionalFlowPanel({ tech, optionsFlow, currentPrice }: InstitutionalFlowPanelProps) {
  const blocks = tech.orderBlocks || [];

  let impliedMove = null;
  let expectedUpper = null;
  let expectedLower = null;
  let daysToExp = 0;

  if (optionsFlow?.impliedVolatility && optionsFlow.nearestExpiration) {
    const expDate = new Date(optionsFlow.nearestExpiration);
    const today = new Date();
    daysToExp = Math.max(1, Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
    
    // Standard IV Implied Move formula: Price * IV * sqrt(DaysToExpiration / 365)
    impliedMove = currentPrice * optionsFlow.impliedVolatility * Math.sqrt(daysToExp / 365);
    expectedUpper = currentPrice + impliedMove;
    expectedLower = currentPrice - impliedMove;
  }

  return (
    <section className="bg-[#0a0a0a] p-6 relative overflow-hidden border border-white/10 mt-6 md:mt-10">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-[1px] shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <div>
            <h2 className="text-[15px] font-bold tracking-[0.15em] text-white uppercase">Institutional Flow Engines</h2>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Order Blocks (FVG) & Volatility Expected Move</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">

        {/* ORDER BLOCKS (FVGS) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-300">Unmitigated Fair Value Gaps</span>
          </div>

          <div className="grid grid-cols-1 gap-y-3">
            {blocks.length === 0 ? (
              <div className="text-[12px] text-zinc-500 font-medium p-4 border border-white/5 bg-black/40">No unmitigated gaps detected in recent 90-day history.</div>
            ) : (
              blocks.map((b, i) => (
                <div key={i} className={`flex justify-between items-center p-3 border shadow-inner ${b.type === 'BULLISH' ? 'bg-[#052e16]/30 border-bull/20' : 'bg-[#450a0a]/30 border-bear/20'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${b.type === 'BULLISH' ? 'text-bull' : 'text-bear'}`}>{b.type} FVG (Demand)</span>
                    <span className="text-[10px] font-medium text-zinc-500 mt-0.5">{b.date}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[13px] font-bold tracking-widest ${b.type === 'BULLISH' ? 'text-bull' : 'text-bear'}`}>{fmt(b.top)} - {fmt(b.bottom)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* IMPLIED MOVE FROM OPTIONS */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-2 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-300">Options Implied Move Target</span>
            {optionsFlow?.nearestExpiration && (
              <span className="text-[9px] uppercase tracking-widest text-[#38bdf8]">Expiring {optionsFlow.nearestExpiration} ({daysToExp} Days)</span>
            )}
          </div>

          {!impliedMove ? (
            <div className="text-[12px] text-zinc-500 font-medium p-4 border border-white/5 bg-black/40">Options data unavailable for derivation.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-black/40 border border-white/5 p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8]/50 to-transparent" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">+/- Expected Delta</span>
                <span className="text-[16px] font-black tracking-widest text-[#38bdf8]">{fmt(impliedMove)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#052e16]/20 border border-bull/20 p-4 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-bull/80 mb-2">Market Maker Call Wall</span>
                  <span className="text-[15px] font-bold text-bull">{fmt(expectedUpper)}</span>
                </div>
                <div className="bg-[#450a0a]/20 border border-bear/20 p-4 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-bear/80 mb-2">Market Maker Put Wall</span>
                  <span className="text-[15px] font-bold text-bear">{fmt(expectedLower)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
});
