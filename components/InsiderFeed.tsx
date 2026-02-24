import React from 'react';
import { InsiderTransaction } from '@/lib/stock-details';

interface InsiderFeedProps {
  transactions: InsiderTransaction[];
}

export function InsiderFeed({ transactions }: InsiderFeedProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 text-center border border-dashed border-white/5 rounded-xl">
        <span className="text-xs text-zinc-600 italic">No recent insider movements logged.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.slice(0, 5).map((tx, idx) => {
        const isSale = tx.transactionText.toLowerCase().includes('sale') || tx.transactionText.toLowerCase().includes('sell');
        const isPurchase = tx.transactionText.toLowerCase().includes('purchase') || tx.transactionText.toLowerCase().includes('buy');
        
        return (
          <div key={idx} className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white tracking-tight uppercase">{tx.filerName}</span>
                <span className="text-[10px] text-zinc-500 font-medium">{tx.filerRelation}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase ${
                  isSale ? 'bg-bear/10 text-bear' : isPurchase ? 'bg-bull/10 text-bull' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {isSale ? 'SALE' : isPurchase ? 'BUY' : 'TRANS'}
                </span>
                <span className="text-[9px] text-zinc-600 font-mono mt-1">
                  {tx.startDate ? new Date(tx.startDate).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-2 mb-1">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Shares</span>
                <span className="text-[11px] font-mono text-zinc-300">
                  {tx.shares ? tx.shares.toLocaleString() : '—'}
                </span>
              </div>
              {tx.value && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Est. Value</span>
                  <span className="text-[11px] font-mono text-zinc-300">
                    ${(tx.value / 1e6).toFixed(2)}M
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-zinc-500 line-clamp-1 italic mt-1 border-t border-white/5 pt-1.5">
              {tx.transactionText}
            </p>
          </div>
        );
      })}
    </div>
  );
}
