"use client";
import React, { useState } from 'react';
import { OHLCV } from '@/lib/market-data';
import { PredictionResult } from '@/lib/inference';
import { MarketRegime } from '@/lib/regime';
import { AIIcon, StatsIcon, BullIcon, BearIcon } from '@/components/Icons';
import { GlassBoxTheory } from './GlassBoxTheory';
import { SentimentReport } from '@/lib/sentiment';

interface AIIntelligencePanelProps {
  ticker: string;
  prediction: PredictionResult;
  regime: MarketRegime;
  sentiment: SentimentReport;
  history: OHLCV[];
}

export const AIIntelligencePanel = React.memo(function AIIntelligencePanel({ 
  ticker, 
  prediction, 
  regime, 
  sentiment, 
  history
}: AIIntelligencePanelProps) {
  const [activeTheory, setActiveTheory] = useState<string | null>(null);

  const spread = ((prediction.p90 - prediction.p10) / prediction.p50) * 100;

  return (
    <section className="glass-card bg-black/10 border-white/5 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase font-pixel">Intelligence Engine</h3>
        <span className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-widest">Temporal Fusion</span>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest font-pixel block">Model Bias</span>
            <span className={`text-[13px] font-bold tracking-tighter block font-mono ${prediction.p50 > history[history.length-1].close ? 'text-bull' : 'text-bear'}`}>
              {prediction.p50 > history[history.length-1].close ? 'BULLISH' : 'BEARISH'}
            </span>
          </div>
          <div className="space-y-1.5 text-right">
            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest font-pixel block">Confidence</span>
            <span className="text-[13px] font-bold text-white block font-mono">{(100 - spread).toFixed(1)}%</span>
          </div>
        </div>

        <div className="space-y-4 pt-5 border-t border-white/5">
          <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest block font-pixel">Market Regime</span>
          <div className="p-3 bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-300 uppercase font-mono">{regime.replace('_', ' ')}</span>
            <div className="flex gap-1.5 items-end h-3">
              {['MEAN_REVERSION', 'RANDOM_WALK', 'MOMENTUM'].map(r => (
                <div key={r} className={`w-1.5 transition-all ${regime === r ? 'bg-white/40 h-3' : 'bg-white/5 h-1.5'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-5 border-t border-white/5">
          <div className="flex justify-between items-center text-[9px] text-zinc-600 uppercase font-bold tracking-widest font-pixel">
            <span>Linguistic Delta</span>
            <span className={`font-mono text-[10px] ${sentiment.score > 0 ? 'text-bull' : 'text-bear'}`}>{sentiment.score > 0 ? '+' : ''}{sentiment.score.toFixed(3)}</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-normal italic border-l border-white/10 pl-3">
            "Narrative vectors suggest persistent {sentiment.label.toLowerCase()} bias across detected frames."
          </p>
        </div>
      </div>

      {activeTheory && (
        <GlassBoxTheory indicator={activeTheory} isOpen={true} onClose={() => setActiveTheory(null)} currentData={history} />
      )}
    </section>
  );
});
