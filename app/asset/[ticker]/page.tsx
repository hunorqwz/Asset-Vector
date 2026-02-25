import { getAssetDetails } from "@/app/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { fmt, fmtChange } from "@/lib/format";
import { Badge } from "@/components/atoms/Badge";
import { AssetDashboard } from "@/components/organisms/AssetDashboard";

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  return {
    title: `${decodeURIComponent(ticker)} Analysis`,
    description: `Comprehensive analysis and market intelligence for ${decodeURIComponent(ticker)}.`,
  };
}

export default async function AssetPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!ticker) return notFound();

  let signal: MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails };
  try {
    signal = await getAssetDetails(ticker) as MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails };
  } catch {
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

  const d = signal.stockDetails;
  const p = d.price;
  const isBull = p.dayChangePercent >= 0;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER                                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <header className="glass-panel z-[100] flex items-center px-8 sticky top-0 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="w-full flex items-center justify-between py-4">
          {/* LEFT: Back + Identity */}
          <div className="flex items-center gap-10">
            <Link href="/" className="group flex items-center gap-5 text-zinc-500 hover:text-white transition-all">
              <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-all group-active:scale-95 shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tightest text-sm text-white group-hover:text-matrix transition-colors uppercase leading-tight">{d.profile.name}</span>
                <span className="text-[11px] font-bold text-zinc-500 tracking-[0.1em] uppercase">{signal.ticker} · {d.profile.exchange}</span>
              </div>
            </Link>

            {/* Badges */}
            <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-10">
              <Badge label={d.profile.sector} />
              <Badge label={d.profile.industry} />
              <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase border ${
                signal.trend === 'BULLISH' ? 'bg-bull/15 border-bull/30 text-bull' :
                signal.trend === 'BEARISH' ? 'bg-bear/15 border-bear/30 text-bear' :
                'bg-white/5 border-white/15 text-zinc-400'
              }`}>
                {signal.trend === 'BULLISH' ? 'Bullish' : signal.trend === 'BEARISH' ? 'Bearish' : 'Neutral'} Force
              </div>
            </div>
          </div>

          {/* RIGHT: Live Price */}
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="text-xl font-mono font-bold text-white tabular-nums tracking-tighter">{fmt(p.current, d.profile.currency)}</span>
              <div className={`flex items-center gap-2 text-[11px] font-bold font-mono tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
                <span>{isBull ? '▲' : '▼'} {fmtChange(p.dayChange)}</span>
                <span className={`px-2 py-0.5 rounded-md ${isBull ? 'bg-bull/15' : 'bg-bear/15'}`}>
                  {isBull ? '+' : ''}{p.dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse shadow-[0_0_8px_hsla(var(--bull)/0.6)] mb-0.5" />
              <span className="text-[11px] font-bold text-bull uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT — Scrollable                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      <main className="overflow-y-auto scrollbar-hide px-6 lg:px-8 py-6">
        <div className="max-w-[1440px] mx-auto">
          <AssetDashboard ticker={ticker} signal={signal} />
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FOOTER                                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <footer className="glass-panel z-[100] px-8 py-3 flex items-center bg-black/60 backdrop-blur-md border-t border-white/5">
        <div className="w-full flex items-center justify-between">
          <div className="flex gap-10">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Source</span>
              <span className="text-[12px] font-mono font-bold text-zinc-400">Yahoo Finance</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Updated</span>
              <span className="text-[12px] font-mono font-bold text-zinc-300">{new Date(d.fetchedAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Currency</span>
              <span className="text-[12px] font-mono font-bold text-white uppercase">{d.profile.currency}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Type</span>
              <span className="text-[12px] font-mono font-bold text-zinc-400 uppercase">{d.profile.quoteType}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}



