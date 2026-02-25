"use client";
import React, { useState } from 'react';
import { NewsArticle } from '@/lib/stock-details';

interface SentimentDeepDiveProps {
  news: NewsArticle[];
  sentiment: { label: string; score: number };
}

export function SentimentDeepDive({ news, sentiment }: SentimentDeepDiveProps) {
  const [showLogic, setShowLogic] = useState(false);

  return (
    <div className="glass-card border border-white/10 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-bull rounded-full shadow-bull" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">Sentimental Narrative Layer</h3>
        </div>
        <button 
          onClick={() => setShowLogic(!showLogic)}
          className={`text-[10px] font-bold tracking-widest uppercase py-1 px-3 border transition-all ${
            showLogic ? 'bg-bull border-bull text-white' : 'border-white/10 text-zinc-500 hover:text-white'
          }`}
        >
          {showLogic ? 'Live Feed' : 'Theory Core'}
        </button>
      </div>

      <div className="p-6">
        {showLogic ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h4 className="text-[12px] font-bold text-white uppercase tracking-widest mb-2">Linguistic Delta Analysis</h4>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                Price follows narrative. Our NLP engine performs a "Forensic Sentiment Scan" on institutional news cycles. 
                Instead of simple positive/negative counts, we measure the <span className="text-bull">Linguistic Force</span>—the velocity of sentiment shift.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Weighting Bias</span>
                <p className="text-[11px] text-zinc-400">Institutional publishers (e.g., Bloomberg, Reuters) are weighted 2.5x higher than retail blogs.</p>
              </div>
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Decay Rate</span>
                <p className="text-[11px] text-zinc-400">Headline relevance decays exponentially every 4 hours to maintain focus on the immediate trade vector.</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-4 font-mono">
               <span className="text-[10px] text-zinc-500 uppercase block mb-2">Sentiment Formula</span>
               <code className="text-[11px] text-bull">{"Vector = (Sum(w_i * s_i) / N) * Confidence"}</code>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Current Bias</span>
                  <div className={`text-2xl font-bold uppercase tracking-tight ${sentiment.label === 'BULLISH' ? 'text-bull' : sentiment.label === 'BEARISH' ? 'text-bear' : 'text-zinc-300'}`}>
                    {sentiment.label}
                  </div>
               </div>
               <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Core Score</span>
                  <div className="text-2xl font-bold text-white font-mono">{(sentiment.score * 100).toFixed(1)}%</div>
               </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] block border-b border-white/5 pb-2">Top Linguistic Signals</span>
              {news.slice(0, 3).map((n, i) => (
                <div key={i} className="group/news p-3 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all">
                  <p className="text-[12px] font-bold text-zinc-300 group-hover/news:text-white transition-colors leading-snug mb-1">{n.title}</p>
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">{n.publisher}</span>
                    <span className="text-bull">Mapped to Bull Vector</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
