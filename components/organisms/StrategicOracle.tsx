"use client";
import React, { useState } from 'react';
import { StrategicInsight } from '@/app/actions/ai';
import { GlassBoxTheory } from '@/components/organisms/GlassBoxTheory';
import { OHLCV } from '@/lib/market-data';

import { NewsArticle } from '@/lib/stock-details';

interface StrategicOracleProps {
  ticker: string;
  history: OHLCV[];
  news: NewsArticle[];
  insight: StrategicInsight | null;
  isExtracting: boolean;
  error: string | null;
  onExtract: () => void;
  globalTrigger?: boolean;
}

const horizons: Record<string, "shortTerm" | "midTerm" | "longTerm"> = {
  'SHORT': 'shortTerm',
  'MID': 'midTerm',
  'LONG': 'longTerm'
};

export const StrategicOracle = ({ 
  ticker, history, news, insight, isExtracting, error, onExtract, globalTrigger 
}: StrategicOracleProps) => {
  const [activeTab, setActiveTab] = useState<'SHORT' | 'MID' | 'LONG'>('SHORT');
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

  if (!insight) {
    const isQuota = error === 'CAPACITY_LIMIT';
    return (
      <div className="p-12 bg-black/20 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center mb-8 text-zinc-600 font-mono text-2xl bg-black/40 shadow-inner">
           {isQuota ? "!" : "Σ"}
        </div>
        <h3 className="text-base font-bold text-white mb-3 uppercase tracking-[0.25em]">
          {isQuota ? 'Resource Exhausted' : 'Intelligence Offline'}
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mb-10 leading-relaxed font-medium">
          {isQuota 
            ? 'Our neural processing engines are currently at maximum capacity. Reset incoming in 60s.'
            : 'Initialize the strategic intelligence core for deep-market pattern recognition and automated forecasting.'}
        </p>
        <div className="flex gap-10">
          <button onClick={() => setIsTheoryOpen(true)} className="text-[10px] text-zinc-500 hover:text-white transition-all uppercase font-bold tracking-[0.2em] border-b border-transparent hover:border-white/20 pb-1">Theory Mode</button>
          <button 
            onClick={onExtract}
            disabled={isExtracting}
            className="flex items-center justify-center min-w-[200px] text-[10px] text-zinc-900 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all font-bold uppercase tracking-[0.2em] px-8 py-3 rounded-lg shadow-xl"
          >
            {isExtracting ? (
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full animate-bounce" />
               </div>
            ) : isQuota ? 'System Re-Sync' : 'Engage Neural Extraction'}
          </button>
        </div>
        <GlassBoxTheory indicator="Oracle" isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} currentData={history} />
      </div>
    );
  }

  const scenario = insight.scenarios[activeScenario];
  const horizonKey = horizons[activeTab];
  const currentHorizon = scenario[horizonKey];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* HEADER & CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
           <div className="w-2 h-2 rounded-full bg-bull animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
           <h3 className="text-sm font-bold text-white uppercase tracking-[0.25em]">Strategic Oracle</h3>
        </div>
        
        <div className="flex items-center bg-black/40 border border-white/5 p-1 rounded-lg">
          {(['conservative', 'balanced', 'aggressive'] as const).map(s => (
            <button 
              key={s} 
              onClick={() => setActiveScenario(s)} 
              className={`px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md ${
                activeScenario === s ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* CORE INSIGHTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-8 bg-black/40 backdrop-blur-md">
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-4">Core Structural Pattern</span>
           <h3 className="text-lg font-bold text-white mb-4 tracking-tight">{insight.patternRecognition.form}</h3>
           <p className="text-[13px] text-zinc-400 leading-relaxed font-medium pl-5 border-l border-zinc-700">
             {insight.patternRecognition.implication}
           </p>
        </div>
        
        <div className="p-8 bg-black/30 backdrop-blur-md">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Market Sentiment Bias</span>
              <span className={`text-[10px] font-bold font-mono tracking-[0.2em] px-3 py-1 rounded-md border ${
                insight.sentiment.bias === 'BULLISH' ? 'bg-bull/10 text-bull border-bull/20' : 
                insight.sentiment.bias === 'BEARISH' ? 'bg-bear/10 text-bear border-bear/20' : 
                'bg-white/5 text-zinc-400 border-white/10'
              }`}>
                {insight.sentiment.bias}
              </span>
           </div>
           <p className="text-[13px] text-zinc-400 leading-relaxed font-medium pl-5 border-l border-white/10">
             {insight.sentiment.nuance}
           </p>
        </div>
      </div>

      {/* FORECAST INTERFACE */}
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
           {(['SHORT', 'MID', 'LONG'] as const).map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab)} 
               className={`flex-1 py-3 text-[10px] font-bold transition-all rounded-lg uppercase tracking-[0.2em] ${
                 activeTab === tab ? 'bg-white/5 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
               }`}
             >
               {tab === 'SHORT' ? '7D Window' : tab === 'MID' ? '90D Outlook' : 'Macro Horizon'}
             </button>
           ))}
        </div>

        <div className="p-10 bg-black/20 border border-white/5 rounded-2xl shadow-inner relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="text-8xl font-bold font-mono text-white select-none">{activeTab}</span>
           </div>
           
           <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="shrink-0 space-y-6">
                 <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-2">Projected Model Target</span>
                    <div className="text-5xl font-extrabold text-white tracking-tighter font-mono tabular-nums">
                      ${currentHorizon.priceTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 font-mono tracking-widest">
                       <span>PROBABILITY ENGINE</span>
                       <span>{(currentHorizon.probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full lg:w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out" 
                         style={{ width: `${currentHorizon.probability * 100}%` }} 
                       />
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 lg:max-w-2xl">
                 <div className="relative">
                    <span className="absolute -left-10 -top-4 text-4xl text-zinc-800 font-serif leading-none">“</span>
                    <p className="text-[15px] text-zinc-300 leading-relaxed font-medium">
                      {currentHorizon.rationale}
                    </p>
                    <span className="absolute -right-4 -bottom-4 text-4xl text-zinc-800 font-serif leading-none">”</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* SYSTEMIC RISK MONITOR */}
      <div className="p-6 rounded-xl border border-bear/10 bg-bear/5 flex items-center justify-between group">
         <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-bear animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
               <span className="text-[10px] font-bold text-bear/80 uppercase tracking-[0.2em]">Risk Vector Analysis</span>
               <span className="text-xs text-zinc-300 font-medium">{insight.riskAnalysis}</span>
            </div>
         </div>
         <button onClick={() => setIsTheoryOpen(true)} className="text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 text-xs">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
         </button>
      </div>

      <GlassBoxTheory indicator="Oracle" isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} currentData={history} />
    </div>
  );
};
