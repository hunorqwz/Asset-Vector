"use client";
import React, { useState } from 'react';
import { NewsArticle } from '@/lib/stock-details';
import { SentimentReport } from '@/lib/sentiment';
import { extractSentimentNarrative } from '@/app/actions/ai';

interface SentimentDeepDiveProps {
  ticker: string;
  news: NewsArticle[];
  sentiment: SentimentReport;
  globalTrigger?: boolean;
}

export function SentimentDeepDive({ ticker, news, sentiment, globalTrigger }: SentimentDeepDiveProps) {
  const [showLogic, setShowLogic] = useState(false);
  const [localSentiment, setLocalSentiment] = useState<SentimentReport>(sentiment);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtraction = async () => {
    setIsExtracting(true);
    try {
      const live = await extractSentimentNarrative(ticker, news.map(n => n.title));
      setLocalSentiment(live);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  React.useEffect(() => {
    // Only extract if global trigger flips, we haven't successfully extracted yet (using length check), and we aren't currently extracting.
    if (globalTrigger && localSentiment.drivers.length === 0 && !isExtracting) {
      handleExtraction();
    }
  }, [globalTrigger, localSentiment.drivers.length, isExtracting]);

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
              <h4 className="text-[12px] font-bold text-white uppercase tracking-widest mb-2">Narrative Velocity Extraction</h4>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                Price follows narrative. Our NLP engine performs a "Forensic Sentiment Scan" using <span className="text-bull">Gemini 2.0 Flash</span> to parse institutional news cycles. 
                Instead of simple positive/negative word counts, we extract actual Marco Drivers and measure <span className="text-bull">Narrative Drift</span>.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Weighting Bias</span>
                <p className="text-[11px] text-zinc-400">Institutional publishers (e.g., Bloomberg, Reuters) are weighted 2.5x higher than retail blogs.</p>
              </div>
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Macro Drivers</span>
                <p className="text-[11px] text-zinc-400">Identifying actual economic/company actions (e.g., 'Regulatory Headwinds') rather than keywords.</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-4 font-mono">
               <span className="text-[10px] text-zinc-500 uppercase block mb-2">Drift Status</span>
               <code className={`text-[11px] uppercase ${localSentiment.drift === 'STABLE' ? 'text-zinc-400' : 'text-bull'}`}>{localSentiment.drift}</code>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Current Bias</span>
                  <div className={`text-2xl font-bold uppercase tracking-tight ${localSentiment.label === 'BULLISH' ? 'text-bull' : localSentiment.label === 'BEARISH' ? 'text-bear' : 'text-zinc-300'}`}>
                    {localSentiment.label}
                  </div>
               </div>
               <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Core Score</span>
                  <div className="text-2xl font-bold text-white font-mono">{(localSentiment.score * 100).toFixed(1)}%</div>
               </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] block border-b border-white/5 pb-2">Top Drivers Extracted</span>
              {localSentiment.drivers && localSentiment.drivers.length > 0 ? localSentiment.drivers.map((d, i) => (
                <div key={i} className="group/news p-3 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all">
                  <p className="text-[12px] font-bold text-zinc-300 group-hover/news:text-white transition-colors leading-snug mb-1">{d.driver}</p>
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Gemini 2.0 extraction</span>
                    <span className={d.impact === 'BULLISH' ? 'text-bull' : d.impact === 'BEARISH' ? 'text-bear' : 'text-zinc-400'}>{d.impact}</span>
                  </div>
                </div>
              )) : (
                 <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 border-dashed gap-3">
                   <div className="text-[11px] text-zinc-500 italic text-center">Awaiting deep driver extraction via Gemini 2.0.</div>
                   <button 
                     onClick={handleExtraction}
                     disabled={isExtracting}
                     className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all text-white border border-bull/50 bg-bull/10 hover:bg-bull hover:text-black disabled:opacity-50 flex items-center gap-2"
                   >
                     {isExtracting && <div className="w-1.5 h-1.5 bg-current rounded-full animate-ping" />}
                     {isExtracting ? 'Extracting Narratives...' : 'Run Neural Extraction'}
                   </button>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
