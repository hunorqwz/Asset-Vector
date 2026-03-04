"use client";
import React, { useState } from "react";
import { MarketSignal } from "@/lib/market-data";
import { StockDetails } from "@/lib/stock-details";
import { getTouchImpact } from "@/lib/probability";
import { executeTrade } from "@/app/actions/execute";

interface ExecutionPlannerProps {
  ticker: string;
  signal: MarketSignal;
}

export function ExecutionPlanner({ ticker, signal }: ExecutionPlannerProps) {
  const { structuralProbability, price, smoothPrice, tech, trend } = signal;
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<{ status: 'idle' | 'success' | 'error', message?: string }>({ status: 'idle' });

  const handleExecute = async (side: "buy" | "sell") => {
    setIsExecuting(true);
    setTradeStatus({ status: 'idle' });
    
    // Defaulting to a simulated $1000 notional block for the institutional planner wrapper.
    const notionalValue = 1000;
    
    const res = await executeTrade(ticker, side, notionalValue, price);
    if (res.success) {
      setTradeStatus({ status: 'success', message: `Execution Filled: ${res.status.toUpperCase()} (${res.filledQty} shares @ $${res.filledAvgPrice})` });
    } else {
      setTradeStatus({ status: 'error', message: res.error || "Execution failed due to liquidity/routing." });
    }
    setIsExecuting(false);
  };

  // Identify primary support and resistance based on PoT
  const resistance = (signal.structuralProbability || [])
    .filter(l => l.type === 'RESISTANCE')
    .sort((a, b) => b.probability - a.probability)[0];
  
  const support = (signal.structuralProbability || [])
    .filter(l => l.type === 'SUPPORT')
    .sort((a, b) => b.probability - a.probability)[0];

  const stopLoss = support ? support.price * 0.98 : price * 0.95;
  const takeProfit = resistance ? resistance.price : price * 1.1;

  const rewardRisk = (takeProfit - price) / (price - stopLoss);

  return (
    <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-br from-zinc-900/50 to-black/80">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-matrix" />
          <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.2em]">Execution Planner</h3>
        </div>
        <div className="flex items-center gap-2 px-2 py-0.5 border border-white/5 bg-white/5 rounded">
           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Protocol</span>
           <span className="text-[10px] font-bold text-matrix uppercase tracking-tighter shadow-sm shadow-matrix/20">Surgical Entry</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Trade Levels */}
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Target Profit</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-bull tracking-tighter">${takeProfit.toFixed(2)}</span>
              <span className="text-[11px] font-bold text-bull/60">({(((takeProfit/price)-1)*100).toFixed(1)}%)</span>
            </div>
            {signal.orderBlocks && signal.orderBlocks.filter(b => b.type === 'BEARISH' && b.price > price).length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1 h-3 bg-bear" />
                 <span className="text-[9px] text-zinc-400 font-bold uppercase">Bearish Supply Level (${signal.orderBlocks.find(b => b.type === 'BEARISH')?.price.toFixed(2)})</span>
              </div>
            ) : (
              <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-tighter">
                {resistance ? `Structural Resistance: ${getTouchImpact(resistance.probability)}` : 'Projected technical extension target.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Surgical Stop</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-bear tracking-tighter">${stopLoss.toFixed(2)}</span>
              <span className="text-[11px] font-bold text-bear/60">({(((stopLoss/price)-1)*100).toFixed(1)}%)</span>
            </div>
            {signal.orderBlocks && signal.orderBlocks.filter(b => b.type === 'BULLISH' && b.price < price).length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1 h-3 bg-bull" />
                 <span className="text-[9px] text-zinc-400 font-bold uppercase">Institutional Order Block Detected (${signal.orderBlocks.find(b => b.type === 'BULLISH')?.price.toFixed(2)})</span>
              </div>
            ) : (
              <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-tighter">
                Hard exit below {support ? `Liquid Support cluster (${support.price.toFixed(2)})` : 'ATR-based volatility band.'}
              </p>
            )}
          </div>
        </div>

        {/* Right: R/R & Analytics */}
        <div className="space-y-6">
           <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Reward/Risk</p>
                <p className="text-xl font-bold font-mono text-white tracking-tighter">{rewardRisk.toFixed(2)}x</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Edge Status</p>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${rewardRisk > 2 ? 'bg-bull/20 text-bull' : 'bg-zinc-800 text-zinc-400'}`}>
                  {rewardRisk > 2 ? 'High Alpha Edge' : 'Marginal Basis'}
                </span>
              </div>
           </div>

           <div className="space-y-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Technical Summary</p>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-tight font-medium">Kalman Equilibrium</span>
                    <span className="font-mono text-white font-bold">${smoothPrice.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-tight font-medium">Trend Sentiment</span>
                    <span className={`font-mono font-bold ${trend === 'BULLISH' ? 'text-bull' : trend === 'BEARISH' ? 'text-bear' : 'text-zinc-400'}`}>{trend}</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-tight font-medium">Confluence Score</span>
                    <span className="font-mono text-matrix font-bold">{tech.confluenceScore.toFixed(0)}/100</span>
                 </div>
                 {signal.darkPoolBlocks && signal.darkPoolBlocks.length > 0 && (
                   <div className="flex justify-between items-center text-[11px] mt-2 pt-2 border-t border-white/5">
                      <span className="text-purple-400 uppercase tracking-tight font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                        Shadow Liquidity
                      </span>
                      <span className="font-mono text-white font-bold">${signal.darkPoolBlocks[0].price.toFixed(2)}</span>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 p-3 bg-matrix/5 border border-matrix/10 rounded flex items-center gap-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-matrix shrink-0">
          <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-tighter">
          Advisory: This plan is derived from <span className="text-white">Factor Beta & Gaussian Probability</span>. No stop loss is guaranteed.
        </p>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
         <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-4">Direct Execution (Alpaca Testnet)</h4>
         <div className="flex items-center gap-4">
            <button 
               onClick={() => handleExecute("buy")}
               disabled={isExecuting}
               className="flex-1 bg-bull/20 hover:bg-bull/30 text-bull border border-bull/30 disabled:opacity-50 py-3 uppercase tracking-widest font-bold text-[11px] rounded transition-colors"
            >
               {isExecuting ? "Routing..." : `Transact LONG ($1000)`}
            </button>
            <button 
               onClick={() => handleExecute("sell")}
               disabled={isExecuting}
               className="flex-1 bg-bear/20 hover:bg-bear/30 text-bear border border-bear/30 disabled:opacity-50 py-3 uppercase tracking-widest font-bold text-[11px] rounded transition-colors"
            >
               {isExecuting ? "Routing..." : `Transact SHORT ($1000)`}
            </button>
         </div>
         {tradeStatus.status !== 'idle' && (
           <div className={`mt-4 p-3 rounded text-[10px] uppercase font-bold tracking-widest border ${tradeStatus.status === 'success' ? 'bg-bull/10 text-bull border-bull/20' : 'bg-bear/10 text-bear border-bear/20'}`}>
              {tradeStatus.message}
           </div>
         )}
      </div>
    </div>
  );
}
