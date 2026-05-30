"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MonteCarloResult } from "@/lib/monte-carlo";
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
import { DCFSandbox } from "@/components/organisms/DCFSandbox";
import { MultiModelValuation } from "@/components/organisms/MultiModelValuation";
import { MonteCarloSimulation } from "@/components/organisms/MonteCarloSimulation";
import { TechnicalConfluencePanel } from "@/components/organisms/TechnicalConfluencePanel";
import { AlgorithmicTargetsPanel } from "@/components/organisms/AlgorithmicTargetsPanel";
import { InstitutionalFlowPanel } from "@/components/organisms/InstitutionalFlowPanel";
import { AIForecastPanel } from "@/components/organisms/AIForecastPanel";
import { useAlpacaTape } from "@/hooks/useAlpacaTape";
import { useStreamingPrediction } from "@/hooks/useStreamingPrediction";
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
import { AIEarningsLab } from "@/components/organisms/AIEarningsLab";
// Removed ExecutionPlanner in favor of sidebar integration
import { OptionsSurfaceVisualizer } from "@/components/organisms/OptionsSurfaceVisualizer";
import { calculateBlockholderIntelligence } from "@/lib/blockholder-analytics";
import { BlockholderAnalyticsPanel } from "@/components/organisms/BlockholderAnalyticsPanel";

import { OptionsIntelligence } from '@/lib/options-pricing';
import { MacroSnapshot } from '@/lib/macro-analysis';
import { MacroOverlay } from '@/components/organisms/MacroOverlay';
import { MultiHorizonPrediction } from '@/lib/inference';

const TABS = ['TRADING TERMINAL', 'INVESTMENT STUDY', 'MACRO ENVIRONMENT', 'FORENSICS & NEWS'] as const;
type TabType = typeof TABS[number];

export function AssetDashboard({ ticker, signal, macroSnapshot }: { ticker: string, signal: MarketSignal & { prediction: PredictionResult; multiHorizonPrediction?: MultiHorizonPrediction; stockDetails: StockDetails; optionsIntelligence?: OptionsIntelligence | null }, macroSnapshot: MacroSnapshot }) {
  const [activeTab, setActiveTab] = useState<TabType>('TRADING TERMINAL');
  const [isNeuralEngaged, setIsNeuralEngaged] = useState(true);
  const d = signal.stockDetails;
  const p = d.price;

  const { lastTick } = useAlpacaTape(ticker);

  // ── Streaming Prediction Engine ──────────────────────────────────────────
  // Wires the live Alpaca tick stream into the 4H forecast. Every 60s during
  // market hours, the hook aggregates ticks into 1-min bars and reruns the
  // local precision forecast engine for a fresher 4H prediction.
  const realizedVol = signal.history.length > 30
    ? Math.sqrt(
        signal.history.slice(-60).reduce((acc, h, i, arr) => {
          if (i === 0) return acc;
          const ret = Math.log(h.close / arr[i - 1].close);
          return acc + ret * ret;
        }, 0) / 59
      ) * Math.sqrt(252)
    : 0.2;

  const { prediction4H: streamPrediction4H, isLive: isPredictionLive } = useStreamingPrediction({
    ticker,
    historicalBars: signal.history,
    realizedVol,
    sentiment: signal.sentiment,
    beta: signal.benchmark?.beta ?? 1.0,
    basePrediction: signal.multiHorizonPrediction?.["4H"] ?? null,
    enabled: !signal.stockDetails.isCrypto,
  });

  // Build merged multiHorizonPrediction: swap in live 4H when available
  const mergedMultiHorizon = signal.multiHorizonPrediction
    ? {
        ...signal.multiHorizonPrediction,
        ...(streamPrediction4H && isPredictionLive ? { "4H": streamPrediction4H } : {}),
      }
    : signal.multiHorizonPrediction;

  const [simulation, setSimulation] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    if (signal.history.length === 0 || p.current <= 0) return;

    // Spawn Next.js bundled Web Worker
    const worker = new Worker(new URL("./monte-carlo.worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.success) {
        setSimulation(e.data.result);
      } else {
        console.error("[Monte Carlo Worker Error]:", e.data.error);
      }
    };

    worker.postMessage({
      currentPrice: p.current,
      historicalPrices: signal.history.map(h => h.close),
      daysToSimulate: 30,
      simulations: 5000
    });

    return () => {
      worker.terminate();
    };
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
        {/* Live streaming badge */}
        {isPredictionLive && (
          <div className="flex items-center gap-2 px-5 pt-4 pb-0">
            <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-matrix">
              4H Prediction: Live Streaming
            </span>
          </div>
        )}
        <VectorChart 
          data={signal.history} 
          prediction={signal.prediction} 
          multiHorizonPrediction={mergedMultiHorizon}
          stochasticPaths={simulation?.isValid ? simulation.paths : []}
          ticker={ticker} 
          color={signal.trend === "BULLISH" ? "#22c55e" : "#ef4444"} 
          height={520} 
          lastTick={lastTick ? { price: lastTick.price, time: Math.floor(new Date(lastTick.timestamp).getTime() / 1000) } : null}
          optionsIntelligence={signal.optionsIntelligence}
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
        <MetricCard label="Volume" value={fmtCount(p.volume)} subValue={`Avg: ${fmtCount(p.averageVolume)}`} tooltipKey="TRADING_VOLUME" tooltipCategory="FUNDAMENTAL" />
        <MetricCard label="Day High" value={fmt(p.dayHigh)} />
        <MetricCard label="Day Low" value={fmt(p.dayLow)} />
        <MetricCard label="Market Cap" value={fmtBigNum(p.marketCap)} tooltipKey="MARKET_CAP" tooltipCategory="FUNDAMENTAL" />
        <MetricCard label="Ex-Ante Beta" value={fmtRatio(d.keyStats.beta)} tooltipKey="REGIME_BETA" tooltipCategory="QUANT" />
      </div>

      {/* 52-Week Range Spectrum Relocated and Styled */}
      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-6">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">52-Week Range Spectrum</h3>
        <FiftyTwoWeekBar low={p.fiftyTwoWeekLow} high={p.fiftyTwoWeekHigh} current={p.current} />
      </div>

      {/* TABS BUTTON BAR */}
      <div className="flex items-center border-b border-white/5 w-full mb-8 overflow-x-auto scrollbar-hide p-1 gap-6">
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`py-3 text-[10px] font-bold tracking-wider transition-all uppercase whitespace-nowrap relative ${
              activeTab === tab 
                ? 'text-matrix font-extrabold' 
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-matrix rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            )}
          </button>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === 'TRADING TERMINAL' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <ConfluenceEngine 
                details={d} 
                tech={signal.tech} 
                sentiment={signal.sentiment} 
                ticker={ticker} 
                synthesis={signal.synthesis} 
              />
              <TechnicalConfluencePanel tech={signal.tech} />
              <AlgorithmicTargetsPanel tech={signal.tech} />
              <InstitutionalFlowPanel tech={signal.tech} optionsFlow={d.optionsFlow} currentPrice={p.current} />
              <NeuralAnomalyReport history={signal.history} technicals={signal.tech} insight={insight} />
              <NeuralDiagnostics history={signal.history} />
            </div>

            <div className="lg:col-span-4 space-y-10">
              {!d.isCrypto && (
                <BlockholderAnalyticsPanel 
                  intelligence={calculateBlockholderIntelligence(d)} 
                  heldPercentInsiders={d.keyStats.heldPercentInsiders} 
                  heldPercentInstitutions={d.keyStats.heldPercentInstitutions} 
                />
              )}
              {signal.optionsIntelligence && signal.optionsIntelligence.isValid && (
                <OptionsSurfaceVisualizer data={signal.optionsIntelligence} />
              )}
              <SentimentDeepDive ticker={ticker} news={d.news} sentiment={signal.sentiment} divergence={signal.synthesis.sentimentPriceDivergence} globalTrigger={isNeuralEngaged} />
            </div>
          </>
        )}

        {activeTab === 'INVESTMENT STUDY' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <FundamentalIntelligence 
                profitability={d.profitability}
                health={d.financialHealth}
                valuation={d.valuation}
                peer={d.peerBenchmark}
              />
              
              {!d.isETF && (
                <>
                  <DCFSandbox details={d} currentPrice={d.price.current} />
                  <MultiModelValuation details={d} />
                </>
              )}
              
              <AIEarningsLab details={d} globalTrigger={isNeuralEngaged} />

              {d.quarterlyReports.length > 0 && (
                <DataSection title="Historical Quarters" icon={<EarningsIcon />}>
                  <InteractiveEarnings reports={d.quarterlyReports} currency={d.profile.currency} />
                </DataSection>
              )}
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
              <ContextEngine details={d} sentiment={signal.sentiment} divergence={signal.synthesis.sentimentPriceDivergence} />

              <DataSection title="Valuation & Multiples" icon={<ValuationIcon />}>
                <DataRow label="P/E (Trailing)" value={fmtRatio(d.valuation.trailingPE)} insightKey="PE_RATIO" category="FUNDAMENTAL" />
                <DataRow label="P/E (Forward)" value={fmtRatio(d.valuation.forwardPE)} insightKey="PE_RATIO" category="FUNDAMENTAL" />
                <DataRow label="PEG Ratio" value={fmtRatio(d.valuation.pegRatio)} insightKey="PE_RATIO" category="FUNDAMENTAL" />
                <DataRow label="Price to Book (P/B)" value={fmtRatio(d.valuation.priceToBook)} insightKey="PE_RATIO" category="FUNDAMENTAL" />
                <DataRow label="Price to Sales (P/S)" value={fmtRatio(d.valuation.priceToSales)} insightKey="PE_RATIO" category="FUNDAMENTAL" />
              </DataSection>

              <DataSection title="Financial Health & Yield" icon={<HealthIcon />}>
                <DataRow label="Debt / Equity" value={fmtRatio(d.financialHealth.debtToEquity)} insightKey="DEBT_EQUITY" category="FUNDAMENTAL" />
                <DataRow label="Free Cash Flow" value={fmtBigNum(d.financialHealth.freeCashflow)} insightKey="DCF_MODEL" category="FUNDAMENTAL" />
                <DataRow label="Dividend Yield" value={fmtPct(d.dividends.dividendYield)} highlight insightKey="DIVIDEND_YIELD" category="FUNDAMENTAL" />
                <DataRow label="Payout Ratio" value={fmtPct(d.dividends.payoutRatio)} insightKey="DIVIDEND_YIELD" category="FUNDAMENTAL" />
                <DataRow label="Last EPS Surprise" value={d.quarterlyReports.length > 0 && d.quarterlyReports[d.quarterlyReports.length - 1].epsSurprisePercent !== null ? fmtPct(d.quarterlyReports[d.quarterlyReports.length - 1].epsSurprisePercent) : '—'} colored />
              </DataSection>
            </div>
          </>
        )}

        {activeTab === 'MACRO ENVIRONMENT' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-1.5 h-6 bg-white shadow-none" />
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-300">Macro Framework</h2>
                </div>
                <MacroOverlay snapshot={macroSnapshot} />
              </section>
              <RiskEntropyPanel metrics={d.riskMetrics} />
              <AIIntelligencePanel ticker={ticker} prediction={signal.prediction!} regime={signal.regime} sentiment={signal.sentiment} history={signal.history} />
            </div>

            <div className="lg:col-span-4 space-y-10">
              {simulation && <MonteCarloSimulation simulation={simulation} />}

              {d.analyst.numberOfAnalysts > 0 && (
                <DataSection title="Consensus" icon={<AnalystIcon />}>
                  <AnalystRecommendation rec={d.analyst.recommendationKey} mean={d.analyst.recommendationMean} count={d.analyst.numberOfAnalysts} />
                  <div className="mt-8"><TargetUpside current={p.current} target={d.analyst.targetMean!} /></div>
                </DataSection>
              )}
            </div>
          </>
        )}

        {activeTab === 'FORENSICS & NEWS' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-1 h-3.5 bg-white shadow-none" />
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-300">AI Forecast & Projection Model</h2>
              </div>
              <AIForecastPanel 
                ticker={ticker} 
                history={signal.history} 
                news={d.news} 
                insight={insight}
                isExtracting={isExtracting}
                error={error}
                onExtract={handleExtraction}
                globalTrigger={isNeuralEngaged} 
              />

              <section className="space-y-6">
                <h3 className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Company Overview</h3>
                <p className="text-[14px] text-zinc-400 leading-relaxed font-normal border-l-2 border-white/5 pl-6">{d.profile.description}</p>
              </section>

              <div className="p-6 bg-white/[0.01] rounded-xl border border-white/5 h-full">
                <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-6">
                  Latest News
                </h2>
                <NewsFeed articles={d.news} />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              {!d.isETF && d.insiderTransactions.length > 0 && (
                <InsiderFeed transactions={d.insiderTransactions} />
              )}

              <DataSection title="Liquidity & Float Dynamics" icon={<OwnershipIcon />}>
                <DataRow label="Shares Outstanding" value={fmtCount(d.keyStats.sharesOutstanding)} insightKey="LIQUIDITY" category="FUNDAMENTAL" />
                <DataRow label="Public Float" value={fmtCount(d.keyStats.floatShares)} insightKey="LIQUIDITY" category="FUNDAMENTAL" />
                <DataRow label="Shares Short" value={fmtCount(d.keyStats.sharesShort)} insightKey="VALUE_AT_RISK" category="QUANT" />
                <DataRow label="Short Ratio (Days to Cover)" value={fmtRatio(d.keyStats.shortRatio)} insightKey="VALUE_AT_RISK" category="QUANT" />
                <DataRow label="Short % of Float" value={fmtPct(d.keyStats.shortPercentOfFloat)} colored insightKey="VALUE_AT_RISK" category="QUANT" />
              </DataSection>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
