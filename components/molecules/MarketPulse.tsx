"use client";
import { SectorMetric, MarketPulseData } from "@/lib/market-pulse";
import { fmtChange } from "@/lib/format";

interface MarketPulseProps {
  data: MarketPulseData;
}

export function MarketPulse({ data }: MarketPulseProps) {
  const { breadthPercent, sectors, breadthAdvancing, breadthDeclining, macro } = data;

  return (
    <div className="space-y-6">
      {/* Macro Environment */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
          Macro pulse
        </h2>
        <div className="flex flex-col gap-5">
           <MacroPanelItem name="SPY" desc="S&P 500 ETF" value={macro.spy.value.toFixed(2)} change={macro.spy.change} />
           <MacroPanelItem name="QQQ" desc="Nasdaq 100 ETF" value={macro.qqq.value.toFixed(2)} change={macro.qqq.change} />
           <MacroPanelItem name="BTC" desc="Bitcoin" value={macro.btc.value.toFixed(2)} change={macro.btc.change} />
           <div className="h-px bg-white/5 w-full my-1" />
           <MacroPanelItem name="VIX" desc="Volatility Index" value={macro.vix.value.toFixed(2)} change={macro.vix.change} />
           <MacroPanelItem name="DXY" desc="US Dollar Index" value={macro.dxy.value.toFixed(2)} change={macro.dxy.change} />
           <MacroPanelItem name="US10Y" desc="10Y Treasury" value={`${macro.us10y.value.toFixed(2)}%`} change={macro.us10y.change} />
        </div>
      </div>

      {/* Breadth Engine Widget */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${breadthPercent >= 50 ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
          Breadth Engine
        </h2>
        
        <div className="flex flex-col sm:flex-row items-baseline sm:justify-between mb-4 gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tighter">{breadthPercent}%</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Advancing</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400">
            <span className="flex items-center gap-0.5">{breadthAdvancing}<span className="text-bull text-[9px] sm:text-[10px]">▲</span></span>
            <span className="opacity-30">/</span>
            <span className="flex items-center gap-0.5">{breadthDeclining}<span className="text-bear text-[9px] sm:text-[10px]">▼</span></span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
          <div 
            className="h-full bg-gradient-to-r from-matrix to-bull transition-all duration-1000 ease-out" 
            style={{ width: `${breadthPercent}%` }} 
          />
          <div 
            className="h-full bg-bear/40 transition-all duration-1000 ease-out" 
            style={{ width: `${100 - breadthPercent}%` }} 
          />
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1.5 sm:gap-1 mt-4 text-[9px] sm:text-[8px] font-bold tracking-tight sm:tracking-widest uppercase text-zinc-600">
          <div className="flex justify-between items-center sm:block">
            <span className="text-left">Oversold</span>
            <span className="sm:hidden text-[10px] text-zinc-800">0-30%</span>
          </div>
          <div className="flex justify-between items-center sm:block">
            <span className="text-left sm:text-center">Balanced</span>
            <span className="sm:hidden text-[10px] text-zinc-800">30-70%</span>
          </div>
          <div className="flex justify-between items-center sm:block">
            <span className="text-left sm:text-right">Overbought</span>
            <span className="sm:hidden text-[10px] text-zinc-800">70-100%</span>
          </div>
        </div>
      </div>

      {/* Sector Momentum Heatmap */}
      <div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix" />
          Sector Momentum
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {sectors.map((s) => (
            <SectorRow key={s.ticker} sector={s} />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
           <p className="text-[9px] text-zinc-600 font-medium leading-relaxed italic uppercase tracking-tighter">
             Institutional participation proxy via SPDR sector ETFs. 
           </p>
        </div>
      </div>
    </div>
  );
}

function MacroPanelItem({ name, desc, value, change }: { name: string; desc: string; value: string; change: number }) {
  const isUp = change >= 0;
  return (
    <div className="flex items-center justify-between group/item">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white tracking-tight">{name}</span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">{desc}</p>
      </div>
      <div className="text-right">
        <span className="text-[13px] font-bold font-mono text-zinc-400 group-hover/item:text-white transition-colors">{value}</span>
      </div>
    </div>
  );
}

function SectorRow({ sector }: { sector: SectorMetric }) {
  const isUp = sector.changePercent > 0;
  
  return (
    <div className="flex items-center justify-between group/row">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-3 rounded-full transition-all duration-300 ${isUp ? 'bg-bull' : 'bg-bear/40'}`} />
        <span className="text-[11px] font-bold text-zinc-400 group-hover/row:text-white transition-colors uppercase tracking-tight">
          {sector.name}
        </span>
      </div>
      <div className="flex items-center gap-4">
         <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-bull' : 'text-bear'}`}>
           {isUp ? '+' : ''}{sector.changePercent.toFixed(2)}%
         </span>
         <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full ${isUp ? 'bg-bull' : 'bg-bear'} transition-all duration-500`}
              style={{ width: `${Math.min(Math.abs(sector.changePercent) * 10, 100)}%` }}
            />
         </div>
      </div>
    </div>
  );
}
