"use client";
import { RiskIntelligence } from "@/lib/portfolio-risk";

interface StrategicStressTestProps {
  risk: RiskIntelligence;
}

export function StrategicStressTest({ risk }: StrategicStressTestProps) {
  return (
    <div className="glass-card border border-white/10 overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/40 to-transparent" />
      
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Sidebar: Global Factor Stats */}
        <div className="xl:col-span-3 border-r border-white/5 p-8 bg-white/[0.01]">
          <h2 className="text-[10px] font-bold text-matrix tracking-[0.2em] uppercase mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
            Factor Analysis
          </h2>
          
          <div className="space-y-10">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Systemic Exposure (Beta)</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono text-white tracking-tighter">{risk.portfolioBeta}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                  risk.portfolioBeta > 1.3 ? 'bg-bear/20 text-bear' : 
                  risk.portfolioBeta > 0.8 ? 'bg-bull/20 text-bull' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {risk.portfolioBeta > 1.3 ? 'Aggressive' : risk.portfolioBeta > 0.8 ? 'Market Plus' : 'Defensive'}
                </span>
              </div>
              <p className="mt-3 text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
                {Math.round(Math.abs(risk.portfolioBeta - 1) * 100)}% {risk.portfolioBeta > 1 ? 'more' : 'less'} volatile than S&P 500.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Realized Volatility</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono text-white tracking-tighter">{risk.volatilityAnnualized}%</span>
              </div>
              <p className="mt-3 text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
                Annualized standard deviation of Capital returns.
              </p>
            </div>

            {risk.correlationAlerts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-bear uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Concentration Warnings
                </p>
                <div className="space-y-3">
                  {risk.correlationAlerts.map((alert, i) => (
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
            {risk.scenarios.map((s, i) => (
              <div key={i} className="glass-card p-6 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 relative overflow-hidden group/scenario">
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
               Risk Engine detected {risk.portfolioBeta > 1.5 ? 'Extreme' : 'Nominal'} sensitivity to systemic factor rotation. Recommendation: {risk.portfolioBeta > 1.2 ? 'Consider adding defensive hedges (Hedged/Cash).' : 'Portfolio maintains balanced exposure profile.'}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
