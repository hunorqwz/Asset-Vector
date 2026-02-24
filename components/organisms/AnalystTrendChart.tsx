import React from 'react';
import { AnalystTrendEntry } from "@/lib/stock-details";

export function AnalystTrendChart({ trends }: { trends: AnalystTrendEntry[] }) {
  const labels: Record<string, string> = { "0m": "Current", "-1m": "1M Ago", "-2m": "2M Ago", "-3m": "3M Ago" };
  
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Trend Shift</span>
      </div>
      {trends.map(t => {
        const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
        if (total === 0) return null;
        
        return (
          <div key={t.period} className="flex items-center gap-3">
            <span className="text-[9px] text-zinc-500 w-11 tabular-nums">{labels[t.period] || t.period}</span>
            <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-white/5">
              {t.strongBuy > 0 && <div style={{ width: `${(t.strongBuy / total) * 100}%` }} className="bg-bull" title={`Strong Buy: ${t.strongBuy}`} />}
              {t.buy > 0 && <div style={{ width: `${(t.buy / total) * 100}%` }} className="bg-bull/40" title={`Buy: ${t.buy}`} />}
              {t.hold > 0 && <div style={{ width: `${(t.hold / total) * 100}%` }} className="bg-white/20" title={`Hold: ${t.hold}`} />}
              {t.sell > 0 && <div style={{ width: `${(t.sell / total) * 100}%` }} className="bg-bear/40" title={`Sell: ${t.sell}`} />}
              {t.strongSell > 0 && <div style={{ width: `${(t.strongSell / total) * 100}%` }} className="bg-bear" title={`Strong Sell: ${t.strongSell}`} />}
            </div>
            <span className="text-[9px] font-mono text-zinc-600 w-4 text-right">{total}</span>
          </div>
        );
      })}
    </div>
  );
}
