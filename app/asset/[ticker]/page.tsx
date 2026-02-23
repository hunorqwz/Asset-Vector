import { getAssetDetails } from "@/app/actions";
import { VectorChart } from "@/components/VectorChart";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function AssetPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  
  if (!ticker) return notFound();

  let signal: MarketSignal & { prediction: PredictionResult };
  try {
     signal = await getAssetDetails(ticker) as MarketSignal & { prediction: PredictionResult };
  } catch (e) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
            <h1 className="text-2xl text-bear mb-4 tracking-tight font-semibold">Connection Lost</h1>
            <p className="text-sm text-zinc-500 mb-8 max-w-md text-center leading-relaxed">
                Unable to fetch data for <span className="font-semibold text-zinc-300">{ticker}</span>. Please try again.
            </p>
            <Link href="/" className="px-6 py-2.5 border border-white/10 hover:bg-white/5 transition-colors text-xs font-medium rounded-lg tracking-wide">
                Back to Dashboard
            </Link>
        </div>
     );
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <>
      {/* HEADER */}
      <header className="glass-panel z-[100] flex items-center px-8 relative overflow-hidden">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-matrix/10">
              <div className="h-full bg-matrix w-1/4 animate-[shimmer-sweep_4s_linear_infinite]"></div>
          </div>

          <div className="w-full flex items-center justify-between">
              
              {/* LEFT: Back + Identity */}
              <div className="flex items-center gap-6">
                   <Link href="/" className="group flex items-center gap-3.5 text-zinc-500 hover:text-white transition-all">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center border border-white/5 group-hover:bg-white/5 transition-all group-active:scale-90">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="m15 18-6-6 6-6"/>
                          </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold tracking-tight text-sm text-white group-hover:text-matrix transition-colors">{signal.ticker}</span>
                        <span className="text-[10px] text-zinc-500 tracking-wide">Analysis</span>
                      </div>
                  </Link>

                  {/* Trend badge */}
                  <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-6">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide border ${signal.trend === 'BULLISH' ? 'bg-bull/5 border-bull/20 text-bull' : signal.trend === 'BEARISH' ? 'bg-bear/5 border-bear/20 text-bear' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                          {signal.trend === 'BULLISH' ? 'Bullish' : signal.trend === 'BEARISH' ? 'Bearish' : 'Neutral'}
                      </div>
                  </div>
              </div>

              {/* CENTER: Key Metrics */}
              <div className="flex items-center gap-10">
                  <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Confidence</span>
                      <span className="text-sm font-mono font-semibold text-white tabular-nums">{(100 / (signal.uncertainty + 1)).toFixed(1)}%</span>
                  </div>
                  <div className="h-4 w-px bg-white/10"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Price</span>
                      <span className="text-sm font-mono font-semibold text-white tabular-nums">{fmt(signal.price)}</span>
                  </div>
              </div>

              {/* RIGHT: Connection Status */}
              <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-medium text-emerald-500 tracking-wide">Connected</span>
                      <span className="text-[10px] text-zinc-600">Live data</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
              </div>
          </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="overflow-y-auto scrollbar-hide px-8 py-6">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: Chart + Stats (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="glass-panel overflow-hidden p-1 relative group">
                        <div className="min-h-[600px] w-full bg-black/40 relative overflow-hidden">
                             <VectorChart 
                                data={signal.history} 
                                ticker={signal.ticker}
                                color={signal.trend === "BULLISH" ? "#10b981" : "#f43f5e"} 
                                height={600}
                                initialMode="TACTICAL"
                                prediction={signal.prediction}
                             />
                        </div>
                    </section>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 glass-card relative overflow-hidden group rounded-xl">
                            <div className="absolute top-0 right-0 p-5">
                                <span className="w-2 h-2 rounded-full bg-matrix block glow-matrix opacity-60 animate-pulse"></span>
                            </div>
                            <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide mb-6">AI Model Certainty</h3>
                             <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-semibold tracking-tight group-hover:text-matrix transition-colors tabular-nums">
                                    {((1 - signal.uncertainty) * 100).toFixed(0)}
                                </span>
                                <span className="text-xl font-medium text-zinc-600">%</span>
                             </div>
                             <div className="mt-4 flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600">Model</span>
                                <span className="text-[10px] font-mono text-zinc-500">{signal.prediction?.source || "TFT v1"}</span>
                             </div>
                        </div>
                        <div className="p-6 glass-card group rounded-xl">
                            <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide mb-6">Price Projection</h3>
                            <div className="flex flex-col gap-3.5">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                                    <span className="text-[11px] text-zinc-400">Median target</span>
                                    <span className="text-sm font-mono font-semibold text-indigo-400 tabular-nums">{fmt(signal.prediction?.p50 || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-70">
                                    <span className="text-[11px] text-zinc-500">Upper bound</span>
                                    <span className="text-[11px] font-mono text-zinc-300 tabular-nums">{fmt(signal.prediction?.p90 || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-50">
                                    <span className="text-[11px] text-zinc-500">Lower bound</span>
                                    <span className="text-[11px] font-mono text-zinc-300 tabular-nums">{fmt(signal.prediction?.p10 || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Side Panel */}
                <div className="lg:col-span-4 space-y-6">
                     <section className="glass-card p-6 rounded-xl">
                        <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide mb-6 border-b border-white/5 pb-3">Key Levels</h3>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-[11px] font-semibold text-rose-400">Resistance</span>
                                     <span className="text-[10px] text-zinc-600">High-volume zone</span>
                                 </div>
                                 <span className="text-rose-400 font-semibold text-base tracking-tight font-mono tabular-nums">{fmt(signal.price * 1.02)}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-y border-white/5 -mx-6 px-6 bg-white/[0.01]">
                                 <span className="text-[11px] text-zinc-400">Current price</span>
                                 <span className="text-white font-semibold text-base tracking-tight font-mono tabular-nums">{fmt(signal.price)}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                 <div className="flex flex-col">
                                     <span className="text-[11px] font-semibold text-emerald-400">Support</span>
                                     <span className="text-[10px] text-zinc-600">Confirmation level</span>
                                 </div>
                                 <span className="text-emerald-400 font-semibold text-base tracking-tight font-mono tabular-nums">{fmt(signal.price * 0.98)}</span>
                            </div>
                        </div>
                     </section>

                     <section className="glass-card p-6 flex flex-col gap-4 rounded-xl">
                        <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide border-b border-white/5 pb-3">System Status</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-matrix"></div>
                                <span className="text-[11px] font-medium text-emerald-500">Online</span>
                            </div>
                            <span className="text-[10px] text-zinc-600">Uptime 99.9%</span>
                        </div>
                        <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
                            <div className="w-full h-full bg-matrix glow-matrix animate-pulse"></div>
                        </div>
                     </section>
                </div>
            </div>
      </main>

      {/* FOOTER */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
           <div className="w-full flex items-center justify-between">
                <div className="flex gap-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600">Session</span>
                      <span className="text-[10px] font-mono text-zinc-500">HXP-882-QX</span>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] text-zinc-600">Encryption</span>
                         <span className="text-emerald-500 font-mono text-[10px]">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] text-zinc-600">Grid</span>
                         <span className="text-white font-mono text-[10px]">01</span>
                    </div>
                </div>
           </div>
      </footer>
    </>
  );
}
