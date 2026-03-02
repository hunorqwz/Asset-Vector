"use client";

import { useState, useEffect } from 'react';
import { useAlpacaTape } from '@/hooks/useAlpacaTape';
import { executeTrade, getAlpacaData, getLiveQuote } from '@/app/actions';
import { fmt } from '@/lib/format';

interface AlpacaTerminalProps {
  ticker: string;
}

export function AlpacaTerminal({ ticker }: AlpacaTerminalProps) {
  const { isConnected, lastTick } = useAlpacaTape(ticker);
  const [quote, setQuote] = useState<{ ap: number; bp: number } | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [position, setPosition] = useState<any>(null);
  const [qty, setQty] = useState("10");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const data = await getAlpacaData();
      if (data) {
        setAccount(data.account);
        const pos = data.positions.find((p: any) => p.symbol === ticker);
        setPosition(pos || null);
      }
      
      const q = await getLiveQuote(ticker);
      if (q) setQuote(q);
    }
    init();
    
    const interval = setInterval(async () => {
      const q = await getLiveQuote(ticker);
      if (q) setQuote(q);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ticker]);

  async function handleOrder(side: "buy" | "sell") {
    setLoading(true);
    setStatus("TRANSMITTING...");
    try {
      const res = await executeTrade(ticker, qty, side);
      if (res.success) {
        setStatus(`ORDER EXECUTED: ${side.toUpperCase()} ${qty} ${ticker}`);
        // Refresh account/position
        const data = await getAlpacaData();
        if (data) {
          setAccount(data.account);
          const pos = data.positions.find((p: any) => p.symbol === ticker);
          setPosition(pos || null);
        }
      } else {
        setStatus(`FAILED: ${res.error}`);
      }
    } catch {
      setStatus("SYSTEM ERROR");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  return (
    <div className="glass-card mt-10 p-6 border border-white/10 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-bull" />
          <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Institutional Executive</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-bull' : 'bg-zinc-600'}`} />
          <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">
            {isConnected ? 'LIVE TAPE' : 'STANDBY'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter block mb-1">Buying Power</span>
          <span className="text-sm font-mono font-bold text-zinc-200">
            {account ? `$${Number(account.buying_power).toLocaleString()}` : '---'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter block mb-1">Current Position</span>
          <span className="text-sm font-mono font-bold text-zinc-200">
            {position ? `${position.qty} @ ${Number(position.avg_entry_price).toFixed(2)}` : '0'}
          </span>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-5 border border-white/5 mb-8">
        <div className="flex justify-between items-center mb-4">
           <div className="text-center flex-1">
              <span className="text-[8px] font-bold text-zinc-500 block mb-1 uppercase">BID</span>
              <span className="text-lg font-mono font-black text-zinc-200">
                {quote?.bp || lastTick?.price || '---'}
              </span>
           </div>
           <div className="w-px h-8 bg-white/10 mx-4" />
           <div className="text-center flex-1">
              <span className="text-[8px] font-bold text-zinc-500 block mb-1 uppercase">ASK</span>
              <span className="text-lg font-mono font-black text-zinc-200">
                {quote?.ap || lastTick?.price || '---'}
              </span>
           </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-mono font-bold text-zinc-600">SPREAD:</span>
          <span className="text-[10px] font-mono font-bold text-zinc-400">
            {quote ? (quote.ap - quote.bp).toFixed(4) : '0.0000'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative">
           <label className="text-[9px] font-black text-zinc-600 absolute -top-2 left-3 bg-black px-1.5 z-10 tracking-[0.2em] uppercase">Quantity</label>
           <input 
              type="number" 
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-bull/50 transition-colors"
           />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => handleOrder("buy")}
            disabled={loading}
            className="flex-1 bg-bull text-black text-[11px] font-black tracking-[0.2em] uppercase py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            ORDER BUY
          </button>
          <button 
            onClick={() => handleOrder("sell")}
            disabled={loading}
            className="flex-1 border border-bear text-bear text-[11px] font-black tracking-[0.2em] uppercase py-3.5 rounded-lg hover:bg-bear/5 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            ORDER SELL
          </button>
        </div>
      </div>

      {status && (
        <div className={`absolute inset-0 bg-black/95 flex items-center justify-center p-8 text-center transition-all duration-300 animate-in fade-in`}>
          <div className="space-y-4">
            <div className={`w-2 h-2 rounded-full mx-auto animate-ping ${status.includes('EXECUTED') ? 'bg-bull' : status.includes('FAILED') ? 'bg-bear' : 'bg-zinc-500'}`} />
            <p className={`text-[11px] font-black tracking-[0.2em] uppercase leading-relaxed ${status.includes('EXECUTED') ? 'text-bull' : status.includes('FAILED') ? 'text-bear' : 'text-zinc-400'}`}>
              {status}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
