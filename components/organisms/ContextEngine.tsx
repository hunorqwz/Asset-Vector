import React from 'react';
import { StockDetails } from '@/lib/stock-details';
import { SentimentReport } from '@/lib/sentiment';
import { CalendarIcon } from '@/components/Icons';
import { DataSection } from '@/components/organisms/DataSection';
import { DataRow } from '@/components/molecules/DataRow';

interface ContextEngineProps {
  details: StockDetails;
  sentiment: SentimentReport;
  divergence?: string;
}

export function ContextEngine({ details, sentiment, divergence }: ContextEngineProps) {
  const c = details.upcomingCatalysts;
  const hasCatalysts = c && (c.earningsDate || c.exDividendDate);
  const headlines = details.news.slice(0, 4);

  const formatTime = (time: any) => {
    if (!time) return '';
    try {
      const ms = typeof time === 'number' && time < 1e12 ? time * 1000 : time;
      return new Date(ms).toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-10">
      {hasCatalysts && (
        <DataSection title="Upcoming Kinetic Events" icon={<CalendarIcon />}>
           {c.earningsDate && <DataRow label="Earnings Release" value={c.earningsDate} highlight />}
           {c.exDividendDate && <DataRow label="Ex-Dividend Date" value={c.exDividendDate} />}
           {c.dividendDate && <DataRow label="Dividend Pay Date" value={c.dividendDate} />}
        </DataSection>
      )}

      <div className="border border-white/10 bg-[#050505] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${sentiment.label === 'BULLISH' ? 'bg-bull shadow-bull' : sentiment.label === 'BEARISH' ? 'bg-bear shadow-bear' : 'bg-zinc-400'} animate-pulse`} />
             <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">Narrative Vector</span>
             {sentiment.velocity !== 0 && (
               <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${sentiment.velocity > 0 ? 'border-bull/20 text-bull' : 'border-bear/20 text-bear'}`}>
                 VEL: {sentiment.velocity > 0 ? '+' : ''}{sentiment.velocity}
               </span>
             )}
           </div>
           <span className={`text-[11px] font-bold font-mono px-2 py-1 border ${sentiment.label === 'BULLISH' ? 'border-bull/30 text-bull bg-bull/10' : sentiment.label === 'BEARISH' ? 'border-bear/30 text-bear bg-bear/10' : 'border-white/10 text-zinc-400 bg-white/5 uppercase tracking-widest'}`}>
             {sentiment.label}
           </span>
        </div>
        <div className="p-0">
          {headlines.length > 0 ? (
            <div className="divide-y divide-white/5">
              {headlines.map((item, i) => (
                <a key={i} href={item.url || '#'} target="_blank" rel="noreferrer" className="block p-5 hover:bg-[#111111] transition-colors group">
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-[0.15em] mb-2 group-hover:text-zinc-400 transition-colors">
                    {item.publisher || 'Market Wire'} • {formatTime(item.date)}
                  </span>
                  <p className="text-[13px] text-zinc-300 font-medium leading-snug group-hover:text-white transition-colors">{item.title}</p>
                </a>
              ))}
            </div>
          ) : (
             <div className="p-6 text-center text-zinc-600 text-[11px] uppercase tracking-widest font-bold">No Narrative Events Detected</div>
          )}
        </div>
      </div>
    </div>
  );
}
