"use client";
import React from 'react';
import { WhaleIntelligence } from "@/lib/whale-radar";
import { fmtPct, fmtCount } from "@/lib/format";
import { OwnershipIcon, StatsIcon } from "@/components/Icons";

interface WhaleRadarPanelProps {
  intelligence: WhaleIntelligence;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
}

export function WhaleRadarPanel({ intelligence, heldPercentInsiders, heldPercentInstitutions }: WhaleRadarPanelProps) {
  const {
    whaleConsensus,
    whaleConsensusScore,
    insiderConvictionScore,
    institutionalConvictionScore,
    clusterBuyDetected,
    primaryDriver,
    topHoldersAlpha
  } = intelligence;

  const getStatusColor = (score: number) => {
    if (score > 65) return 'text-bull';
    if (score < 35) return 'text-bear';
    return 'text-zinc-400';
  };

  const getStatusBg = (score: number) => {
    if (score > 65) return 'bg-bull/10 border-bull/20';
    if (score < 35) return 'bg-bear/10 border-bear/20';
    return 'bg-white/5 border-white/10';
  };

  return (
    <section className="glass-card border border-white/10 overflow-hidden relative group bg-[#050505]">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between lg:flex-row flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass-card rounded-lg flex items-center justify-center text-matrix bg-matrix/5 border-matrix/20">
            <OwnershipIcon />
          </div>
          <div>
            <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] mb-1">Whale Radar</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Institutional & Insider Intent Layer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Whale Consensus</span>
            <div className={`px-3 py-1 border text-[11px] font-bold uppercase tracking-widest ${getStatusBg(whaleConsensusScore)} ${getStatusColor(whaleConsensusScore)}`}>
              {whaleConsensus.replace(/_/g, ' ')}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Conviction</span>
            <span className={`text-2xl font-mono font-bold tracking-tighter ${getStatusColor(whaleConsensusScore)}`}>
              {whaleConsensusScore}<span className="text-xs opacity-50 ml-1">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* Driver Alert */}
      <div className={`px-6 py-4 border-b ${clusterBuyDetected ? 'bg-bull/5 border-bull/20' : 'bg-white/[0.02] border-white/5'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${clusterBuyDetected ? 'bg-bull' : 'bg-matrix'}`} />
          <p className={`text-[11px] font-bold uppercase tracking-wide ${clusterBuyDetected ? 'text-bull' : 'text-zinc-400'}`}>
            {primaryDriver}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
        {/* Insider Intent */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
               <StatsIcon />
               Insider Intent
             </h3>
             <span className={`text-[11px] font-mono font-bold ${getStatusColor(insiderConvictionScore)}`}>
               SCORE: {insiderConvictionScore.toFixed(0)}
             </span>
          </div>
          <div className="space-y-4">
             <WhaleMetric label="Retail Float Ownership" value={fmtPct(heldPercentInsiders)} />
             <WhaleMetric label="Net 90D Acquisition" value={insiderConvictionScore > 50 ? 'POSITIVE' : 'NEGATIVE'} />
             <div className="pt-2">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${getStatusColor(insiderConvictionScore)}`}
                     style={{ width: `${insiderConvictionScore}%`, backgroundColor: 'currentColor' }}
                   />
                </div>
             </div>
          </div>
        </div>

        {/* Institutional Flow */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
               <StatsIcon />
               Institutional Flow
             </h3>
             <span className={`text-[11px] font-mono font-bold ${getStatusColor(institutionalConvictionScore)}`}>
               SCORE: {institutionalConvictionScore.toFixed(0)}
             </span>
          </div>
          <div className="space-y-4">
             <WhaleMetric label="T10 Holder Momentum" value={fmtPct(topHoldersAlpha / 100)} colored />
             <WhaleMetric label="Institutional Density" value={fmtPct(heldPercentInstitutions)} />
             <div className="pt-2">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${getStatusColor(institutionalConvictionScore)}`}
                     style={{ width: `${institutionalConvictionScore}%`, backgroundColor: 'currentColor' }}
                   />
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] flex justify-between">
        <span>Source: SEC Form 4 & 13F Forensic Index</span>
        <span className="text-zinc-500 italic">Quantitative Intent Calculation active</span>
      </div>
    </section>
  );
}

function WhaleMetric({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  let valueColor = 'text-zinc-300';
  if (colored && value !== '—') {
    const isPos = value.includes('+') || (!value.includes('-') && parseFloat(value) > 0);
    valueColor = isPos ? 'text-bull' : 'text-bear';
  }

  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-zinc-500 font-bold uppercase tracking-tight">{label}</span>
      <span className={`font-mono font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}
