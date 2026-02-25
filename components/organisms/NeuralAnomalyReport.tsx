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
      <div className="p-4 border border-white/5 bg-black/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-bull" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-pixel">Alignment: Nominal</span>
        </div>
        <span className="text-[9px] text-zinc-600 uppercase font-bold font-mono">No Divergence Detected</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-[12px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Deviation Tracking</h3>
        <span className="text-[11px] bg-bear/15 text-bear border border-bear/30 px-3 py-1 ml-auto rounded-full font-bold uppercase tracking-widest animate-pulse">{anomalies.length} High Risk Vectors</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {anomalies.map((anomaly) => (
          <div 
            key={anomaly.id} 
            className={`p-4 border transition-all glass-card ${
              anomaly.severity === 'CRITICAL' 
                ? 'bg-bear/5 border-bear/20' 
                : 'bg-yellow-500/5 border-yellow-500/20'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 className={`text-[12px] font-bold uppercase tracking-[0.15em] ${
                  anomaly.severity === 'CRITICAL' ? 'text-bear' : 'text-yellow-500'
                }`}>
                  {anomaly.title}
                </h4>
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-5">"{anomaly.description}"</p>
              <div className="pt-4 border-t border-white/5 mt-2">
                <p className="text-[11px] text-zinc-100 font-bold uppercase tracking-widest flex items-center gap-2">
                   <span className="text-zinc-500">CORRECTION:</span> {anomaly.suggestion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

