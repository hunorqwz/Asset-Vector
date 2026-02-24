import { getAssetDetails } from "@/app/actions";
import { VectorChart } from "@/components/VectorChart";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { InteractiveEarnings } from "@/components/InteractiveEarnings";
import { METRIC_INSIGHTS } from "@/lib/insights";
import { NewsFeed } from "@/components/NewsFeed";
import { InsiderFeed } from "@/components/InsiderFeed";
import { fmt, fmtChange, fmtBigNum, fmtCount, fmtRatio, fmtPct } from "@/lib/format";
import { 
  ValuationIcon, AnalystIcon, DividendIcon, ProfitIcon, HealthIcon, StatsIcon, 
  OwnershipIcon, EarningsIcon, AIIcon, ProfileIcon, CalendarIcon, SECIcon 
} from "@/components/Icons";
import { Badge } from "@/components/atoms/Badge";
import { DataSection } from "@/components/organisms/DataSection";
import { DataRow } from "@/components/molecules/DataRow";
import { MetricCard } from "@/components/molecules/MetricCard";
import { AnalystRecommendation } from "@/components/organisms/AnalystRecommendation";
import { TargetUpside } from "@/components/molecules/TargetUpside";
import { AnalystTrendChart } from "@/components/organisms/AnalystTrendChart";
import { OwnershipBar } from "@/components/organisms/OwnershipBar";
import { EarningsRow } from "@/components/molecules/EarningsRow";
import { FiftyTwoWeekBar } from "@/components/molecules/FiftyTwoWeekBar";

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
      <header className="glass-panel z-[100] flex items-center px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-matrix/10">
          <div className="h-full bg-matrix w-1/4 animate-[shimmer-sweep_4s_linear_infinite]" />
        </div>

        <div className="w-full flex items-center justify-between">
          {/* LEFT: Back + Identity */}
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-3.5 text-zinc-500 hover:text-white transition-all">
              <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center border border-white/5 group-hover:bg-white/5 transition-all group-active:scale-90">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sm text-white group-hover:text-matrix transition-colors">{d.profile.name}</span>
                <span className="text-[10px] text-zinc-500 tracking-wide">{signal.ticker} · {d.profile.exchange}</span>
              </div>
            </Link>

            {/* Badges */}
            <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-6">
              <Badge label={d.profile.sector} />
              <Badge label={d.profile.industry} />
              <div className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide border ${
                signal.trend === 'BULLISH' ? 'bg-bull/5 border-bull/20 text-bull' :
                signal.trend === 'BEARISH' ? 'bg-bear/5 border-bear/20 text-bear' :
                'bg-white/5 border-white/10 text-zinc-400'
              }`}>
                {signal.trend === 'BULLISH' ? 'Bullish' : signal.trend === 'BEARISH' ? 'Bearish' : 'Neutral'}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Price */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-lg font-mono font-semibold text-white tabular-nums tracking-tight">{fmt(p.current, d.profile.currency)}</span>
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold font-mono tabular-nums ${isBull ? 'text-bull' : 'text-bear'}`}>
                <span>{isBull ? '▲' : '▼'} {fmtChange(p.dayChange)}</span>
                <span className={`px-1.5 py-0.5 rounded ${isBull ? 'bg-bull/10' : 'bg-bear/10'}`}>
                  {isBull ? '+' : ''}{p.dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] font-medium text-emerald-500">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT — Scrollable                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      <main className="overflow-y-auto scrollbar-hide px-6 lg:px-8 py-6">
        <div className="max-w-[1440px] mx-auto space-y-8">

          {/* ── ROW 1: CHART ────────────────────────────────── */}
          <section className="glass-panel border-matrix/5 relative overflow-hidden">
            <VectorChart
              data={signal.history}
              prediction={signal.prediction}
              ticker={ticker}
              color={signal.trend === "BULLISH" ? "#10b981" : "#f43f5e"}
              height={550}
              initialMode="TACTICAL"
            />
          </section>

          {/* MARKET NARRATIVE (NEWS) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="w-1 h-4 bg-matrix rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Market Narrative</h2>
            </div>
            <NewsFeed articles={d.news} />
          </section>

          {/* ── ROW 2: KEY PRICE STATS (Horizontal Strip) ───── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Previous Close" value={fmt(p.previousClose)} />
            <MetricCard label="Open" value={fmt(p.open)} />
            <MetricCard label="Day Range" value={`${fmt(p.dayLow)} — ${fmt(p.dayHigh)}`} />
            <MetricCard label="52 Week Range" value={`${fmt(p.fiftyTwoWeekLow)} — ${fmt(p.fiftyTwoWeekHigh)}`} />
            <MetricCard label="Volume" value={fmtCount(p.volume)} subValue={`Avg: ${fmtCount(p.averageVolume)}`} />
            <MetricCard label="Market Cap" value={fmtBigNum(p.marketCap)} />
          </div>

          {/* ── ROW 3: THREE COLUMN LAYOUT ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ─── LEFT COLUMN (4 cols): Valuation + Analyst ─── */}
            <div className="lg:col-span-4 space-y-6">

              {/* COMPANY/ETF PROFILE */}
              <DataSection title={d.isETF ? "Fund Profile" : "Company Profile"} icon={<ProfileIcon />}>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{d.profile.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{d.profile.sector} • {d.profile.industry}</p>
                    </div>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono text-zinc-400">{d.profile.exchange}</span>
                  </div>
                </div>
                {!d.isETF && <DataRow label="Employees" value={d.profile.employees?.toLocaleString() || '—'} />}
                <DataRow label="Country" value={d.profile.country} />
                <DataRow label="Currency" value={d.profile.currency} />
              </DataSection>

              {/* VALUATION METRICS */}
              <DataSection title="Valuation" icon={<ValuationIcon />}>
                <DataRow label="Trailing P/E" value={fmtRatio(d.valuation.trailingPE)} insightId="trailingPE" />
                <DataRow label="Forward P/E" value={fmtRatio(d.valuation.forwardPE)} insightId="forwardPE" />
                <DataRow label="PEG Ratio" value={fmtRatio(d.valuation.pegRatio)} insightId="pegRatio" />
                <DataRow label="Price / Book" value={fmtRatio(d.valuation.priceToBook)} />
                <DataRow label="Price / Sales" value={fmtRatio(d.valuation.priceToSales)} />
                <DataRow label="EV / Revenue" value={fmtRatio(d.valuation.enterpriseToRevenue)} />
                <DataRow label="EV / EBITDA" value={fmtRatio(d.valuation.enterpriseToEbitda)} />
                <DataRow label="Enterprise Value" value={fmtBigNum(d.valuation.enterpriseValue)} />
                <DataRow label="Book Value / Share" value={fmtRatio(d.valuation.bookValue)} />
              </DataSection>

              {/* ANALYST RATINGS */}
              {d.analyst.numberOfAnalysts > 0 && (
                <DataSection title="Analyst Consensus" icon={<AnalystIcon />}>
                  <div className="mb-4">
                    <AnalystRecommendation rec={d.analyst.recommendationKey} mean={d.analyst.recommendationMean} count={d.analyst.numberOfAnalysts} />
                  </div>
                  <DataRow label="Target Low" value={fmt(d.analyst.targetLow)} />
                  <DataRow label="Target Mean" value={fmt(d.analyst.targetMean)} highlight />
                  <DataRow label="Target Median" value={fmt(d.analyst.targetMedian)} />
                  <DataRow label="Target High" value={fmt(d.analyst.targetHigh)} />
                  {d.analyst.targetMean && p.current > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <TargetUpside current={p.current} target={d.analyst.targetMean} />
                    </div>
                  )}
                  {d.analystTrend && d.analystTrend.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <AnalystTrendChart trends={d.analystTrend} />
                    </div>
                  )}
                </DataSection>
              )}

              {/* DIVIDENDS */}
              {d.dividends.hasDividend && (
                <DataSection title="Dividends" icon={<DividendIcon />}>
                  <DataRow label="Annual Dividend" value={d.dividends.dividendRate ? `$${d.dividends.dividendRate.toFixed(2)}` : '—'} />
                  <DataRow label="Dividend Yield" value={d.dividends.dividendYield ? `${d.dividends.dividendYield.toFixed(2)}%` : '—'} highlight />
                  <DataRow label="Payout Ratio" value={d.dividends.payoutRatio ? `${d.dividends.payoutRatio.toFixed(1)}%` : '—'} />
                  <DataRow label="Ex-Dividend Date" value={d.dividends.exDividendDate ?? '—'} />
                  <DataRow label="5Y Avg Yield" value={d.dividends.fiveYearAvgDividendYield ? `${d.dividends.fiveYearAvgDividendYield.toFixed(2)}%` : '—'} />
                </DataSection>
              )}

              {/* UPCOMING CATALYSTS */}
              {d.upcomingCatalysts && (d.upcomingCatalysts.earningsDate || d.upcomingCatalysts.exDividendDate) && (
                <DataSection title="Upcoming Catalysts" icon={<CalendarIcon />}>
                  {d.upcomingCatalysts.earningsDate && (
                    <div className="space-y-0.5 mb-2">
                      <DataRow label="Next Earnings" value={d.upcomingCatalysts.earningsDate + (d.upcomingCatalysts.isEarningsEstimate ? ' (Est)' : '')} highlight />
                      {d.upcomingCatalysts.earningsAverage !== null && (
                        <DataRow label="Est. EPS" value={`$${d.upcomingCatalysts.earningsAverage.toFixed(2)}`} />
                      )}
                      {d.upcomingCatalysts.revenueAverage !== null && (
                        <DataRow label="Est. Revenue" value={fmtBigNum(d.upcomingCatalysts.revenueAverage)} />
                      )}
                    </div>
                  )}
                  {d.upcomingCatalysts.exDividendDate && (
                    <div className="pt-2 mt-2 border-t border-white/5 space-y-0.5">
                      <DataRow label="Ex-Dividend Date" value={d.upcomingCatalysts.exDividendDate} colored />
                    </div>
                  )}
                </DataSection>
              )}
            </div>

            {/* ─── CENTER COLUMN (4 cols): Financials ───────── */}
            <div className="lg:col-span-4 space-y-6">

              {d.isETF ? (
                <>
                  <DataSection title="Fund Composition" icon={<StatsIcon />}>
                    <div className="space-y-3">
                      {d.etfHoldings.slice(0, 10).map((h, i) => (
                        <div key={i} className="flex justify-between items-center group/h">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-matrix bg-matrix/5 px-1.5 py-0.5 rounded">{h.symbol}</span>
                            <span className="text-[11px] text-zinc-400 group-hover/h:text-white transition-colors truncate max-w-[150px]">{h.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-white">{(h.pct ? h.pct * 100 : 0).toFixed(2)}%</span>
                        </div>
                      ))}
                      {d.etfHoldings.length === 0 && (
                        <div className="text-center py-4 text-[10px] text-zinc-600 italic">Holding data unavailable for this fund type.</div>
                      )}
                    </div>
                  </DataSection>

                  {/* SECTOR DNA (FOR ETFs) */}
                  {d.sectorExposure.length > 0 && (
                    <DataSection title="Sector DNA" icon={<AIIcon />}>
                      <div className="space-y-4 pt-1">
                        {d.sectorExposure.sort((a, b) => b.weight - a.weight).map((s, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-zinc-400 font-medium">{s.sector}</span>
                              <span className="text-[11px] font-mono text-white">{(s.weight * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-matrix/60 rounded-full" 
                                style={{ width: `${s.weight * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </DataSection>
                  )}
                </>
              ) : (
                <>
                  {/* PROFITABILITY */}
                  <DataSection title="Profitability" icon={<ProfitIcon />}>
                    <DataRow label="Gross Margin" value={fmtPct(d.profitability.grossMargins)} insightId="grossMargins" />
                    <DataRow label="Operating Margin" value={fmtPct(d.profitability.operatingMargins)} insightId="grossMargins" />
                    <DataRow label="Profit Margin" value={fmtPct(d.profitability.profitMargins)} insightId="profitMargins" highlight />
                    <DataRow label="Return on Equity" value={fmtPct(d.profitability.returnOnEquity)} />
                    <DataRow label="Return on Assets" value={fmtPct(d.profitability.returnOnAssets)} />
                    <div className="pt-3 mt-3 border-t border-white/5">
                      <DataRow label="Revenue Growth" value={fmtPct(d.profitability.revenueGrowth)} insightId="revenueGrowth" colored />
                      <DataRow label="Earnings Growth" value={fmtPct(d.profitability.earningsGrowth)} colored />
                    </div>
                  </DataSection>

                  {/* FINANCIAL HEALTH */}
                  <DataSection title="Financial Health" icon={<HealthIcon />}>
                    <DataRow label="Total Cash" value={fmtBigNum(d.financialHealth.totalCash)} />
                    <DataRow label="Total Debt" value={fmtBigNum(d.financialHealth.totalDebt)} />
                    <DataRow label="Debt / Equity" value={fmtRatio(d.financialHealth.debtToEquity)} insightId="debtToEquity" />
                    <DataRow label="Current Ratio" value={fmtRatio(d.financialHealth.currentRatio)} insightId="currentRatio" />
                    <DataRow label="Quick Ratio" value={fmtRatio(d.financialHealth.quickRatio)} />
                    <div className="pt-3 mt-3 border-t border-white/5">
                      <DataRow label="Total Revenue" value={fmtBigNum(d.financialHealth.totalRevenue)} />
                      <DataRow label="EBITDA" value={fmtBigNum(d.financialHealth.ebitda)} />
                      <DataRow label="Free Cash Flow" value={fmtBigNum(d.financialHealth.freeCashflow)} colored />
                      <DataRow label="Operating Cash Flow" value={fmtBigNum(d.financialHealth.operatingCashflow)} />
                    </div>
                  </DataSection>
                </>
              )}
            </div>

            {/* ─── RIGHT COLUMN (4 cols): Stats + Info ──────── */}
            <div className="lg:col-span-4 space-y-6">

              {/* KEY STATISTICS */}
              <DataSection title="Key Statistics" icon={<StatsIcon />}>
                <DataRow label="Beta (5Y)" value={fmtRatio(d.keyStats.beta)} insightId="beta" />
                <DataRow label="Trailing EPS" value={d.keyStats.trailingEps ? `$${d.keyStats.trailingEps.toFixed(2)}` : '—'} />
                <DataRow label="Forward EPS" value={d.keyStats.forwardEps ? `$${d.keyStats.forwardEps.toFixed(2)}` : '—'} />
                <DataRow label="50-Day SMA" value={fmt(p.fiftyDayAverage)} />
                <DataRow label="200-Day SMA" value={fmt(p.twoHundredDayAverage)} />
                <DataRow label="52W Change" value={fmtPct(p.fiftyTwoWeekChangePercent)} colored />
                <div className="pt-3 mt-3 border-t border-white/5">
                  <DataRow label="Shares Outstanding" value={fmtCount(d.keyStats.sharesOutstanding)} />
                  <DataRow label="Float" value={fmtCount(d.keyStats.floatShares)} />
                  <DataRow label="Shares Short" value={fmtCount(d.keyStats.sharesShort)} />
                  <DataRow label="Short Ratio" value={fmtRatio(d.keyStats.shortRatio)} />
                  <DataRow label="Short % of Float" value={fmtPct(d.keyStats.shortPercentOfFloat)} />
                </div>
                
                {/* RISK FORENSICS */}
                {d.riskMetrics && (
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Risk Forensics</span>
                    </div>
                    <DataRow label="Max Drawdown (1Y)" value={fmtPct(d.riskMetrics.maxDrawdown1Y)} colored />
                    <DataRow label="Realized Volatility (1Y)" value={fmtPct(d.riskMetrics.realizedVolatility1Y)} />
                  </div>
                )}
                
                {/* ALPHA INTELLIGENCE */}
                {d.alphaIntelligence && (
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Alpha Intelligence</span>
                    </div>
                    <div className="glass-panel p-3 bg-matrix/5 border-matrix/10 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-zinc-400">vs {d.alphaIntelligence.benchmarkTicker}</span>
                        <span className={`text-[11px] font-mono font-bold ${d.alphaIntelligence.alpha1Y >= 0 ? 'text-bull' : 'text-bear'}`}>
                          {d.alphaIntelligence.alpha1Y >= 0 ? '+' : ''}{(d.alphaIntelligence.alpha1Y * 100).toFixed(1)}% Alpha
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-zinc-600 font-mono">
                        <span>Asset: {(d.alphaIntelligence.assetReturn1Y * 100).toFixed(1)}%</span>
                        <span>Mkt: {(d.alphaIntelligence.benchmarkReturn1Y * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMPETITOR BENCHMARK */}
                {d.peerBenchmark && d.profitability && d.valuation && (
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Competitor Benchmark</span>
                    </div>
                    <div className="glass-panel p-3 bg-matrix/5 border-matrix/10 rounded-lg space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-zinc-400">vs {d.peerBenchmark.ticker}</span>
                        <span className="text-[10px] text-matrix font-mono">{fmt(d.peerBenchmark.price)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="text-zinc-500 uppercase">Forward P/E</span>
                        <div className="flex gap-2 text-right justify-end min-w-[80px]">
                           <span className={(d.valuation.forwardPE || 0) < (d.peerBenchmark.forwardPE || Infinity) ? 'text-bull' : 'text-zinc-400'}>{fmtRatio(d.valuation.forwardPE)}</span>
                           <span className="text-zinc-700">|</span>
                           <span className="text-zinc-500">{fmtRatio(d.peerBenchmark.forwardPE)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="text-zinc-500 uppercase">Profit Margin</span>
                        <div className="flex gap-2 text-right justify-end min-w-[80px]">
                           <span className={(d.profitability.profitMargins || 0) > (d.peerBenchmark.profitMargin || 0) ? 'text-bull' : 'text-zinc-400'}>{fmtPct(d.profitability.profitMargins)}</span>
                           <span className="text-zinc-700">|</span>
                           <span className="text-zinc-500">{fmtPct(d.peerBenchmark.profitMargin)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="text-zinc-500 uppercase">Rev Growth</span>
                        <div className="flex gap-2 text-right justify-end min-w-[80px]">
                           <span className={(d.profitability.revenueGrowth || 0) > (d.peerBenchmark.revenueGrowth || 0) ? 'text-bull' : 'text-zinc-400'}>{fmtPct(d.profitability.revenueGrowth)}</span>
                           <span className="text-zinc-700">|</span>
                           <span className="text-zinc-500">{fmtPct(d.peerBenchmark.revenueGrowth)}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </DataSection>

              {/* OWNERSHIP */}
              <DataSection title="Ownership" icon={<OwnershipIcon />}>
                <DataRow label="Insiders" value={fmtPct(d.keyStats.heldPercentInsiders)} />
                <DataRow label="Institutions" value={fmtPct(d.keyStats.heldPercentInstitutions)} />
                {d.keyStats.heldPercentInsiders !== null && d.keyStats.heldPercentInstitutions !== null && (
                  <div className="mt-3">
                    <OwnershipBar insiders={d.keyStats.heldPercentInsiders} institutions={d.keyStats.heldPercentInstitutions} />
                  </div>
                )}
                {d.topHolders.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Top Stakes</span>
                    {d.topHolders.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex justify-between items-center group/h">
                        <span className="text-[10px] text-zinc-400 group-hover/h:text-white transition-colors truncate max-w-[120px]">{h.name}</span>
                        <div className="flex items-center gap-2">
                           {h.pctChange !== null && h.pctChange !== 0 && (
                             <span className={`text-[9px] font-mono ${h.pctChange > 0 ? 'text-bull' : 'text-bear'}`}>
                               {h.pctChange > 0 ? '+' : ''}{(h.pctChange * 100).toFixed(1)}%
                             </span>
                           )}
                           <span className="text-[10px] font-mono text-white">{(h.pctHeld ? h.pctHeld * 100 : 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DataSection>

              {/* INSIDER MOVEMENTS (FOR EQUITIES) */}
              {!d.isETF && d.insiderTransactions.length > 0 && (
                <DataSection title="Insider Movements" icon={<OwnershipIcon />}>
                  <InsiderFeed transactions={d.insiderTransactions} />
                </DataSection>
              )}

              {/* INTERACTIVE EARNINGS */}
              {d.quarterlyReports.length > 0 && (
                <DataSection title="Historical Intelligence" icon={<EarningsIcon />}>
                  <InteractiveEarnings reports={d.quarterlyReports} currency={d.profile.currency} />
                </DataSection>
              )}

              {/* LIVE SEC FILINGS */}
              {d.secFilings && d.secFilings.length > 0 && (
                <DataSection title="SEC Regulatory Feed" icon={<SECIcon />}>
                  <div className="space-y-3 pt-1">
                    {d.secFilings.slice(0, 5).map((f, i) => (
                      <a 
                        key={i} 
                        href={f.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col gap-1 group/sec"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-matrix bg-matrix/5 px-1.5 py-0.5 rounded border border-matrix/10">{f.type}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{f.date}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 group-hover/sec:text-white transition-colors line-clamp-2 leading-relaxed">
                          {f.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </DataSection>
              )}


              {/* AI PREDICTION */}
              <DataSection title="AI Projection" icon={<AIIcon />}>
                <DataRow label="Model" value={signal.prediction?.source || "Heuristic"} />
                <DataRow label="Regime" value={signal.regime.replace(/_/g, ' ')} />
                <DataRow label="Sentiment" value={signal.sentiment} />
                <div className="pt-3 mt-3 border-t border-white/5">
                  <DataRow label="Upper Bound (P90)" value={fmt(signal.prediction?.p90)} />
                  <DataRow label="Median Target (P50)" value={fmt(signal.prediction?.p50)} highlight />
                  <DataRow label="Lower Bound (P10)" value={fmt(signal.prediction?.p10)} />
                </div>
              </DataSection>
            </div>
          </div>

          {/* ── ROW 4: 52-WEEK POSITION BAR ─────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide mb-5">52-Week Position</h3>
            <FiftyTwoWeekBar low={p.fiftyTwoWeekLow} high={p.fiftyTwoWeekHigh} current={p.current} />
          </section>

          {/* ── ROW 5: COMPANY DESCRIPTION ──────────────────── */}
          {d.profile.description && (
            <section className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">About {d.profile.name}</h3>
                <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                  {d.profile.employees && <span>{fmtCount(d.profile.employees)} employees</span>}
                  {d.profile.country && <span>· {d.profile.city ? `${d.profile.city}, ` : ''}{d.profile.country}</span>}
                  {d.profile.website && (
                    <a href={d.profile.website} target="_blank" rel="noopener noreferrer" className="text-matrix hover:text-white transition-colors">
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-6">
                {d.profile.description}
              </p>
            </section>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FOOTER                                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <footer className="glass-panel z-[100] px-8 flex items-center">
        <div className="w-full flex items-center justify-between">
          <div className="flex gap-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Source</span>
              <span className="text-[10px] font-mono text-zinc-500">Yahoo Finance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Updated</span>
              <span className="text-[10px] font-mono text-zinc-500">{new Date(d.fetchedAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Currency</span>
              <span className="text-[10px] font-mono text-white">{d.profile.currency}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Type</span>
              <span className="text-[10px] font-mono text-zinc-400">{d.profile.quoteType}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}



