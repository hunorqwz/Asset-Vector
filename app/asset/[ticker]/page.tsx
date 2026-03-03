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
import { AccuracyScorecard } from "@/components/organisms/AccuracyScorecard";
import { getAccuracyScorecard } from "@/app/actions/signals";
import { AlpacaTerminal } from "@/components/organisms/AlpacaTerminal";
import { fetchOptionsIntelligence, OptionsIntelligence } from "@/lib/options-pricing";
import { OptionsProbabilityPanel } from "@/components/organisms/OptionsProbabilityPanel";

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

  let signal: MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails; optionsIntelligence?: OptionsIntelligence | null };
  try {
    signal = await getAssetDetails(ticker) as any;
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

  const accuracyData = await getAccuracyScorecard(ticker);
  
  const d = signal.stockDetails;
  const p = d.price;

  const optionsData = signal.optionsIntelligence || await fetchOptionsIntelligence(ticker, p.current);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER                                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <LiveHeader 
        ticker={ticker}
        name={d.profile.name}
        exchange={d.profile.exchange}
        trend={signal.trend}
        initialPrice={p.current}
        initialDayChange={p.dayChange}
        initialDayChangePercent={p.dayChangePercent}
        currency={d.profile.currency}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT — Scrollable                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      <main className="overflow-y-auto scrollbar-hide px-6 lg:px-8 py-10">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* Main Content Area */}
          <div className="xl:col-span-9">
            <AssetDashboard ticker={ticker} signal={signal} />
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-3">
            <AccuracyScorecard data={accuracyData} ticker={ticker} />
            <OptionsProbabilityPanel data={optionsData} />
            
             {/* Quick Metrics */}
             <div className="glass-card mt-10 p-6 border border-white/10 relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-matrix" />
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Profile Stats</h3>
                </div>
                <div className="space-y-5">
                  <MetricRow label="Industry" value={d.profile.industry || d.profile.sector || "N/A"} />
                  <MetricRow label="Employees" value={d.profile.employees?.toLocaleString()} />
                  <MetricRow label="Market Cap" value={`$${(p.marketCap / 1e9).toFixed(2)}B`} />
                  <MetricRow label="Beta (5Y)" value={d.keyStats.beta ? d.keyStats.beta.toFixed(2) : "N/A"} />
                </div>
             </div>

             {/* Trading Executive */}
             <AlpacaTerminal ticker={ticker} />
          </div>

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
        </div>
      </footer>
    </>
  );
}

function MetricRow({ label, value }: { label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">{label}</span>
      <span className="text-[11px] font-mono font-bold text-zinc-300">{value}</span>
    </div>
  );
}
