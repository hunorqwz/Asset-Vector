import { getAssetDetails } from "@/app/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { fmt, fmtChange } from "@/lib/format";
import { Badge } from "@/components/atoms/Badge";
import { AssetDashboard } from "@/components/organisms/AssetDashboard";
import { LiveHeader } from "@/components/organisms/LiveHeader";

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
      <LiveHeader 
        ticker={ticker}
        name={d.profile.name}
        exchange={d.profile.exchange}
        sector={d.profile.sector}
        industry={d.profile.industry}
        trend={signal.trend}
        initialPrice={p.current}
        initialDayChange={p.dayChange}
        initialDayChangePercent={p.dayChangePercent}
        currency={d.profile.currency}
      />

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



