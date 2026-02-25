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
  globalTrigger?: boolean;
}

const horizons: Record<string, "shortTerm" | "midTerm" | "longTerm"> = {
  'SHORT': 'shortTerm',
  'MID': 'midTerm',
  'LONG': 'longTerm'
};

export const StrategicOracle = ({ ticker, history, news, globalTrigger }: StrategicOracleProps) => {
  const [activeTab, setActiveTab] = useState<'SHORT' | 'MID' | 'LONG'>('SHORT');
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  
  const [insight, setInsight] = useState<StrategicInsight | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtraction = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const { generateStrategicAnalysis } = await import('@/app/actions/ai');
      const res = await generateStrategicAnalysis(ticker, history, news);
      if (res) {
        setInsight(res);
      } else {
        setError('CAPACITY_LIMIT');
      }
    } catch {
      setError('CONNECTION_ERROR');
    } finally {
      setIsExtracting(false);
    }
  };

  React.useEffect(() => {
    if (globalTrigger && !insight && !isExtracting && !error) {
      handleExtraction();
    }
  }, [globalTrigger, insight, isExtracting, error]);

  if (!insight) {
    const isQuota = error === 'CAPACITY_LIMIT';
    return (
      <div className="p-8 bg-black/10 border-white/10 border flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-6 text-zinc-400 font-bold text-xl bg-[#0a0a0a]">
           {isQuota ? "!" : "?"}
        </div>
        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-[0.2em]">
          {isQuota ? 'Quota Reached' : 'Analysis Offline'}
        </h3>
        <p className="text-[11px] text-zinc-500 max-w-xs mb-6 leading-relaxed">
          {isQuota 
            ? 'Rate limit reached. Our neural engines are recalibrating. Please wait 60s for reset.'
            : 'Connect the intelligence core to enable strategic forecasting.'}
        </p>
        <div className="flex gap-6">
          <button onClick={() => setIsTheoryOpen(true)} className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-4 uppercase font-bold tracking-widest">Documentation</button>
          <button 
            onClick={handleExtraction}
            disabled={isExtracting}
            className="flex items-center justify-center min-w-[140px] text-[10px] text-white hover:text-black hover:bg-white transition-colors font-bold uppercase tracking-widest bg-transparent px-4 py-2 border border-white/20 disabled:opacity-50"
          >
            {isExtracting ? (
               <><div className="w-1.5 h-1.5 bg-current rounded-full animate-ping mr-2" /> Extracting...</>
            ) : isQuota ? 'Retry System' : 'Run Neural Extraction'}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-8">
           <h3 className="text-[12px] font-bold text-zinc-200 uppercase tracking-[0.2em]">Neural Projections</h3>
           <div className="flex items-center bg-transparent border border-white/10 p-1">
            {(['conservative', 'balanced', 'aggressive'] as const).map(s => (
              <button key={s} onClick={() => setActiveScenario(s)} className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${activeScenario === s ? 'bg-white/10 text-white shadow-none' : 'text-zinc-500 hover:text-zinc-300'}`}>{s}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setIsTheoryOpen(true)} className="text-[12px] text-zinc-500 hover:text-white font-bold transition-all px-2 opacity-60 hover:opacity-100">?</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-x border-white/10">
        <div className="p-5 bg-[#0a0a0a] border border-white/10 border-l-0 border-y-0">
           <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-3">Pattern Recognition</span>
           <h3 className="text-[15px] font-bold text-white mb-3">{insight.patternRecognition.form}</h3>
           <p className="text-[12px] text-zinc-400 leading-relaxed border-l-2 border-zinc-500 pl-4 py-1">"{insight.patternRecognition.implication}"</p>
        </div>
        <div className="p-5 bg-transparent border border-white/10 border-r-0 border-y-0">
           <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Market Bias</span>
              <span className={`text-[11px] font-bold font-mono tracking-widest px-2 py-0.5 border ${insight.sentiment.bias === 'BULLISH' ? 'bg-bull/10 text-bull border-bull/30' : insight.sentiment.bias === 'BEARISH' ? 'bg-bear/10 text-bear border-bear/30' : 'bg-transparent text-zinc-400 border-white/20'}`}>{insight.sentiment.bias}</span>
           </div>
           <p className="text-[12px] text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-4 py-1">{insight.sentiment.nuance}</p>
        </div>
      </div>

      <div className="p-0">
        <div className="flex gap-4 mb-6">
           {(['SHORT', 'MID', 'LONG'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-[11px] font-bold transition-all border uppercase tracking-widest ${activeTab === tab ? 'bg-white/10 border-white/20 text-white shadow-none' : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-[#111111]'}`}>{tab === 'SHORT' ? '7D Forecast' : tab === 'MID' ? '90D Outlook' : 'Long Horizon'}</button>
           ))}
        </div>

        <div className="p-8 bg-[#0a0a0a] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-10">
           <div className="shrink-0">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-3">Target Objective</span>
              <div className="text-4xl font-bold text-white tracking-tight font-mono tabular-nums">${currentHorizon.priceTarget.toLocaleString()}</div>
              <div className="mt-3 flex items-center gap-3">
                 <div className="w-24 h-1.5 bg-white/10 overflow-hidden">
                    <div className="h-full bg-white transition-all shadow-none" style={{ width: `${currentHorizon.probability * 100}%` }} />
                 </div>
                 <span className="text-[11px] font-bold text-zinc-400 font-mono">{(currentHorizon.probability * 100).toFixed(0)}% PROBABILITY</span>
              </div>
           </div>
           <p className="text-[14px] text-zinc-300 leading-relaxed flex-1 md:max-w-xl font-normal border-l-2 border-zinc-500 pl-10 italic">"{currentHorizon.rationale}"</p>
        </div>
      </div>

      <div className="p-5 border border-white/10 bg-[#0a0a0a]">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse" />
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Systemic Risk Vector: <span className="text-zinc-200">{insight.riskAnalysis}</span></p>
         </div>
      </div>
      <GlassBoxTheory indicator="Oracle" isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} currentData={history} />
    </div>
  );
};
