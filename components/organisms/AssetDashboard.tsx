"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import { VectorChart } from "@/components/VectorChart";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { NewsFeed } from "@/components/NewsFeed";
import { InsiderFeed } from "@/components/InsiderFeed";
import { fmt, fmtBigNum, fmtCount, fmtRatio, fmtPct } from "@/lib/format";
import { ValuationIcon, AnalystIcon, DividendIcon, ProfitIcon, HealthIcon, StatsIcon, OwnershipIcon, EarningsIcon, ProfileIcon, CalendarIcon, SECIcon } from "@/components/Icons";
import { DataSection } from "@/components/organisms/DataSection";
import { DataRow } from "@/components/molecules/DataRow";
import { MetricCard } from "@/components/molecules/MetricCard";
import { AnalystRecommendation } from "@/components/organisms/AnalystRecommendation";
import { TargetUpside } from "@/components/molecules/TargetUpside";
import { AnalystTrendChart } from "@/components/organisms/AnalystTrendChart";
import { OwnershipBar } from "@/components/organisms/OwnershipBar";
import { FiftyTwoWeekBar } from "@/components/molecules/FiftyTwoWeekBar";
import { AIIntelligencePanel } from "@/components/organisms/AIIntelligencePanel";
import { SentimentForeman } from "@/components/organisms/SentimentForeman";
import { DCFSandbox } from "@/components/organisms/DCFSandbox";
import { MultiModelValuation } from "@/components/organisms/MultiModelValuation";
import { MonteCarloSimulation } from "@/components/organisms/MonteCarloSimulation";
import { TechnicalConfluencePanel } from "@/components/organisms/TechnicalConfluencePanel";
import { StrategicOracle } from "@/components/organisms/StrategicOracle";
import { NeuralAnomalyReport } from "@/components/organisms/NeuralAnomalyReport";
import { FundamentalIntelligence } from "@/components/organisms/FundamentalIntelligence";
import { NeuralDiagnostics } from "@/components/organisms/NeuralDiagnostics";
import { SentimentDeepDive } from "@/components/organisms/SentimentDeepDive";
import { PeerBenchmarkIntelligence } from "@/components/organisms/PeerBenchmarkIntelligence";
import { InteractiveEarnings } from "@/components/InteractiveEarnings";
import { generateStrategicAnalysis, StrategicInsight } from "@/app/actions/ai";

const TABS = ['OVERVIEW', 'FUNDAMENTALS', 'VALUATION', 'GOVERNANCE'] as const;
type TabType = typeof TABS[number];

export function AssetDashboard({ ticker, signal }: { ticker: string, signal: MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails } }) {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [aiInsight, setAiInsight] = useState<StrategicInsight | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAttemptedRef = useRef<string | null>(null);
  const d = signal.stockDetails;
  const p = d.price;

  const simulation = useMemo(() => {
    return runMonteCarloSimulation({
      currentPrice: p.current,
      historicalPrices: signal.history.map(h => h.close),
      daysToSimulate: 30, // Show next month on chart
      simulations: 5000   // Full institutional resolution
    });
  }, [p.current, ticker]);

  useEffect(() => {
    let isMounted = true;
    if (aiInsight || isAiLoading || aiAttemptedRef.current === ticker) return;
    aiAttemptedRef.current = ticker;
    setIsAiLoading(true);
    generateStrategicAnalysis(ticker, signal.history, d.news).then(res => {
      if (isMounted) { res ? setAiInsight(res) : setAiError("CAPACITY_LIMIT"); }
    }).catch(() => {
      if (isMounted) setAiError("CONNECTION_ERROR");
    }).finally(() => {
      if (isMounted) setIsAiLoading(false);
    });
    return () => { isMounted = false; };
  }, [ticker, aiInsight, isAiLoading]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* CHART - INTEGRATED INTO THE GRID SYSTEM */}
      <section className="glass-card overflow-hidden">
        <VectorChart 
          data={signal.history} 
          prediction={signal.prediction} 
          stochasticPaths={simulation.isValid ? simulation.paths : []}
          ticker={ticker} 
          color={signal.trend === "BULLISH" ? "#22c55e" : "#ef4444"} 
          height={520} 
        />
      </section>

      {/* METRICS ROW - ATOMIC DATA BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0">
        <MetricCard label="Price" value={fmt(p.current)} subValue={p.dayChange >= 0 ? `+${fmt(p.dayChange)}` : fmt(p.dayChange)} trend={p.dayChange >= 0 ? "BULLISH" : "BEARISH"} />
        <MetricCard label="Volume" value={fmtCount(p.volume)} subValue={`Avg: ${fmtCount(p.averageVolume)}`} />
        <MetricCard label="Day High" value={fmt(p.dayHigh)} />
        <MetricCard label="Day Low" value={fmt(p.dayLow)} />
        <MetricCard label="Market Cap" value={fmtBigNum(p.marketCap)} />
        <MetricCard label="Regime Beta" value={fmtRatio(d.keyStats.beta)} />
      </div>

      {/* TABS BUTTON BAR */}
      <div className="flex items-center border border-white/10 bg-[#0a0a0a] w-full mb-8 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-3 px-6 text-[11px] font-bold tracking-[0.2em] transition-all uppercase border-r border-white/10 last:border-r-0 whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-matrix text-white' 
                : 'text-zinc-500 hover:bg-[#111111] hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>


      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === 'OVERVIEW' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-1 h-3.5 bg-white shadow-none" />
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-300">Neural Intelligence Core</h2>
                </div>
                {isAiLoading ? (
                  <div className="h-64 border border-dashed border-white/20 bg-transparent flex flex-col items-center justify-center gap-4">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-ping" />
                    <span className="text-[12px] uppercase font-bold text-zinc-500 tracking-[0.4em] animate-pulse">Scanning Neural Vector...</span>
                  </div>
                ) : <StrategicOracle insight={aiInsight} ticker={ticker} history={signal.history} error={aiError} />}
                <NeuralAnomalyReport history={signal.history} technicals={signal.technicalAnalysis} insight={aiInsight} />
              </section>

              <TechnicalConfluencePanel tech={signal.technicalAnalysis} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <NeuralDiagnostics history={signal.history} />
                <SentimentDeepDive news={d.news} sentiment={signal.sentiment} />
              </div>

              <section className="space-y-6">
                <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Surgical Asset Profile</h3>
                <p className="text-[14px] text-zinc-400 leading-relaxed font-normal border-l-2 border-white/5 pl-6">{d.profile.description}</p>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <PeerBenchmarkIntelligence 
                currentTicker={ticker}
                currentPrice={p.current}
                currentPE={d.valuation.forwardPE}
                currentMargin={d.profitability.profitMargins}
                currentGrowth={d.profitability.revenueGrowth}
                peer={d.peerBenchmark}
              />

              <MonteCarloSimulation simulation={simulation} />
              
              <DataSection title="Summary Statistics" icon={<StatsIcon />}>
                <DataRow label="EPS (Trailing)" value={`$${d.keyStats.trailingEps?.toFixed(2)}`} />
                <DataRow label="EPS (Forward)" value={`$${d.keyStats.forwardEps?.toFixed(2)}`} />
                <DataRow label="Short Ratio" value={fmtRatio(d.keyStats.shortRatio)} />
                <DataRow label="Short % of Float" value={fmtPct(d.keyStats.shortPercentOfFloat)} colored />
                <DataRow label="Yearly Momentum" value={fmtPct(p.fiftyTwoWeekChangePercent)} colored />
              </DataSection>

              {d.upcomingCatalysts && (d.upcomingCatalysts.earningsDate || d.upcomingCatalysts.exDividendDate) && (
                <DataSection title="Catalysts" icon={<CalendarIcon />}>
                  {d.upcomingCatalysts.earningsDate && <DataRow label="Earnings Release" value={d.upcomingCatalysts.earningsDate} highlight />}
                  {d.upcomingCatalysts.exDividendDate && <DataRow label="Ex-Dividend Date" value={d.upcomingCatalysts.exDividendDate} />}
                  {d.upcomingCatalysts.dividendDate && <DataRow label="Dividend Pay Date" value={d.upcomingCatalysts.dividendDate} />}
                </DataSection>
              )}
            </div>
          </>
        )}

        {activeTab === 'FUNDAMENTALS' && (
          <div className="lg:col-span-12 space-y-12">
            <FundamentalIntelligence 
              profitability={d.profitability}
              health={d.financialHealth}
              valuation={d.valuation}
              peer={d.peerBenchmark}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               {d.quarterlyReports.length > 0 && (
                 <DataSection title="Historical Quarters" icon={<EarningsIcon />}>
                   <InteractiveEarnings reports={d.quarterlyReports} currency={d.profile.currency} />
                 </DataSection>
               )}
               {!d.isETF && (
                 <div className="space-y-10">
                   <AnalystTrendChart trends={d.analystTrend} />
                   {d.isETF ? (
                     <DataSection title="Holdings" icon={<StatsIcon />}>
                       <div className="space-y-2">{d.etfHoldings.slice(0, 15).map((h, i) => (<div key={i} className="flex justify-between items-center text-[12px]"><span className="text-zinc-500">{h.symbol}</span><span className="text-zinc-400 truncate max-w-[200px]">{h.name}</span><span className="text-white font-medium">{(h.pct ? h.pct * 100 : 0).toFixed(2)}%</span></div>))}</div>
                     </DataSection>
                   ) : (
                     <DataSection title="Dividends" icon={<DividendIcon />}>
                        <DataRow label="Yield" value={fmtPct(d.dividends.dividendYield)} highlight />
                        <DataRow label="Payout Ratio" value={fmtPct(d.dividends.payoutRatio)} />
                        <DataRow label="Last Dividend" value={`$${d.dividends.lastDividendValue || 0}`} />
                        <DataRow label="Ex-Dividend Date" value={d.dividends.exDividendDate || '—'} />
                     </DataSection>
                   )}
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'VALUATION' && (
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              {!d.isETF && <><DCFSandbox details={d} currentPrice={d.price.current} /><MultiModelValuation details={d} /></>}
              <AIIntelligencePanel ticker={ticker} prediction={signal.prediction!} regime={signal.regime} sentiment={signal.sentiment} history={signal.history} />
            </div>
            <div className="lg:col-span-5 space-y-10">
              <DataSection title="Multiples" icon={<ValuationIcon />}>
                <DataRow label="Trailing P/E" value={fmtRatio(d.valuation.trailingPE)} />
                <DataRow label="Forward P/E" value={fmtRatio(d.valuation.forwardPE)} highlight />
                <DataRow label="PEG Ratio" value={fmtRatio(d.valuation.pegRatio)} />
                <DataRow label="Price / Sales" value={fmtRatio(d.valuation.priceToSales)} />
              </DataSection>
              {d.analyst.numberOfAnalysts > 0 && (
                <DataSection title="Consensus" icon={<AnalystIcon />}>
                  <AnalystRecommendation rec={d.analyst.recommendationKey} mean={d.analyst.recommendationMean} count={d.analyst.numberOfAnalysts} />
                  <div className="mt-8"><TargetUpside current={p.current} target={d.analyst.targetMean!} /></div>
                </DataSection>
              )}
            </div>
          </div>
        )}

        {activeTab === 'GOVERNANCE' && (
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6 space-y-10">
              <DataSection title="Equity Stake" icon={<OwnershipIcon />}>
                <DataRow label="Insiders" value={fmtPct(d.keyStats.heldPercentInsiders)} />
                <DataRow label="Institutions" value={fmtPct(d.keyStats.heldPercentInstitutions)} />
                <div className="mt-8"><OwnershipBar insiders={d.keyStats.heldPercentInsiders!} institutions={d.keyStats.heldPercentInstitutions!} /></div>
              </DataSection>
              {d.secFilings.length > 0 && (
                <DataSection title="Regulatory Filings" icon={<SECIcon />}>
                  <div className="space-y-4">
                    {d.secFilings.slice(0, 8).map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block group/sec hover:bg-[#111111] p-4 -m-1 transition-all border border-transparent hover:border-white/10">
                        <div className="flex justify-between items-center mb-2"><span className="text-[11px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors">{f.type}</span><span className="text-[11px] font-bold font-mono text-zinc-500">{f.date}</span></div>
                        <p className="text-[13px] font-bold text-zinc-400 group-hover:text-white transition-colors leading-snug">{f.title}</p>
                      </a>
                    ))}
                  </div>
                </DataSection>
              )}
            </div>
            <div className="lg:col-span-6 space-y-10">
              {!d.isETF && d.insiderTransactions.length > 0 && <InsiderFeed transactions={d.insiderTransactions} />}
            </div>
          </div>
        )}
      </div>

      <section className="pt-16 border-t border-white/5">
        <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em] mb-10">52-Week Range Spectrum</h3>
        <FiftyTwoWeekBar low={p.fiftyTwoWeekLow} high={p.fiftyTwoWeekHigh} current={p.current} />
      </section>
    </div>
  );
}
