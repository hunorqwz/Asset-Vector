"use client";
import React, { useState } from 'react';
import { fmtPct, fmtBigNum, fmtRatio } from '@/lib/format';
import { ProfitabilityMetrics, FinancialHealth, ValuationMetrics, PeerMetrics } from '@/lib/stock-details';
import { FUNDAMENTAL_DEEP_DIVES } from '@/lib/education';

interface IntelligenceCardProps {
  title: string;
  id: string;
  metrics: { label: string; value: string | number | null; type: 'pct' | 'num' | 'ratio'; highlight?: boolean }[];
  peerValue?: number | null;
  insightKey: keyof typeof FUNDAMENTAL_DEEP_DIVES;
}

export function FundamentalIntelligence({ 
  profitability, 
  health, 
  valuation,
  peer
}: { 
  profitability: ProfitabilityMetrics; 
  health: FinancialHealth; 
  valuation: ValuationMetrics;
  peer?: PeerMetrics | null;
}) {
  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-matrix" />
          <h2 className="text-[14px] font-bold uppercase tracking-[0.3em] text-white">Surgical Fundamental Analysis</h2>
        </div>
        <p className="text-[12px] text-zinc-500 font-medium max-w-2xl leading-relaxed uppercase tracking-wider">
          Multi-stage structural decomposition of asset value. 
          Cross-referenced against sector benchmarks and historical variance.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <IntelligenceCard 
          title="Profitability Intelligence"
          id="profit"
          insightKey="PROFITABILITY"
          metrics={[
            { label: 'Gross Margin', value: profitability.grossMargins, type: 'pct' },
            { label: 'Operating Margin', value: profitability.operatingMargins, type: 'pct' },
            { label: 'Profit Margin', value: profitability.profitMargins, type: 'pct', highlight: true },
            { label: 'Return on Equity', value: profitability.returnOnEquity, type: 'pct' },
            { label: 'Return on Assets', value: profitability.returnOnAssets, type: 'pct' },
          ]}
          peerValue={peer?.profitMargin}
        />

        <IntelligenceCard 
          title="Financial Solvency"
          id="health"
          insightKey="LIQUIDITY"
          metrics={[
            { label: 'Total Cash', value: health.totalCash, type: 'num' },
            { label: 'Total Debt', value: health.totalDebt, type: 'num' },
            { label: 'Debt / Equity', value: health.debtToEquity, type: 'ratio', highlight: true },
            { label: 'Current Ratio', value: health.currentRatio, type: 'ratio' },
            { label: 'Quick Ratio', value: health.quickRatio, type: 'ratio' },
          ]}
        />
        
        <IntelligenceCard 
          title="Valuation Logic"
          id="valuation"
          insightKey="VALUATION"
          metrics={[
            { label: 'Trailing P/E', value: valuation.trailingPE, type: 'ratio' },
            { label: 'Forward P/E', value: valuation.forwardPE, type: 'ratio', highlight: true },
            { label: 'PEG Ratio', value: valuation.pegRatio, type: 'ratio' },
            { label: 'Price / Sales', value: valuation.priceToSales, type: 'ratio' },
            { label: 'EV / EBITDA', value: valuation.enterpriseToEbitda, type: 'ratio' },
          ]}
          peerValue={peer?.forwardPE}
        />

        <IntelligenceCard 
          title="Growth Dynamics"
          id="growth"
          insightKey="PROFITABILITY" // Reusing or could create a new one
          metrics={[
            { label: 'Revenue Growth', value: profitability.revenueGrowth, type: 'pct', highlight: true },
            { label: 'Earnings Growth', value: profitability.earningsGrowth, type: 'pct' },
            { label: 'Revenue / Share', value: health.revenuePerShare, type: 'num' },
            { label: 'Cash / Share', value: health.totalCashPerShare, type: 'num' },
            { label: 'FCF Intensity', value: health.freeCashflow, type: 'num' },
          ]}
          peerValue={peer?.revenueGrowth}
        />
      </div>
    </div>
  );
}

function IntelligenceCard({ title, metrics, insightKey, peerValue }: IntelligenceCardProps) {
  const [showTheory, setShowTheory] = useState(false);
  const insight = FUNDAMENTAL_DEEP_DIVES[insightKey];

  return (
    <div className={`glass-card border border-white/10 transition-all duration-500 overflow-hidden flex flex-col ${showTheory ? 'ring-1 ring-matrix/30' : ''}`}>
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-matrix" />
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-300">{title}</h3>
        </div>
        <button 
          onClick={() => setShowTheory(!showTheory)}
          className={`px-3 py-1 border text-[10px] font-bold tracking-widest uppercase transition-all ${
            showTheory 
              ? 'bg-matrix border-matrix text-white' 
              : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
          }`}
        >
          {showTheory ? 'Hide Theory' : 'View Theory'}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* METRICS SIDE */}
        <div className={`p-6 space-y-4 transition-all duration-500 ${showTheory ? 'lg:w-1/2 border-r border-white/5' : 'w-full'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {metrics.map((m, i) => (
              <div key={i} className={`flex justify-between items-center py-2 border-b border-white/5 last:border-0`}>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">{m.label}</span>
                <span className={`text-[13px] font-mono font-bold ${m.highlight ? 'text-white' : 'text-zinc-400'}`}>
                  {m.value === null ? '—' : 
                   m.type === 'pct' ? fmtPct(m.value as number) : 
                   m.type === 'num' ? fmtBigNum(m.value as number) : 
                   fmtRatio(m.value as number)}
                </span>
              </div>
            ))}
          </div>

          {peerValue !== undefined && peerValue !== null && (
             <div className="mt-6 p-4 bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sector Benchmark comparison</span>
                  <span className="text-[11px] font-mono font-bold text-matrix">{fmtPct(peerValue)}</span>
                </div>
                <div className="w-full h-1 bg-white/5 overflow-hidden">
                   <div className="h-full bg-matrix/40" style={{ width: '60%' }} /> {/* Simulated visualization */}
                </div>
             </div>
          )}
        </div>

        {/* THEORY SIDE */}
        {showTheory && (
          <div className="lg:w-1/2 p-6 bg-matrix/[0.03] animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
              <div>
                <h4 className="text-[11px] font-bold text-matrix uppercase tracking-widest mb-2">{insight.subtitle}</h4>
                <p className="text-[12px] text-zinc-300 leading-relaxed font-medium">{insight.definition}</p>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Surgical Strategy</span>
                <p className="text-[12px] text-zinc-400 leading-relaxed italic border-l border-matrix/50 pl-4">{insight.surgicalTake}</p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Critical Pitfalls</span>
                <div className="space-y-2">
                  {insight.pitfalls.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="w-1 h-1 bg-bear mt-1.5 shrink-0" />
                      <span className="text-[11px] text-zinc-500 font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
