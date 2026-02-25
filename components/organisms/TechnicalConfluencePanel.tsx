import React from 'react';
import { TechnicalIndicators } from "@/lib/technical-analysis";
import { fmtPct } from "@/lib/format";
import { AIIcon } from "@/components/Icons";

interface TechnicalConfluencePanelProps {
  tech: TechnicalIndicators;
}

export const TechnicalConfluencePanel = React.memo(function TechnicalConfluencePanel({ tech }: TechnicalConfluencePanelProps) {
  if (!tech.isValid) return null;

  const getSignalColor = (signal: TechnicalIndicators['signal']) => {
    switch (signal) {
      case 'STRONG BUY': return 'text-bull';
      case 'BUY': return 'text-bull';
      case 'STRONG SELL': return 'text-bear';
      case 'SELL': return 'text-bear';
      default: return 'text-zinc-400';
    }
  };

  const getRsiLabel = (rsi: number) => {
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  };

  return (
    <section className="bg-[#0a0a0a] p-6 relative overflow-hidden border border-white/10">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full shadow-none" />
          <div>
            <h2 className="text-[15px] font-bold tracking-[0.15em] text-white uppercase">Technical Confluence</h2>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Algorithm Consensus & Momentum Vector</p>
          </div>
        </div>
        
        {/* Core Score Badge */}
        <div className="flex flex-col items-end gap-1">
          <span className={`text-2xl font-mono font-bold tracking-tight ${getSignalColor(tech.signal)}`}>
            {tech.confluenceScore.toFixed(0)}<span className="text-sm opacity-50 ml-1">INDEX</span>
          </span>
          <span className={`text-[11px] font-bold tracking-[0.15em] px-3 py-1 uppercase mt-1 border shadow-none ${
            ['STRONG BUY', 'BUY'].includes(tech.signal) ? 'bg-bull/10 border-bull/30 text-bull' : 
            ['STRONG SELL', 'SELL'].includes(tech.signal) ? 'bg-bear/10 border-bear/30 text-bear' : 
            'bg-transparent border-white/20 text-zinc-400'
          }`}>
            {tech.signal}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        
        {/* 1. RSI */}
        <div className="flex flex-col p-5 bg-[#111111] border border-white/10 transition-all hover:border-white/20 hover:scale-[1.01]">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Relative Strength</span>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-mono font-bold ${tech.rsi14 > 70 ? 'text-bear' : tech.rsi14 < 30 ? 'text-bull' : 'text-white'}`}>
              {tech.rsi14.toFixed(1)}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${tech.rsi14 > 70 ? 'text-bear' : tech.rsi14 < 30 ? 'text-bull' : 'text-zinc-500'}`}>{getRsiLabel(tech.rsi14)}</span>
          </div>
          <div className="w-full h-1 bg-white/10 overflow-hidden mt-2 relative">
             <div className="absolute left-[30%] w-[1px] h-full bg-white/30 z-10" />
             <div className="absolute left-[70%] w-[1px] h-full bg-white/30 z-10" />
             <div 
               className={`h-full transition-all duration-1000 ${tech.rsi14 > 70 ? 'bg-bear' : tech.rsi14 < 30 ? 'bg-bull' : 'bg-white'}`} 
               style={{ width: `${Math.min(100, Math.max(0, tech.rsi14))}%` }} 
             />
          </div>
        </div>

        {/* 2. MACD */}
        <div className="flex flex-col p-5 bg-[#111111] border border-white/10 transition-all hover:border-white/20 hover:scale-[1.01]">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Momentum (MACD)</span>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-mono font-bold ${tech.macd.histogram > 0 ? 'text-bull' : 'text-bear'}`}>
              {tech.macd.histogram > 0 ? '+' : ''}{tech.macd.histogram.toFixed(1)}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${tech.macd.histogram > 0 ? 'text-bull' : 'text-bear'}`}>
              {tech.macd.histogram > 0 ? 'BULLISH' : 'BEARISH'}
            </span>
          </div>
          <div className="flex text-[11px] font-mono font-bold text-zinc-500 justify-between mt-4 px-1 border-t border-white/10 pt-3">
            <span>DIFF: {tech.macd.line.toFixed(2)}</span>
            <span>SIG: {tech.macd.signal.toFixed(2)}</span>
          </div>
        </div>

        {/* 3. Bollinger Bands %B */}
        <div className="flex flex-col p-5 bg-[#111111] border border-white/10 transition-all hover:border-white/20 hover:scale-[1.01]">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Volatility (BB %B)</span>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-mono font-bold ${tech.bollingerBands.percentB > 1 ? 'text-bear' : tech.bollingerBands.percentB < 0 ? 'text-bull' : 'text-white'}`}>
              {(tech.bollingerBands.percentB * 100).toFixed(1)}%
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${tech.bollingerBands.percentB > 1 ? 'text-bear' : tech.bollingerBands.percentB < 0 ? 'text-bull' : 'text-zinc-500'}`}>
               {tech.bollingerBands.percentB > 0.5 ? 'High Range' : 'Low Range'}
            </span>
          </div>
          <div className="w-full h-1 bg-white/10 overflow-hidden mt-3 relative">
             <div className="absolute left-0 w-[1px] h-full bg-bull/50 z-10" />
             <div className="absolute right-0 w-[1px] h-full bg-bear/50 z-10" />
             <div 
               className={`h-full bg-white transition-all duration-1000`} 
               style={{ 
                 width: '4px', 
                 marginLeft: `${Math.min(100, Math.max(0, tech.bollingerBands.percentB * 100))}%`,
                 transform: 'translateX(-50%)' 
               }} 
             />
          </div>
        </div>

      </div>
    </section>
  );
});
