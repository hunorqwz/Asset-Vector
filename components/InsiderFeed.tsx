import React from 'react';
import { InsiderTransaction } from '@/lib/stock-details';

interface InsiderFeedProps {
  transactions: InsiderTransaction[];
}

export function InsiderFeed({ transactions }: InsiderFeedProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-white/20 bg-[#0a0a0a]">
        <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">No recent insider movements logged in security perimeter.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.slice(0, 5).map((tx, idx) => {
        const isSale = tx.transactionText.toLowerCase().includes('sale') || tx.transactionText.toLowerCase().includes('sell');
        const isPurchase = tx.transactionText.toLowerCase().includes('purchase') || tx.transactionText.toLowerCase().includes('buy');
        
        return (
          <div key={idx} className="flex flex-col p-3 bg-transparent border border-white/10 group hover:border-white/30 hover:bg-[#111111] transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-white tracking-tight uppercase">{tx.filerName}</span>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wide">{tx.filerRelation}</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-[11px] font-bold px-2 py-1 leading-none uppercase tracking-widest shadow-none ${
                  isSale ? 'bg-bear/10 text-bear border border-bear/30' : isPurchase ? 'bg-bull/10 text-bull border border-bull/30' : 'bg-transparent text-zinc-400 border-white/20'
                }`}>
                  {isSale ? 'LIQUIDATION' : isPurchase ? 'ACQUISITION' : 'TRANSFER'}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono font-bold">
                  {tx.startDate ? new Date(tx.startDate).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-3 mb-2">
              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.1em]">Volume</span>
                <span className="text-[12px] font-mono font-bold text-zinc-200">
                  {tx.shares ? tx.shares.toLocaleString() : '—'} <span className="text-[10px] text-zinc-600">SHARES</span>
                </span>
              </div>
              {tx.value && (
                <div className="flex flex-col">
                  <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-[0.1em]">Market Value</span>
                  <span className="text-[12px] font-mono font-bold text-zinc-200">
                    ${(tx.value / 1e6).toFixed(2)}M
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-[11px] text-zinc-400 leading-relaxed italic mt-2 border-t border-white/5 pt-3 group-hover:text-zinc-300 transition-colors">
              {tx.transactionText}
            </p>
          </div>
        );
      })}
    </div>
  );
}
