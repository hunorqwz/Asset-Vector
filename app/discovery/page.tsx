import { Metadata } from "next";
import Link from "next/link";
import { getInstitutionalAlphaPicks, AlphaPick } from "@/app/actions/discovery";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { GlobalFooter } from "@/components/organisms/GlobalFooter";
import { fmt, fmtPct } from "@/lib/format";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";
import { InfoTooltip } from "@/components/atoms/InfoTooltip";
import { EducationCategory } from "@/components/providers/EducationProvider";

export const metadata: Metadata = {
  title: "Market Discovery & Scanners | Asset Vector",
  description: "Institutional Market Scanners and High-Conviction Market Picks.",
};

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const [picks, alerts, backtestData, _eval, regimeData] = await Promise.all([
    getInstitutionalAlphaPicks(),
    getAlerts(),
    getBacktestWinRate(),
    evaluateAlphaPicks(),
    getRegimeBreakout(),
  ]);

  const { insights } = await checkAndTriggerAlerts({}); 

  return (
    <>
      <GlobalHeader alerts={alerts} insights={insights} regimeBreakout={regimeData} />

      <main className="overflow-y-auto scrollbar-hide px-8 py-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Page Heading */}
          <div className="mb-12 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1]">Discovery</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-8">
              

              {/* Scanner Categories Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScannerInfoCard 
                  title="High-Conviction Alpha" 
                  description="Stocks with strong buy signals from multiple institutional sources."
                  color="bg-bull"
                  badge="TOP TIER"
                  insightKey="JENSENS_ALPHA"
                  category="QUANT"
                />
                <ScannerInfoCard 
                  title="Regime-Aligned Leaders" 
                  description="Stocks moving predictably with the overall market trend."
                  color="bg-matrix"
                  badge="STRUCTURAL"
                  insightKey="HURST_EXPONENT"
                  category="QUANT"
                />
                <ScannerInfoCard 
                  title="Volatility Breakout Squeeze" 
                  description="Stocks consolidating and preparing for a major directional move."
                  color="bg-bear"
                  badge="SQUEEZE"
                  insightKey="TTM_SQUEEZE"
                  category="QUANT"
                />
              </div>

              {/* Picks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {picks.map((pick, i) => (
                  <DiscoveryCard key={pick.ticker} pick={pick} />
                ))}
                {picks.length === 0 && (
                  <div className="col-span-full border border-white/5 bg-zinc-950/30 p-24 text-center rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-matrix/5 border border-matrix/20 flex items-center justify-center mx-auto mb-6">
                       <div className="w-4 h-4 bg-matrix rounded-full" />
                    </div>
                    <h2 className="text-sm font-bold text-white tracking-wide mb-2">No results found</h2>
                    <p className="text-sm text-zinc-400 max-w-xs mx-auto">No assets match your current filters. Try adjusting your criteria.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 2xl:col-span-3">
              <div className="sticky top-24 space-y-8">
                <BacktestScorecard data={backtestData} />
                
                {/* Screener Protocol Sidebar Tip */}
                <div className="bg-white/[0.02] rounded-xl p-6 border border-white/10 relative overflow-hidden">
                   <h3 className="text-xs font-bold text-zinc-400 tracking-wide mb-4 flex items-center">
                     Scanner Criteria
                     <InfoTooltip insightKey="PORTFOLIO_CORRELATION" category="QUANT" />
                   </h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">
                     The scanner prioritizes assets with <span className="text-white">Low Asset Covariance</span> to help you build a resilient, non-clustered alpha profile.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <GlobalFooter />
    </>
  );
}

function ScannerInfoCard({ 
  title, 
  description, 
  color, 
  badge, 
  insightKey, 
  category = "QUANT" 
}: { 
  title: string; 
  description: string; 
  color: string; 
  badge: string; 
  insightKey?: string; 
  category?: EducationCategory; 
}) {
  return (
    <div className="bg-white/[0.02] p-6 border border-white/5 relative overflow-hidden transition-all duration-300 flex flex-col group rounded-xl">
      <div className={`absolute -top-4 -right-4 w-24 h-24 ${color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${color} rounded-sm opacity-80`} />
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center">
            {title}
            {insightKey && <InfoTooltip insightKey={insightKey} category={category} />}
          </h3>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed relative z-10 flex-1">{description}</p>
    </div>
  );
}

function DiscoveryCard({ pick }: { pick: AlphaPick }) {
  const scannerColors: Record<string, string> = {
    'SURGICAL_ALPHA': 'text-bull border-bull/30 bg-bull/5',
    'REGIME_FIT': 'text-matrix border-matrix/30 bg-matrix/5',
    'VOL_SQUEEZE': 'text-bear border-bear/30 bg-bear/5',
    'MOMENTUM': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5',
    'VALUE': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5',
    'UNCORRELATED': 'text-zinc-200 border-zinc-500/30 bg-zinc-500/5'
  };

  const scannerLabels: Record<string, string> = {
    'SURGICAL_ALPHA': 'High-Conviction Alpha',
    'REGIME_FIT': 'Regime-Aligned Leader',
    'VOL_SQUEEZE': 'Volatility Squeeze',
    'MOMENTUM': 'Momentum',
    'VALUE': 'Value',
    'UNCORRELATED': 'Uncorrelated'
  };

  return (
    <Link 
      href={`/asset/${pick.ticker}`} 
      className="bg-white/[0.02] flex flex-col h-full border border-white/5 transition-all duration-300 p-6 group relative rounded-xl hover:bg-white/[0.04]"
    >
      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold font-mono text-white uppercase tracking-wider">{pick.ticker}</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium block w-full whitespace-nowrap overflow-hidden transition-colors">{pick.name}</span>
        </div>
        <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider shadow-sm ${scannerColors[pick.scanner] || 'text-zinc-400 border-white/5 bg-white/5'}`}>
          {scannerLabels[pick.scanner] || pick.scanner.replace('_', ' ')}
        </div>
      </div>

      <div className="flex items-end justify-between pt-5 border-t border-white/5 mt-auto">
        <div>
          <p className="text-[11px] text-zinc-400 font-medium mb-1.5 flex items-center">
            Alpha Score
            <InfoTooltip insightKey="JENSENS_ALPHA" category="QUANT" />
          </p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono tracking-tighter ${
              pick.score > 85 ? 'text-bull' : 
              pick.score > 75 ? 'text-matrix' : 'text-white'
            }`}>{pick.score}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
        </div>
        <div className="text-right pb-0.5">
          <p className="text-[13px] font-mono font-bold text-white mb-0.5">${pick.price.toFixed(2)}</p>
          <p className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${pick.change >= 0 ? 'text-bull' : 'text-bear'}`}>
            <span>{pick.change >= 0 ? '+' : ''}{pick.change.toFixed(2)}%</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

