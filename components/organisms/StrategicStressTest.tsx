"use client";
import React, { useState } from "react";
import { RiskIntelligence } from "@/lib/portfolio-risk";
import { simulateHedge } from "@/app/actions/portfolio";

interface StrategicStressTestProps {
  risk: RiskIntelligence;
}

export function StrategicStressTest({ risk }: StrategicStressTestProps) {
  const [simTicker, setSimTicker] = useState("");
  const [simAmount, setSimAmount] = useState<number>(10000);
  const [simRisk, setSimRisk] = useState<RiskIntelligence | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTicker || simAmount <= 0) return;
    setIsSimulating(true);
    const result = await simulateHedge(simTicker, simAmount);
    setSimRisk(result);
    setIsSimulating(false);
  };

  const displayRisk = simRisk || risk;
  const isDiff = simRisk !== null;

  return (
    <div className="glass-card border border-white/10 overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
      
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Sidebar: Global Factor Stats */}
        <div className="xl:col-span-3 border-r border-white/5 p-8 bg-white/[0.01]">
          <h2 className="text-[10px] font-bold text-matrix tracking-[0.2em] uppercase mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
              Factor Analysis
            </div>
            {isDiff && <span className="bg-matrix/20 text-matrix px-2 py-0.5 rounded">SIMULATED</span>}
          </h2>
          
          <div className="space-y-10">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Systemic Exposure (Beta)</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold font-mono tracking-tighter ${isDiff ? 'text-matrix' : 'text-white'}`}>
                  {displayRisk.portfolioBeta}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                  displayRisk.portfolioBeta > 1.3 ? 'bg-bear/20 text-bear' : 
                  displayRisk.portfolioBeta > 0.8 ? 'bg-bull/20 text-bull' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {displayRisk.portfolioBeta > 1.3 ? 'Aggressive' : displayRisk.portfolioBeta > 0.8 ? 'Market Plus' : 'Defensive'}
                </span>
              </div>
              {isDiff && (
                 <p className="mt-2 text-[10px] font-mono font-bold text-white/50">
                    Previous: <span className="text-white">{risk.portfolioBeta}</span> (Δ {(displayRisk.portfolioBeta - risk.portfolioBeta).toFixed(2)})
                 </p>
              )}
              <p className="mt-3 text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
                Benchmark: S&P 500 (SPY)
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Value at Risk (95% VaR)</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold font-mono tracking-tighter ${isDiff ? 'text-matrix' : 'text-white'}`}>
                  {displayRisk.var95}%
                </span>
              </div>
              {isDiff && (
                 <p className="mt-2 text-[10px] font-mono font-bold text-white/50">
                    Previous: <span className="text-white">{risk.var95}%</span>
                 </p>
              )}
              <p className="mt-3 text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
                Institutional Confidence Interval
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Jensen's Alpha</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold font-mono tracking-tighter ${displayRisk.jensensAlpha >= 0 ? (isDiff ? 'text-matrix' : 'text-bull') : 'text-bear'}`}>
                  {displayRisk.jensensAlpha > 0 ? '+' : ''}{displayRisk.jensensAlpha}%
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                  displayRisk.jensensAlpha > 0 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {displayRisk.jensensAlpha > 0 ? 'Alpha' : 'Beta-Drag'}
                </span>
              </div>
              {isDiff && (
                 <p className="mt-2 text-[10px] font-mono font-bold text-white/50">
                    Previous: <span className="text-white">{risk.jensensAlpha}%</span>
                 </p>
              )}
              <p className="mt-3 text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
                Risk-Adjusted Outperformance
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Regime Alignment</p>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${displayRisk.regimeAlignment > 70 ? 'bg-bull' : displayRisk.regimeAlignment > 40 ? 'bg-matrix' : 'bg-bear'}`}
                    style={{ width: `${displayRisk.regimeAlignment}%` }}
                  />
                </div>
                <span className={`text-[14px] font-bold font-mono ${isDiff ? 'text-matrix' : 'text-white'}`}>{displayRisk.regimeAlignment}%</span>
              </div>
              <span className="text-[9px] font-bold text-matrix uppercase tracking-widest bg-matrix/10 px-2 py-0.5 rounded">
                {displayRisk.regimeLabel}
              </span>
            </div>

            {displayRisk.horizonConflicts.length > 0 && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Horizon Conflicts
                </p>
                <div className="space-y-4">
                  {displayRisk.horizonConflicts.map((conflict, i) => (
                    <div key={i} className="group/conflict">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-white font-mono">{conflict.ticker}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter ${
                          conflict.severity === 'HIGH' ? 'bg-bear/20 text-bear' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {conflict.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-tighter">
                        {conflict.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayRisk.correlationAlerts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-bear uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Concentration Warnings
                </p>
                <div className="space-y-3">
                  {displayRisk.correlationAlerts.slice(0, 2).map((alert, i) => (
                    <div key={i} className="text-[10px] text-zinc-400 font-medium leading-relaxed border-l-2 border-bear/30 pl-3">
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main: Stress Simulations */}
        <div className="xl:col-span-9 p-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-2">Scenario Intelligence</h2>
              <h3 className="text-2xl font-bold tracking-tightest leading-none">Strategic Stress Test</h3>
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">
              AI Projection based on Factor Beta & 1Y Variance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayRisk.scenarios.map((s, i) => (
              <div key={i} className={`glass-card p-6 border transition-all duration-300 relative overflow-hidden group/scenario ${isDiff ? 'bg-matrix/5 border-matrix/20' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  s.impactLevel === 'HIGH' ? 'bg-bear' : 
                  s.impactLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-bull'
                } opacity-50 group-hover/scenario:opacity-100 transition-opacity`} />
                
                <h4 className="text-[11px] font-bold text-white uppercase tracking-widest mb-2">{s.name}</h4>
                <p className="text-[10px] text-zinc-500 font-medium mb-6 leading-relaxed uppercase tracking-tighter">{s.description}</p>
                
                <div className="flex items-baseline justify-between pt-4 border-t border-white/5">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Projected Impact</span>
                  <span className={`text-xl font-bold font-mono ${s.projectedReturn >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {s.projectedReturn >= 0 ? '+' : ''}{s.projectedReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 border border-white/5 bg-white/[0.02] rounded flex items-center gap-4">
             <div className="text-[9px] bg-matrix/20 text-matrix px-1.5 py-0.5 rounded font-black tracking-widest uppercase shrink-0">BETA-0.12 ADAPTIVE</div>
             <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-tighter">
               Macro Alignment: {displayRisk.regimeAlignment}% in {displayRisk.regimeLabel}. {displayRisk.regimeAlignment > 70 ? 'Allocation optimally fits the current market structure.' : 'Structural mismatch detected: Consider rebalancing for better regime residency.'}
             </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-8">
            <h3 className="text-xl font-bold tracking-tightest mb-4">Beta-Hedging Simulator</h3>
            <p className="text-xs text-zinc-500 font-medium mb-6 uppercase tracking-widest">
              Simulate adding a new position to see its impact on systemic exposure, Value at Risk, and Jensen's Alpha.
            </p>
            <form onSubmit={handleSimulate} className="flex gap-4 items-end">
              <div className="flex-1 max-w-[200px]">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Ticker</label>
                <input 
                  type="text" 
                  value={simTicker} 
                  onChange={e => setSimTicker(e.target.value)}
                  placeholder="e.g. TLT" 
                  className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-matrix transition-colors"
                />
              </div>
              <div className="flex-1 max-w-[200px]">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Simulated Capital ($)</label>
                <input 
                  type="number" 
                  value={simAmount} 
                  onChange={e => setSimAmount(Number(e.target.value))}
                  placeholder="10000" 
                  className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-matrix transition-colors"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSimulating}
                className="bg-white text-black font-bold uppercase tracking-widest text-[11px] px-8 py-3 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </button>
              {isDiff && (
                <button 
                  type="button" 
                  onClick={() => { setSimRisk(null); setSimTicker(""); }}
                  className="bg-transparent border border-white/20 text-zinc-400 font-bold uppercase tracking-widest text-[11px] px-4 py-3 rounded-md hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
