"use client";
import React from 'react';
import { SentimentReport } from '@/lib/sentiment';
import { NarrativeArticle } from '@/lib/market-data';
import { SECIcon, BullIcon, BearIcon } from '@/components/Icons';

interface SentimentForemanProps {
  news: NarrativeArticle[];
  report: SentimentReport;
  divergence?: string;
}

export const SentimentForeman = React.memo(function SentimentForeman({ news, report, divergence }: SentimentForemanProps) {
  return (
    <section className="bg-[#0a0a0a] border border-white/10 overflow-hidden group">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-transparent">
        <h3 className="text-[12px] font-bold text-zinc-300 tracking-[0.2em] uppercase">Intelligence Core</h3>
        <div className="flex items-center gap-3">
          {report.velocity !== 0 && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${report.velocity > 0 ? 'border-bull/20 text-bull' : 'border-bear/20 text-bear'}`}>
              VEL: {report.velocity > 0 ? '+' : ''}{report.velocity}
            </span>
          )}
          <span className={`text-[11px] font-bold px-3 py-1 border font-mono tracking-widest shadow-none ${report.label === 'BULLISH' ? 'border-bull/30 text-bull bg-bull/10' : report.label === 'BEARISH' ? 'border-bear/30 text-bear bg-bear/10' : 'border-white/20 text-zinc-400 bg-transparent'}`}>
            {report.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* LINGUISTIC DNA -> DRIVERS */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.15em] block">Macro Drivers</span>
            {report.drift && (
               <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase border border-white/10 px-2 py-0.5">
                 Drift: <span className={report.drift.includes('BULL') ? 'text-bull' : report.drift.includes('BEAR') ? 'text-bear' : 'text-zinc-400'}>{report.drift.replace('_', ' ')}</span>
               </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {report.drivers && report.drivers.length > 0 ? report.drivers.slice(0, 3).map((d, i) => (
              <div 
                key={i} 
                className="px-3 py-2 text-[11px] border border-white/10 bg-transparent flex justify-between items-center transition-colors hover:border-white/20 hover:bg-[#111111]"
              >
                <span className="text-zinc-300 font-bold uppercase tracking-wider">{d.driver}</span>
                <span className={`text-[9px] font-mono font-bold tracking-widest ${d.impact === 'BULLISH' ? 'text-bull' : d.impact === 'BEARISH' ? 'text-bear' : 'text-zinc-500'}`}>
                  {d.impact}
                </span>
              </div>
            )) : (
              <span className="text-[11px] text-zinc-600 italic border border-white/5 p-3">No significant institutional drivers identified.</span>
            )}
          </div>
        </div>

        {/* NARRATIVE STREAM */}
        <div className="space-y-5 pt-6 border-t border-white/10">
           <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.15em] block">Narrative Evolution</span>
           <div className="space-y-5">
             {news.slice(0, 4).map((n, i) => (
               <a 
                 key={i} 
                 href={n.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex flex-col gap-2 group/news border-l-2 border-white/10 pl-5 hover:border-white/30 transition-all py-1"
               >
                 <div className="flex justify-between items-center text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>{new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                 </div>
                 <span className="text-[13px] text-zinc-300 group-hover/news:text-white transition-colors leading-relaxed line-clamp-2 font-medium">{n.title}</span>
               </a>
             ))}
           </div>
        </div>

        {/* IMPACT PROJECTION */}
        <div className="p-4 border border-white/10 bg-transparent flex items-start gap-4 shadow-none">
           <div className="shrink-0 pt-1.5">
             <div className={`w-2 h-2 rounded-full ${report.score > 0 ? 'bg-bull' : 'bg-bear'}`} />
           </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Structural Projection</span>
                {divergence && divergence !== 'NONE' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 border animate-pulse ${divergence === 'BULLISH_DIVERGENCE' ? 'border-bull/50 text-bull bg-bull/10' : 'border-bear/50 text-bear bg-bear/10'}`}>
                    {divergence.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">Headlines analysis confirms local {report.label.toLowerCase()} momentum. Neural variance indicates high confidence in active frame trajectory.</p>
            </div>
        </div>
      </div>
    </section>
  );
});

