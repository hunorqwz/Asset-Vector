import { Metadata } from "next";
import Link from "next/link";
import { getInstitutionalAlphaPicks, AlphaPick } from "@/app/actions/discovery";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { GlobalHeader } from "@/components/organisms/GlobalHeader";
import { GlobalFooter } from "@/components/organisms/GlobalFooter";
import { fmt, fmtPct } from "@/lib/format";
import { evaluateAlphaPicks, getBacktestWinRate } from "@/app/actions/backtest";
import { BacktestScorecard } from "@/components/organisms/BacktestScorecard";

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
                />
                <ScannerInfoCard 
                  title="Regime-Aligned Leaders" 
                  description="Stocks moving predictably with the overall market trend."
                  color="bg-matrix"
                  badge="STRUCTURAL"
                />
                <ScannerInfoCard 
                  title="Volatility Breakout Squeeze" 
                  description="Stocks consolidating and preparing for a major directional move."
                  color="bg-bear"
                  badge="SQUEEZE"
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
                   <h3 className="text-xs font-bold text-zinc-400 tracking-wide mb-4">Scanner Criteria</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">
                     The scanner prioritizes assets with <span className="text-white">Low Portfolio Correlation</span> to help you build a resilient, non-clustered alpha profile.
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

function ScannerInfoCard({ title, description, color, badge }: { title: string, description: string, color: string, badge: string }) {
  return (
    <div className="bg-white/[0.02] p-6 border border-white/5 relative overflow-hidden transition-all duration-300 flex flex-col group rounded-xl">
      <div className={`absolute -top-4 -right-4 w-24 h-24 ${color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${color} rounded-sm opacity-80`} />
          <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
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

  const corrLabel = pick.correlationToPortfolio !== undefined 
    ? (pick.correlationToPortfolio < 0.2 ? 'Alpha Hedge' : pick.correlationToPortfolio > 0.8 ? 'Clustered' : 'Moderate') 
    : null;

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
            {corrLabel && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                corrLabel === 'Alpha Hedge' ? 'bg-bull/10 text-bull border border-bull/20' : 
                corrLabel === 'Clustered' ? 'bg-bear/10 text-bear border border-bear/20' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {corrLabel}
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 font-medium block w-full whitespace-nowrap overflow-hidden transition-colors">{pick.name}</span>
        </div>
        <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider shadow-sm ${scannerColors[pick.scanner] || 'text-zinc-400 border-white/5 bg-white/5'}`}>
          {scannerLabels[pick.scanner] || pick.scanner.replace('_', ' ')}
        </div>
      </div>

      {/* Institutional Confluence Indicators */}
      <div className="flex gap-2 mb-4">
        {pick.hasFreshOrderBlock && (
          <div className="flex items-center gap-1.5 bg-bull/10 border border-bull/20 px-2 py-0.5 rounded group/ob">
            <div className="w-1.5 h-1.5 bg-bull rounded-full" />
            <span className="text-[10px] font-bold text-bull uppercase tracking-wider">Fresh Liquidity</span>
          </div>
        )}
        {pick.isNarrativeConflicted ? (
          <div className="flex items-center gap-1.5 bg-bear/10 border border-bear/20 px-2 py-0.5 rounded">
            <span className="text-bear text-[10px]">⚠</span>
            <span className="text-[10px] font-bold text-bear uppercase tracking-wider">Conflicted</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-matrix/10 border border-matrix/20 px-2 py-0.5 rounded">
             <span className="text-[10px] font-bold text-matrix uppercase tracking-wider opacity-80">Sentiment Aligned</span>
          </div>
        )}
      </div>
      
      <div className="mb-6 flex-1">
         <p className="text-[11px] text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors line-clamp-2 mb-4">{pick.reason}</p>
         
         {/* Multi-Horizon Signal Matrix */}
         {pick.multiHorizonPrediction && (
           <div className="flex gap-2.5">
             {(['4H', '1D', '1W', '1M'] as const).map((h) => {
               const pred = pick.multiHorizonPrediction![h];
               if (!pred) return null;
               const expectedReturn = (pred.p50 - pick.price) / pick.price;
               const isBullish = expectedReturn > 0.001;
               const isBearish = expectedReturn < -0.001;
               
               return (
                 <div key={h} className="flex flex-col items-center flex-1">
                    <span className="text-[10px] font-bold text-zinc-500 mb-1 tracking-wider uppercase flex items-center gap-0.5">
                      {h}
                      {isBullish && <span className="text-bull text-[8px]">▴</span>}
                      {isBearish && <span className="text-bear text-[8px]">▾</span>}
                    </span>
                    <div className={`w-full h-[3px] rounded-full relative overflow-hidden ${
                      isBullish ? 'bg-bull/20' : isBearish ? 'bg-bear/20' : 'bg-zinc-800'
                    }`}>
                      {(isBullish || isBearish) && (
                        <div className={`absolute inset-0 ${isBullish ? 'bg-bull shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-bear shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} style={{ width: '100%' }} />
                      )}
                    </div>
                  </div>
               );
             })}
           </div>
         )}
      </div>

      <div className="flex items-end justify-between pt-5 border-t border-white/5 mt-auto">
        <div>
          <p className="text-[11px] text-zinc-400 font-medium mb-1.5">Alpha Score</p>
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

