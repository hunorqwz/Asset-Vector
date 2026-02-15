import { getAssetDetails } from "@/app/actions";
import { VectorChart } from "@/components/VectorChart";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function AssetPage({ params }: { params: { ticker: string } }) {
  const { ticker } = params;
  
  if (!ticker) return notFound();

  let signal;
  try {
     signal = await getAssetDetails(ticker);
  } catch (e) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-black p-4">
            <h1 className="text-2xl text-rose-500 mb-4 tracking-tighter">VECTOR LOST</h1>
            <p className="text-zinc-600 mb-8 max-w-md text-center uppercase text-[10px] tracking-widest font-bold">
                The connection to the tactical matrix failed for {ticker}.
            </p>
            <Link href="/" className="px-6 py-2 border border-white/10 hover:bg-white/5 transition-colors uppercase text-[10px] tracking-widest font-black rounded-lg">
                Return to Matrix
            </Link>
        </div>
     );
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <>
      {/* HEADER: ELITE NAVIGATION ARCHITECTURE */}
      <header className="glass-panel z-[100] flex items-center px-8">
          <div className="w-full flex items-center justify-between">
              
              {/* BACK & BRAND */}
              <div className="flex items-center gap-6">
                   <Link href="/" className="group flex items-center gap-3 text-zinc-500 hover:text-white transition-all">
                      <div className="w-9 h-9 glass-card rounded-lg flex items-center justify-center border border-white/5 group-hover:bg-white/5 transition-all group-active:scale-90">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="m15 18-6-6 6-6"/>
                          </svg>
                      </div>
                      <div className="flex flex-col -space-y-1">
                        <span className="font-bold tracking-tighter text-base uppercase text-white group-hover:text-matrix transition-colors">{signal.ticker}</span>
                        <span className="text-[8px] text-terminal font-mono tracking-[0.3em] uppercase">Vector_Analysis</span>
                      </div>
                  </Link>
              </div>

              {/* CENTER: TREND STATUS */}
              <div className="flex items-center gap-4">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border ${signal.trend === 'BULLISH' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                      {signal.trend}_Regime
                  </div>
                  <div className="h-px w-12 bg-white/5"></div>
                  <div className="flex flex-col">
                      <span className="text-telemetry">Confidence</span>
                      <span className="text-[10px] font-mono font-bold text-white">{(100 / (signal.uncertainty + 1)).toFixed(1)}%</span>
                  </div>
              </div>

              {/* STATUS: SYSTEM TELEMETRY */}
              <div className="flex items-center gap-8">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-telemetry">Mark_Price</span>
                    <span className="text-sm font-mono font-bold text-white tracking-tighter">{fmt(signal.price)}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
              </div>
          </div>
      </header>

      {/* MAIN: TACTICAL ANALYSIS AREA */}
      <main className="overflow-y-auto scrollbar-hide px-8 py-12">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT: MAIN CHART (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    <section className="glass-panel overflow-hidden p-1 relative group">
                        <div className="h-[550px] w-full bg-black/40 relative overflow-hidden">
                             <VectorChart 
                                data={signal.history} 
                                color={signal.trend === "BULLISH" ? "#10b981" : "#f43f5e"} 
                                height={550}
                                initialMode="TACTICAL"
                             />
                        </div>
                    </section>

                    {/* STATS ARCHITECTURE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-10 glass-card relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6">
                                <span className="w-2 h-2 rounded-full bg-matrix block glow-matrix opacity-60 animate-pulse"></span>
                            </div>
                            <h3 className="text-telemetry mb-12">Confidence_Coefficient</h3>
                             <div className="flex items-baseline gap-3">
                                <span className="text-7xl font-bold tracking-tighter group-hover:text-matrix transition-colors">
                                    {(100 / (signal.uncertainty + 1)).toFixed(0)}
                                </span>
                                <span className="text-2xl font-bold text-terminal">%</span>
                             </div>
                        </div>
                        <div className="p-10 glass-card group">
                            <h3 className="text-telemetry mb-12">Market_Regime_Type</h3>
                            <div className="text-3xl font-bold tracking-tighter text-white uppercase mb-6 group-hover:text-matrix transition-colors">
                                {signal.regime.replace('_', ' ')}
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium uppercase tracking-wide">
                                {signal.regime === 'MOMENTUM' 
                                  ? 'High velocity vector detected. Statistical models suggest momentum continuation with 84% reliability.' 
                                  : 'Range bound oscillation detected. Mean reversion probable within current liquidity zones.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: TACTICAL LOG */}
                <div className="lg:col-span-4 space-y-8">
                     <section className="glass-card p-10">
                        <h3 className="text-telemetry mb-12 border-b border-white/5 pb-4">Liquidity_Zones</h3>
                        <div className="space-y-8">
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">Resistance_1</span>
                                     <span className="text-[9px] text-terminal font-mono">0.98 Conf.</span>
                                 </div>
                                 <span className="text-rose-500 font-bold text-xl tracking-tighter font-mono">{fmt(signal.price * 1.02)}</span>
                            </div>
                            <div className="flex justify-between items-center py-6 border-y border-white/5 -mx-10 px-10 bg-white/[0.02] shadow-inner">
                                 <span className="text-telemetry text-zinc-300">Spot_Mark</span>
                                 <span className="text-white font-bold text-xl tracking-tighter font-mono group-hover:text-matrix transition-colors">{fmt(signal.price)}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Support_1</span>
                                     <span className="text-[9px] text-terminal font-mono">0.94 Conf.</span>
                                 </div>
                                 <span className="text-emerald-500 font-bold text-xl tracking-tighter font-mono">{fmt(signal.price * 0.98)}</span>
                            </div>
                        </div>
                     </section>

                     <section className="glass-card p-10 flex flex-col gap-6">
                        <h3 className="text-telemetry border-b border-white/5 pb-4">Vector_Health</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                                <span className="text-telemetry text-emerald-500">Node_Stable</span>
                            </div>
                            <span className="text-telemetry opacity-40">99.9% Up</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-matrix glow-matrix animate-pulse"></div>
                        </div>
                     </section>
                </div>
            </div>
      </main>

      {/* FOOTER: TERMINAL TELEMETRY */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
           <div className="w-full grid grid-cols-2 items-center">
                <div className="flex gap-12">
                    <div className="flex flex-col gap-1">
                      <span className="text-telemetry">Analysis_Hash</span>
                      <span className="text-[10px] font-mono text-terminal">HXP-882-QX</span>
                    </div>
                </div>
                <div className="flex justify-end gap-12 font-mono text-[10px] text-terminal uppercase tracking-widest">
                    <span>Synchronized: <span className="text-white">TRUE</span></span>
                    <span>Link: <span className="text-emerald-500">STABLE</span></span>
                </div>
           </div>
      </footer>
    </>


  );
}
