"use client";
import React from 'react';
import { OHLCV } from '@/lib/market-data';
import { TechnicalIndicators } from '@/lib/technical-analysis';
import { ForensicAlert } from '@/lib/forensic-analyst';
import { useEducation, EducationContextData } from '@/components/providers/EducationProvider';
import { InfoTooltip } from '@/components/atoms/InfoTooltip';

interface ForensicAnalystReportProps {
  ticker: string;
  history: OHLCV[];
  technicals: TechnicalIndicators;
  forensicAlerts?: ForensicAlert[];
  educationContext?: EducationContextData;
}

export const ForensicAnalystReport = ({ ticker, history, technicals, forensicAlerts = [], educationContext }: ForensicAnalystReportProps) => {
  const { openEducation } = useEducation();

  const fallbackContext: EducationContextData = {
    ticker,
    currentPrice: history[history.length - 1]?.close,
    history: history.map(h => h.close),
  };
  const activeContext = educationContext || fallbackContext;

  const criticals = forensicAlerts.filter(a => a.severity === 'CRITICAL');
  const warnings = forensicAlerts.filter(a => a.severity === 'WARNING');
  const notices = forensicAlerts.filter(a => a.severity === 'NOTICE');

  if (forensicAlerts.length === 0) {
    return (
      <div className="p-6 border border-green-500/10 bg-green-500/[0.02] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-green-500 flex items-center gap-1.5">
              Forensic Status: Nominal
              <InfoTooltip insightKey="CONFLUENCE_SCORE" category="QUANT" />
            </span>
            <p className="text-[12px] text-zinc-500 font-medium mt-1">
              No anomalies, volume divergences, or statistical overextensions detected for {ticker}.
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-widest bg-zinc-900 border border-white/5 px-3 py-1.5 rounded">
          Fully Synced
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-matrix" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Forensic Analyst Report
              <InfoTooltip insightKey="CONFLUENCE_SCORE" category="QUANT" />
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">Diagnostic evaluation of order flow, divergence signals, and systemic parameters.</p>
          </div>
        </div>

        <div className="flex gap-2">
          {criticals.length > 0 && (
            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono">
              {criticals.length} Critical
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono">
              {warnings.length} Warning
            </span>
          )}
          {notices.length > 0 && (
            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono">
              {notices.length} Notice
            </span>
          )}
        </div>
      </div>

      {/* Grid containing alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {forensicAlerts.map((alert) => {
          let cardStyle = "bg-zinc-950/40 border-white/5";
          let badgeStyle = "bg-zinc-900 text-zinc-400 border-white/5";
          let alertLabel = "NOTICE";
          let dotColor = "bg-zinc-500";

          if (alert.severity === 'CRITICAL') {
            cardStyle = "bg-red-500/[0.01] border-red-500/15";
            badgeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
            alertLabel = "CRITICAL";
            dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
          } else if (alert.severity === 'WARNING') {
            cardStyle = "bg-amber-500/[0.01] border-amber-500/15";
            badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            alertLabel = "WARNING";
            dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
          } else if (alert.severity === 'NOTICE') {
            cardStyle = "bg-blue-500/[0.01] border-blue-500/15";
            badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
            alertLabel = "NOTICE";
            dotColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
          }

          return (
            <div 
              key={alert.id} 
              className={`p-6 border rounded-xl flex flex-col justify-between hover:border-white/10 transition-all duration-300 ${cardStyle}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider font-mono ${badgeStyle}`}>
                    {alertLabel}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                    {alert.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-[10px] leading-relaxed">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block sm:inline mr-1.5">Resolution:</span>
                  <span className="text-zinc-300 font-medium">{alert.suggestion}</span>
                </div>
                
                {alert.insightKey && (
                  <button
                    onClick={() => openEducation(alert.insightKey!, alert.insightCategory || 'QUANT', activeContext)}
                    className="shrink-0 text-[9px] font-mono font-black text-matrix hover:text-white uppercase tracking-widest bg-matrix/5 border border-matrix/20 hover:bg-matrix/10 hover:border-matrix/30 px-3 py-1.5 rounded transition-all focus:outline-none"
                  >
                    Inspect Math Logic ➔
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
