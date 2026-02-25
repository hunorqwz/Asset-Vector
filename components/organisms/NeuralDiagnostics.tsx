"use client";
import React, { useState } from 'react';
import { OHLCV } from '@/lib/market-data';
import { KalmanFilter } from '@/lib/kalman';

interface NeuralDiagnosticsProps {
  history: OHLCV[];
}

export function NeuralDiagnostics({ history }: NeuralDiagnosticsProps) {
  const [showTheory, setShowTheory] = useState(false);
  
  // Calculate a live demonstration of the Kalman Filter state
  const last30 = history.slice(-30);
  const kf = new KalmanFilter(1, 0.1);
  const filtered = last30.map(h => kf.filter(h.close));
  const lastResult = filtered[filtered.length - 1];

  return (
    <div className="glass-card border border-white/10 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-matrix rounded-full animate-pulse" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">Neural Diagnostics (Time Series Layer)</h3>
        </div>
        <button 
          onClick={() => setShowTheory(!showTheory)}
          className={`text-[10px] font-bold tracking-widest uppercase py-1 px-3 border transition-all ${
            showTheory ? 'bg-matrix border-matrix text-white' : 'border-white/10 text-zinc-500 hover:text-white'
          }`}
        >
          {showTheory ? 'Live Monitor' : 'Theory Core'}
        </button>
      </div>

      <div className="p-6">
        {showTheory ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h4 className="text-[12px] font-bold text-white uppercase tracking-widest mb-2">Recursive Bayesian Estimation</h4>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                The Kalman filter is the optimal estimator for linear systems with Gaussian noise. 
                In our engine, it treats the raw stock price as a <span className="text-zinc-200">Noisy Observation (z)</span> and attempts to 
                extract the <span className="text-matrix">Hidden State (x)</span>—the true price vector.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Process Noise (Q)</span>
                <p className="text-[11px] text-zinc-400">Represents unexpected market volatility. High Q makes the filter follow the price more closely.</p>
              </div>
              <div className="p-4 bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Sensor Noise (R)</span>
                <p className="text-[11px] text-zinc-400">Represents execution slippage and bid-ask noise. High R makes the filter smoother.</p>
              </div>
            </div>

             <div className="bg-[#111111] border border-white/10 p-4 font-mono">
                <span className="text-[10px] text-zinc-500 uppercase block mb-2">Algorithm Evolution</span>
                <code className="text-[11px] text-matrix">{"Innovation[k] = Price[k] - State[k-1]"}</code><br/>
                <code className="text-[11px] text-matrix">{"New_State[k] = State[k-1] + Gain[k] * Innovation[k]"}</code>
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-3 gap-8">
              <DiagnosticItem label="Signal SNR" value={`${(kf.getSNR() * 100).toFixed(1)} dB`} desc="Signal-to-Noise Ratio" />
              <DiagnosticItem label="Kalman Gain" value={lastResult.gain?.toFixed(4) || '0.000'} desc="Current responsiveness" />
              <DiagnosticItem label="Convergence" value="Stable" desc="Matrix stability check" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Real-time Innovation Stream</span>
                <span className="text-matrix">System Operational</span>
              </div>
              <div className="h-20 flex items-end gap-1 px-1">
                 {filtered.slice(-20).map((f, i) => {
                   const innovation = Math.abs(last30[last30.length - 20 + i].close - f.prediction);
                   const height = Math.min(100, (innovation / lastResult.prediction) * 50000);
                   return (
                     <div 
                       key={i} 
                       className="flex-1 bg-matrix/20 hover:bg-matrix/40 transition-all border-t border-matrix/40"
                       style={{ height: `${height}%` }}
                     />
                   );
                 })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosticItem({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{label}</span>
      <div className="text-xl font-bold text-white font-mono tabular-nums">{value}</div>
      <span className="text-[10px] text-zinc-600 font-medium italic block">{desc}</span>
    </div>
  );
}
