"use client";
import React from 'react';
import { SentimentReport } from '@/lib/sentiment';
import { NarrativeArticle } from '@/lib/market-data';
import { SECIcon, BullIcon, BearIcon } from '@/components/Icons';

interface SentimentForemanProps {
  news: NarrativeArticle[];
  report: SentimentReport;
}

export const SentimentForeman = React.memo(function SentimentForeman({ news, report }: SentimentForemanProps) {
  return (
    <section className="bg-[#0a0a0a] border border-white/10 overflow-hidden group">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-transparent">
        <h3 className="text-[12px] font-bold text-zinc-300 tracking-[0.2em] uppercase">Intelligence Core</h3>
        <span className={`text-[11px] font-bold px-3 py-1 border font-mono tracking-widest shadow-none ${report.label === 'BULLISH' ? 'border-bull/30 text-bull bg-bull/10' : report.label === 'BEARISH' ? 'border-bear/30 text-bear bg-bear/10' : 'border-white/20 text-zinc-400 bg-transparent'}`}>
          {report.label}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* LINGUISTIC DNA */}
        <div className="space-y-4">
          <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.15em] block">Linguistic Markers</span>
          <div className="flex flex-wrap gap-2">
            {report.keywords.length > 0 ? report.keywords.slice(0, 10).map((kw, i) => (
              <div 
                key={i} 
                className="px-3 py-1 text-[11px] border border-white/10 bg-transparent text-zinc-300 font-bold uppercase font-mono tracking-widest transition-colors hover:border-white/20 hover:bg-[#111111]"
              >
                {kw.word}
              </div>
            )) : (
              <span className="text-[11px] text-zinc-600 italic">No significant markers detected in current stream.</span>
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
                    <span>{new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
           <div className="space-y-1.5">
             <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Structural Projection</span>
             <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">Headlines analysis confirms local {report.label.toLowerCase()} momentum. Neural variance indicates high confidence in active frame trajectory.</p>
           </div>
        </div>
      </div>
    </section>
  );
});

