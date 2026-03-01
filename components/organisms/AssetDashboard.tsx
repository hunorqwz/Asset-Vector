"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { runMonteCarloSimulation, MonteCarloResult } from "@/lib/monte-carlo";
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
import { AlgorithmicTargetsPanel } from "@/components/organisms/AlgorithmicTargetsPanel";
import { InstitutionalFlowPanel } from "@/components/organisms/InstitutionalFlowPanel";
import { StrategicOracle } from "@/components/organisms/StrategicOracle";
import { useAlpacaTape } from "@/hooks/useAlpacaTape";
import { LivePriceCard } from "@/components/molecules/LivePriceCard";
import { NeuralAnomalyReport } from "@/components/organisms/NeuralAnomalyReport";
import { RiskEntropyPanel } from "@/components/organisms/RiskEntropyPanel";
import { FundamentalIntelligence } from "@/components/organisms/FundamentalIntelligence";
import { NeuralDiagnostics } from "@/components/organisms/NeuralDiagnostics";
import { SentimentDeepDive } from "@/components/organisms/SentimentDeepDive";
import { PeerBenchmarkIntelligence } from "@/components/organisms/PeerBenchmarkIntelligence";
import { InteractiveEarnings } from "@/components/InteractiveEarnings";
import { generateStrategicAnalysis, StrategicInsight } from "@/app/actions/ai";
import { ConfluenceEngine } from "@/components/organisms/ConfluenceEngine";
import { ContextEngine } from "@/components/organisms/ContextEngine";

const TABS = ['OVERVIEW', 'FUNDAMENTALS', 'VALUATION', 'GOVERNANCE'] as const;
type TabType = typeof TABS[number];

export function AssetDashboard({ ticker, signal }: { ticker: string, signal: MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails } }) {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isNeuralEngaged, setIsNeuralEngaged] = useState(false);
  const d = signal.stockDetails;
  const p = d.price;

  const { lastTick } = useAlpacaTape(ticker);

  const [simulation, setSimulation] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    // Run simulation only on the client to avoid Math.random() SSR hydration mismatches
    setSimulation(runMonteCarloSimulation({
      currentPrice: p.current,
      historicalPrices: signal.history.map(h => h.close),
      daysToSimulate: 30, // Show next month on chart
      simulations: 5000   // Full institutional resolution
    }));
  }, [p.current, ticker, signal.history]);

  const [insight, setInsight] = useState<StrategicInsight | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtraction = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const res = await generateStrategicAnalysis(ticker, signal.history, d.news);
      if (res) {
        setInsight(res);
      } else {
        setError('CAPACITY_LIMIT');
      }
    } catch {
      setError('CONNECTION_ERROR');
    } finally {
      setIsExtracting(false);
    }
  };

  useEffect(() => {
    if (isNeuralEngaged && !insight && !isExtracting && !error) {
      handleExtraction();
    }
  }, [isNeuralEngaged, insight, isExtracting, error]);
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* CHART - INTEGRATED INTO THE GRID SYSTEM */}
      <section className="glass-card overflow-hidden">
        <VectorChart 
          data={signal.history} 
          prediction={signal.prediction} 
          stochasticPaths={simulation?.isValid ? simulation.paths : []}
          ticker={ticker} 
          color={signal.trend === "BULLISH" ? "#22c55e" : "#ef4444"} 
          height={520} 
          lastTick={lastTick ? { price: lastTick.price, time: Math.floor(new Date(lastTick.timestamp).getTime() / 1000) } : null}
        />
      </section>

      {/* METRICS ROW - ATOMIC DATA BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0">
        <LivePriceCard 
          label="Price" 
          initialPrice={p.current} 
          lastTick={lastTick} 
          dayChange={p.dayChange} 
        />
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
            className={`flex-1 py-3.5 px-6 text-[10px] font-bold tracking-[0.25em] transition-all uppercase border-r border-white/5 last:border-r-0 whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-black' 
                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
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
              {!isNeuralEngaged && (
                 <div className="glass-card border border-bull/30 bg-bull/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-bull shadow-bull" />
                    <div>
                      <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-bull animate-pulse" />
                        AI Analysis Inactive
                      </h3>
                      <p className="text-[12px] text-zinc-400 max-w-lg leading-relaxed">Enable AI analysis to extract live sentiment summaries and 90-day price scenarios powered by Gemini 2.0.</p>
                    </div>
                    <button 
                      onClick={() => setIsNeuralEngaged(true)} 
                      className="whitespace-nowrap flex items-center gap-3 px-6 py-3 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                    >
                      <div className="w-2 h-2 bg-black rounded-full" />
                      Enable AI Analysis
                    </button>
                 </div>
              )}

              <ConfluenceEngine details={d} tech={signal.technicalAnalysis} sentiment={signal.sentiment} ticker={ticker} />

              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-1 h-3.5 bg-white shadow-none" />
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-300">AI Analysis</h2>
                </div>
                <StrategicOracle 
                  ticker={ticker} 
                  history={signal.history} 
                  news={d.news} 
                  insight={insight}
                  isExtracting={isExtracting}
                  error={error}
                  onExtract={handleExtraction}
                  globalTrigger={isNeuralEngaged} 
                />
                <NeuralAnomalyReport history={signal.history} technicals={signal.technicalAnalysis} insight={insight} />
              </section>

              <TechnicalConfluencePanel tech={signal.technicalAnalysis} />
              <AlgorithmicTargetsPanel tech={signal.technicalAnalysis} />
              <InstitutionalFlowPanel tech={signal.technicalAnalysis} optionsFlow={d.optionsFlow} currentPrice={p.current} />
              <RiskEntropyPanel metrics={d.riskMetrics} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <NeuralDiagnostics history={signal.history} />
                <SentimentDeepDive ticker={ticker} news={d.news} sentiment={signal.sentiment} globalTrigger={isNeuralEngaged} />
              </div>

              <section className="space-y-6">
                <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Company Overview</h3>
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

              {simulation && <MonteCarloSimulation simulation={simulation} />}
              
              <DataSection title="Liquidity & Float Dynamics" icon={<OwnershipIcon />}>
                <DataRow label="Shares Outstanding" value={fmtCount(d.keyStats.sharesOutstanding)} />
                <DataRow label="Public Float" value={fmtCount(d.keyStats.floatShares)} />
                <DataRow label="Shares Short" value={fmtCount(d.keyStats.sharesShort)} />
                <DataRow label="Short Ratio (Days to Cover)" value={fmtRatio(d.keyStats.shortRatio)} />
                <DataRow label="Short % of Float" value={fmtPct(d.keyStats.shortPercentOfFloat)} colored />
              </DataSection>

              {d.optionsFlow && (
                <DataSection title="Derivatives & Options Flow" icon={<StatsIcon />}>
                  <DataRow label="Nearest Expiration" value={d.optionsFlow.nearestExpiration || '—'} />
                  <DataRow label="Calls Vol / OI" value={`${fmtCount(d.optionsFlow.callsVolume)} / ${fmtCount(d.optionsFlow.callsOpenInterest)}`} colored />
                  <DataRow label="Puts Vol / OI" value={`${fmtCount(d.optionsFlow.putsVolume)} / ${fmtCount(d.optionsFlow.putsOpenInterest)}`} />
                  <DataRow label="Avg Implied Volatility" value={fmtPct(d.optionsFlow.impliedVolatility)} />
                </DataSection>
              )}

              <DataSection title="Valuation & Multiples" icon={<ValuationIcon />}>
                <DataRow label="P/E (Trailing)" value={fmtRatio(d.valuation.trailingPE)} />
                <DataRow label="P/E (Forward)" value={fmtRatio(d.valuation.forwardPE)} />
                <DataRow label="PEG Ratio" value={fmtRatio(d.valuation.pegRatio)} />
                <DataRow label="Price to Book (P/B)" value={fmtRatio(d.valuation.priceToBook)} />
                <DataRow label="Price to Sales (P/S)" value={fmtRatio(d.valuation.priceToSales)} />
              </DataSection>

              <DataSection title="Financial Health & Yield" icon={<HealthIcon />}>
                <DataRow label="Debt / Equity" value={fmtRatio(d.financialHealth.debtToEquity)} />
                <DataRow label="Free Cash Flow" value={fmtBigNum(d.financialHealth.freeCashflow)} />
                <DataRow label="Dividend Yield" value={fmtPct(d.dividends.dividendYield)} highlight />
                <DataRow label="Payout Ratio" value={fmtPct(d.dividends.payoutRatio)} />
                <DataRow label="Last EPS Surprise" value={d.quarterlyReports.length > 0 && d.quarterlyReports[d.quarterlyReports.length - 1].epsSurprisePercent !== null ? fmtPct(d.quarterlyReports[d.quarterlyReports.length - 1].epsSurprisePercent) : '—'} colored />
              </DataSection>

              <DataSection title="Summary Statistics" icon={<StatsIcon />}>
                <DataRow label="EPS (Trailing)" value={`$${d.keyStats.trailingEps?.toFixed(2) || 'N/A'}`} />
                <DataRow label="EPS (Forward)" value={`$${d.keyStats.forwardEps?.toFixed(2) || 'N/A'}`} />
                <DataRow label="Yearly Momentum" value={fmtPct(p.fiftyTwoWeekChangePercent)} colored />
              </DataSection>

              <ContextEngine details={d} sentiment={signal.sentiment} />
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
