"use client";
import React, { useState } from 'react';
import { StrategicInsight } from '@/app/actions/ai';
import { OHLCV } from '@/lib/market-data';
import { NarrativeArticle } from '@/lib/types';

interface AIForecastEngineProps {
  ticker: string;
  history: OHLCV[];
  news: NarrativeArticle[];
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

export const AIForecastPanel = ({ 
  ticker, history, news, insight, isExtracting, error, onExtract, globalTrigger 
}: AIForecastEngineProps) => {
  const [activeTab, setActiveTab] = useState<'SHORT' | 'MID' | 'LONG'>('SHORT');
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  if (!insight) {
    const isQuota = error === 'CAPACITY_LIMIT';
    return (
      <div className="p-10 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
        {isExtracting ? (
          <div className="w-full space-y-4 py-6 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/3 mx-auto" />
            <div className="h-8 bg-white/5 rounded w-1/2 mx-auto" />
            <div className="h-20 bg-white/5 rounded w-full mt-4" />
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center mb-6 text-zinc-400 font-mono text-xl bg-black/40">
               {isQuota ? "!" : "∑"}
            </div>
            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-widest">
              {isQuota ? 'API Limit Exceeded' : 'AI Forecast Standby'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed font-medium">
              {isQuota 
                ? 'AI inference processors are currently at capacity. Auto-revalidation will retry shortly.'
                : 'Projections will automatically update once market data loading is complete.'}
            </p>
            {!isQuota && (
              <button 
                onClick={onExtract}
                className="px-6 py-2.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors hover:bg-zinc-200"
              >
                Retry Analysis
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  const scenario = insight.scenarios?.[activeScenario] || {};
  const horizonKey = horizons[activeTab];
  const currentHorizon = scenario[horizonKey] || { priceTarget: 0, probability: 0, rationale: 'Data unavailable.' };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* HEADER & CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
           <div className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
           <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Forecast & Projection Model</h3>
        </div>
        
        <div className="flex items-center bg-black/30 border border-white/5 p-1 rounded-lg">
          {(['conservative', 'balanced', 'aggressive'] as const).map(s => (
            <button 
              key={s} 
              onClick={() => setActiveScenario(s)} 
              className={`px-4 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-md ${
                activeScenario === s ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* CORE INSIGHTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 bg-white/[0.01] backdrop-blur-md">
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">Technical Pattern Synthesis</span>
           <h3 className="text-sm font-bold text-white mb-2 tracking-tight">{insight.patternRecognition.form}</h3>
           <p className="text-xs text-zinc-400 leading-relaxed font-medium pl-4 border-l border-zinc-800">
             {insight.patternRecognition.implication}
           </p>
        </div>
        
        <div className="p-6 bg-white/[0.02] backdrop-blur-md">
           <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sentiment Bias</span>
              <span className={`text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded border ${
                insight.sentiment.bias === 'BULLISH' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                insight.sentiment.bias === 'BEARISH' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                'bg-white/5 text-zinc-400 border-white/10'
              }`}>
                {insight.sentiment.bias}
              </span>
           </div>
           <p className="text-xs text-zinc-400 leading-relaxed font-medium pl-4 border-l border-white/5">
             {insight.sentiment.nuance}
           </p>
        </div>
      </div>

      {/* FORECAST INTERFACE */}
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-black/30 border border-white/5 rounded-lg">
           {(['SHORT', 'MID', 'LONG'] as const).map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab)} 
               className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-md uppercase tracking-wider ${
                 activeTab === tab ? 'bg-white/5 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
               }`}
             >
               {tab === 'SHORT' ? '7-Day target' : tab === 'MID' ? '90-Day Outlook' : 'Macro Horizon'}
             </button>
           ))}
        </div>

        <div className="p-8 bg-white/[0.01] border border-white/5 rounded-xl relative overflow-hidden group">
           <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="shrink-0 space-y-4">
                 <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Projected Target</span>
                    <div className="text-3xl font-bold text-white tracking-tight font-mono data-value">
                      ${currentHorizon.priceTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 font-mono tracking-wider">
                       <span>CONFIDENCE INTERVAL</span>
                       <span>{(currentHorizon.probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full lg:w-56 h-1 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-matrix shadow-[0_0_8px_hsla(var(--matrix)/0.4)] transition-all duration-1000 ease-out" 
                         style={{ width: `${currentHorizon.probability * 100}%` }} 
                       />
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 lg:max-w-2xl">
                 <div className="relative">
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {currentHorizon.rationale}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* SYSTEMIC RISK MONITOR */}
      <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
               <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Risk Assessment</span>
               <span className="text-xs text-zinc-300 font-medium">{insight.riskAnalysis}</span>
            </div>
         </div>
      </div>
    </div>
  );
};
