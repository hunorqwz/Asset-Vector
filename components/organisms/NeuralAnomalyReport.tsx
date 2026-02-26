"use client";
import React, { useMemo } from 'react';
import { OHLCV } from '@/lib/market-data';
import { TechnicalIndicators } from '@/lib/technical-analysis';
import { StrategicInsight } from '@/app/actions/ai';
import { detectNeuralAnomalies, Anomaly } from '@/lib/anomalies';

interface NeuralAnomalyReportProps {
  history: OHLCV[];
  technicals: TechnicalIndicators;
  insight: StrategicInsight | null;
}

export const NeuralAnomalyReport = ({ history, technicals, insight }: NeuralAnomalyReportProps) => {
  const anomalies = useMemo(() => {
    return detectNeuralAnomalies(history, technicals, insight);
  }, [history, technicals, insight]);

  if (anomalies.length === 0) {
    return (
      <div className="p-5 border border-white/5 bg-black/20 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 bg-bull shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-mono">Structural Resonance: Nominal</span>
        </div>
        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">No Active Divergence</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Neural Divergence Monitor</h3>
        <div className="h-px flex-1 bg-white/5 mx-4" />
        <span className="text-[10px] bg-bear/10 text-bear border border-bear/20 px-3 py-1 rounded-sm font-bold uppercase tracking-[0.2em]">
          {anomalies.length} Anomaly Detectors Tripped
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anomalies.map((anomaly) => (
          <div 
            key={anomaly.id} 
            className={`p-6 border transition-all duration-300 rounded-xl ${
              anomaly.severity === 'CRITICAL' 
                ? 'bg-bear/5 border-bear/20' 
                : 'bg-zinc-900/40 border-white/10'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                  anomaly.severity === 'CRITICAL' ? 'text-bear' : 'text-zinc-200'
                }`}>
                  {anomaly.title}
                </h4>
                <div className={`w-1.5 h-1.5 ${anomaly.severity === 'CRITICAL' ? 'bg-bear animate-pulse' : 'bg-zinc-500'}`} />
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed font-medium pl-4 border-l border-white/5">
                {anomaly.description}
              </p>
              <div className="pt-4 border-t border-white/5 mt-2">
                <p className="text-[10px] text-white font-bold uppercase tracking-[0.15em] flex items-center gap-3">
                   <span className="text-zinc-600">RESOLUTION PATH:</span> 
                   <span className="text-zinc-300">{anomaly.suggestion}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

