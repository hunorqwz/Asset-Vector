import { getAssetDetails } from "@/app/actions";
import { VectorChart } from "@/components/VectorChart";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function AssetPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  
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
      {/* HEADER: COMMAND CENTER (Asset Context) */}
      <header className="glass-panel z-[100] flex items-center px-8 relative overflow-hidden">
          {/* MINI TICKER TAPE */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-matrix/10">
              <div className="h-full bg-matrix w-1/4 animate-[shimmer-sweep_4s_linear_infinite]"></div>
          </div>

          <div className="w-full flex items-center justify-between">
              
              {/* BACK & IDENTITY */}
              <div className="flex items-center gap-8">
                   <Link href="/" className="group flex items-center gap-4 text-zinc-500 hover:text-white transition-all">
                      <div className="w-8 h-8 glass-card rounded flex items-center justify-center border border-white/5 group-hover:bg-white/5 transition-all group-active:scale-90">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="m15 18-6-6 6-6"/>
                          </svg>
                      </div>
                      <div className="flex flex-col -space-y-1">
                        <span className="font-bold tracking-tighter text-sm uppercase text-white group-hover:text-matrix transition-colors">{signal.ticker}</span>
                        <span className="text-[7px] text-terminal font-mono tracking-[0.4em] uppercase opacity-50">Local_Analysis</span>
                      </div>
                  </Link>

                  {/* MINI INDICATORS */}
                  <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-8">
                      <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border ${signal.trend === 'BULLISH' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                          {signal.trend}
                      </div>
                  </div>
              </div>

              {/* CENTER: VALUATION METADATA */}
              <div className="flex items-center gap-12">
                  <div className="flex flex-col items-center">
                      <span className="text-telemetry">Confidence</span>
                      <span className="text-[10px] font-mono font-bold text-white">{(100 / (signal.uncertainty + 1)).toFixed(1)}%</span>
                  </div>
                  <div className="h-4 w-[1px] bg-white/10"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-telemetry">Mark_Price</span>
                      <span className="text-[10px] font-mono font-bold text-white">{fmt(signal.price)}</span>
                  </div>
              </div>

              {/* STATUS: SYSTEM LINK */}
              <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                      <span className="text-telemetry text-emerald-500">Link_Stable</span>
                      <span className="text-[7px] font-mono text-terminal uppercase tracking-widest">Active</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
              </div>
          </div>
      </header>

      {/* MAIN: TACTICAL ANALYSIS AREA */}
      <main className="overflow-y-auto scrollbar-hide px-8 py-8">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT: MAIN CHART (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    <section className="glass-panel overflow-hidden p-1 relative group">
                        <div className="h-[500px] w-full bg-black/40 relative overflow-hidden">
                             <VectorChart 
                                data={signal.history} 
                                color={signal.trend === "BULLISH" ? "#10b981" : "#f43f5e"} 
                                height={500}
                                initialMode="TACTICAL"
                                prediction={signal.prediction}
                             />
                        </div>
                    </section>

                    {/* STATS ARCHITECTURE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 glass-card relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6">
                                <span className="w-2 h-2 rounded-full bg-matrix block glow-matrix opacity-60 animate-pulse"></span>
                            </div>
                            <h3 className="text-telemetry mb-8">AI_Model_Certainty</h3>
                             <div className="flex items-baseline gap-3">
                                <span className="text-6xl font-black tracking-tighter group-hover:text-matrix transition-colors">
                                    {((1 - signal.uncertainty) * 100).toFixed(0)}
                                </span>
                                <span className="text-xl font-bold text-terminal">%</span>
                             </div>
                             <div className="mt-6 flex items-center gap-2">
                                <span className="text-[7.5px] font-mono text-terminal uppercase tracking-widest">Model:</span>
                                <span className="text-[7.5px] font-mono text-white/60 uppercase tracking-widest">{signal.prediction?.source || "TFT_V1"}</span>
                             </div>
                        </div>
                        <div className="p-8 glass-card group">
                            <h3 className="text-telemetry mb-8">Vector_Projection</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-[9px] font-mono text-terminal uppercase">Target_P50</span>
                                    <span className="text-sm font-mono font-bold text-indigo-400">{fmt(signal.prediction?.p50 || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-60">
                                    <span className="text-[8px] font-mono text-terminal uppercase">Limit_P90</span>
                                    <span className="text-[10px] font-mono text-white">{fmt(signal.prediction?.p90 || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-40">
                                    <span className="text-[8px] font-mono text-terminal uppercase">Floor_P10</span>
                                    <span className="text-[10px] font-mono text-white">{fmt(signal.prediction?.p10 || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: TACTICAL LOG */}
                <div className="lg:col-span-4 space-y-8">
                     <section className="glass-card p-8">
                        <h3 className="text-telemetry mb-8 border-b border-white/5 pb-4">Liquidity_Zones</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-rose-500 text-[9px] font-bold uppercase tracking-[0.2em]">Resistance</span>
                                     <span className="text-[7px] text-terminal font-mono">High_Volume</span>
                                 </div>
                                 <span className="text-rose-500 font-bold text-lg tracking-tighter font-mono">{fmt(signal.price * 1.02)}</span>
                            </div>
                            <div className="flex justify-between items-center py-5 border-y border-white/5 -mx-8 px-8 bg-white/[0.01]">
                                 <span className="text-telemetry text-zinc-300">Spot_Mark</span>
                                 <span className="text-white font-bold text-lg tracking-tighter font-mono group-hover:text-matrix transition-colors">{fmt(signal.price)}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-emerald-500 text-[9px] font-bold uppercase tracking-[0.2em]">Support</span>
                                     <span className="text-[7px] text-terminal font-mono">Delta_Conf.</span>
                                 </div>
                                 <span className="text-emerald-500 font-bold text-lg tracking-tighter font-mono">{fmt(signal.price * 0.98)}</span>
                            </div>
                        </div>
                     </section>

                     <section className="glass-card p-8 flex flex-col gap-6">
                        <h3 className="text-telemetry border-b border-white/5 pb-4">Vector_Health</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-matrix"></div>
                                <span className="text-telemetry text-emerald-500">Node_Stable</span>
                            </div>
                            <span className="text-telemetry opacity-40">Uptime: 99.9%</span>
                        </div>
                        <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
                            <div className="w-full h-full bg-matrix glow-matrix animate-pulse"></div>
                        </div>
                     </section>
                </div>
            </div>
      </main>

      {/* FOOTER: TERMINAL TELEMETRY */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
           <div className="w-full flex items-center justify-between">
                <div className="flex gap-12">
                    <div className="flex flex-col">
                      <span className="text-telemetry">Analysis_Hash</span>
                      <span className="text-[9px] font-mono text-terminal">HXP-882-QX</span>
                    </div>
                </div>
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-2">
                         <span className="text-telemetry">Sync</span>
                         <span className="text-emerald-500 font-mono text-[9px]">TRUE</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-telemetry">Matrix</span>
                         <span className="text-white font-mono text-[9px]">G_01</span>
                    </div>
                </div>
           </div>
      </footer>
    </>
  );
}
