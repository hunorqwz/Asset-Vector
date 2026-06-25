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
import { ValuationIcon, AnalystIcon, HealthIcon, OwnershipIcon, EarningsIcon, StatsIcon } from "@/components/Icons";
import { DataSection } from "@/components/organisms/DataSection";
import { DataRow } from "@/components/molecules/DataRow";
import { MetricCard } from "@/components/molecules/MetricCard";
import { AnalystRecommendation } from "@/components/organisms/AnalystRecommendation";
import { TargetUpside } from "@/components/molecules/TargetUpside";
import { FiftyTwoWeekBar } from "@/components/molecules/FiftyTwoWeekBar";
import { AIIntelligencePanel } from "@/components/organisms/AIIntelligencePanel";
import { DCFSandbox } from "@/components/organisms/DCFSandbox";
import { MultiModelValuation } from "@/components/organisms/MultiModelValuation";
import { CorporateQualityPanel } from "@/components/organisms/CorporateQualityPanel";
import { WaccCalculator } from "@/components/organisms/WaccCalculator";
import { MonteCarloSimulation } from "@/components/organisms/MonteCarloSimulation";
import { TechnicalConfluencePanel } from "@/components/organisms/TechnicalConfluencePanel";
import { AlgorithmicTargetsPanel } from "@/components/organisms/AlgorithmicTargetsPanel";
import { InstitutionalFlowPanel } from "@/components/organisms/InstitutionalFlowPanel";
import { AIForecastPanel } from "@/components/organisms/AIForecastPanel";
import { useAlpacaTape } from "@/hooks/useAlpacaTape";
import { useStreamingPrediction } from "@/hooks/useStreamingPrediction";
import { LivePriceCard } from "@/components/molecules/LivePriceCard";
import { ForensicAnalystReport } from "@/components/organisms/ForensicAnalystReport";
import { RiskEntropyPanel } from "@/components/organisms/RiskEntropyPanel";
import { FundamentalIntelligence } from "@/components/organisms/FundamentalIntelligence";
import { ForensicDiagnostics } from "@/components/organisms/ForensicDiagnostics";
import { SentimentDeepDive } from "@/components/organisms/SentimentDeepDive";
import { PeerBenchmarkIntelligence } from "@/components/organisms/PeerBenchmarkIntelligence";
import { InteractiveEarnings } from "@/components/InteractiveEarnings";
import { generateStrategicAnalysis, StrategicInsight } from "@/app/actions/ai";
import { ConfluenceEngine } from "@/components/organisms/ConfluenceEngine";
import { ContextEngine } from "@/components/organisms/ContextEngine";
import { AIEarningsLab } from "@/components/organisms/AIEarningsLab";
import { OptionsSurfaceVisualizer } from "@/components/organisms/OptionsSurfaceVisualizer";
import { calculateBlockholderIntelligence } from "@/lib/blockholder-analytics";
import { BlockholderAnalyticsPanel } from "@/components/organisms/BlockholderAnalyticsPanel";

import { OptionsIntelligence } from '@/lib/options-pricing';
import { MacroSnapshot } from '@/lib/macro-analysis';
import { MacroOverlay } from '@/components/organisms/MacroOverlay';
import { MultiHorizonPrediction } from '@/lib/inference';

const TABS = ['CHARTS & TECHNICALS', 'QUANTITATIVE RISK', 'VALUATION & FUNDAMENTALS', 'CONTEXT & NARRATIVES'] as const;
type TabType = typeof TABS[number];

function SubscoreCard({ label, value, status, weight, color }: { label: string; value: string; status: string; weight: string; color: string }) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-lg flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
          <span className="text-[8px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded font-black">{weight}</span>
        </div>
        <span className={`text-[12px] font-mono font-bold uppercase tracking-wider block ${color}`}>
          {status}
        </span>
      </div>
      <div className="text-[14px] font-mono font-black text-white mt-2">
        {value}
      </div>
    </div>
  );
}

export function AssetDashboard({ ticker, signal, macroSnapshot }: { ticker: string, signal: MarketSignal & { prediction?: PredictionResult; multiHorizonPrediction?: MultiHorizonPrediction; stockDetails: StockDetails; optionsIntelligence?: OptionsIntelligence | null }, macroSnapshot: MacroSnapshot }) {
  const [activeTab, setActiveTab] = useState<TabType>('CHARTS & TECHNICALS');

  // Keyboard shortcut tab-switching (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"))
      ) {
        return;
      }

      if (e.key === "1") {
        setActiveTab("CHARTS & TECHNICALS");
      } else if (e.key === "2") {
        setActiveTab("QUANTITATIVE RISK");
      } else if (e.key === "3") {
        setActiveTab("VALUATION & FUNDAMENTALS");
      } else if (e.key === "4") {
        setActiveTab("CONTEXT & NARRATIVES");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [isForensicEngaged, setIsForensicEngaged] = useState(true);
  const d = signal.stockDetails;
  const p = d.price;

  const { lastTick } = useAlpacaTape(ticker);

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

  const mergedMultiHorizon = signal.multiHorizonPrediction
    ? {
        ...signal.multiHorizonPrediction,
        ...(streamPrediction4H && isPredictionLive ? { "4H": streamPrediction4H } : {}),
      }
    : signal.multiHorizonPrediction;

  const [simulation, setSimulation] = useState<MonteCarloResult | null>(null);

  // Decoupled Monte Carlo trigger (Only runs on ticker/history change to prevent thrasher)
  useEffect(() => {
    if (signal.history.length === 0 || p.current <= 0) return;

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
  }, [ticker, signal.history]); // Removed p.current dependency to avoid ticks restarting thread

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
    if (isForensicEngaged && !insight && !isExtracting && !error) {
      handleExtraction();
    }
  }, [isForensicEngaged, insight, isExtracting, error]);

  const educationContext = useMemo(() => ({
    ticker,
    currentPrice: p.current,
    history: signal.history.map(h => h.close),
    realizedVolatility: realizedVol,
    beta: d.keyStats.beta ?? 1.0,
    dcfGrowth: d.profitability.revenueGrowth ?? 0.08,
    dcfDiscount: 0.10,
    dcfBaseCf: d.financialHealth.freeCashflow ?? 1000
  }), [ticker, p.current, signal.history, realizedVol, d.keyStats.beta, d.profitability.revenueGrowth, d.financialHealth.freeCashflow]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* ── SECTION 1: EXECUTIVE CONVICTION BREAKDOWN ── */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#0a0a0c] border border-white/5 p-6 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transform rotate-12 scale-150">
          <StatsIcon />
        </div>
        
        {/* Synthesis Label & Score */}
        <div className="md:col-span-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 pr-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Synthesis Conviction</span>
            <span className={`text-2xl font-display font-black tracking-tightest leading-none block ${
              signal.synthesis.signal.includes('BUY') ? 'text-bull' : 
              signal.synthesis.signal.includes('SELL') ? 'text-bear' : 
              'text-zinc-500'
            }`}>
              {signal.synthesis.signal}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-mono font-black text-white">{signal.synthesis.score}</span>
            <span className="text-xs font-mono text-zinc-500">/100</span>
          </div>
        </div>

        {/* Contributions breakdown */}
        <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SubscoreCard 
            label="Technicals" 
            value={`${signal.tech.confluenceScore}/100`} 
            status={signal.tech.confluenceScore >= 60 ? "BULLISH" : signal.tech.confluenceScore <= 40 ? "BEARISH" : "NEUTRAL"}
            weight="30%"
            color={signal.tech.confluenceScore >= 60 ? "text-bull" : signal.tech.confluenceScore <= 40 ? "text-bear" : "text-zinc-500"}
          />
          <SubscoreCard 
            label="Sentiment Index" 
            value={`${((signal.sentiment.score + 1) * 50).toFixed(0)}/100`} 
            status={signal.sentiment.score > 0.2 ? "POSITIVE" : signal.sentiment.score < -0.2 ? "NEGATIVE" : "NEUTRAL"}
            weight="20%"
            color={signal.sentiment.score > 0.2 ? "text-bull" : signal.sentiment.score < -0.2 ? "text-bear" : "text-zinc-500"}
          />
          <SubscoreCard 
            label="Fund. Quality" 
            value={signal.quality?.score ? `${signal.quality.score}/100` : "N/A"} 
            status={signal.quality?.level || "NOMINAL"}
            weight="25%"
            color={signal.quality?.score && signal.quality.score > 75 ? "text-bull" : "text-zinc-500"}
          />
          <SubscoreCard 
            label="Predictability (Hurst)" 
            value={signal.predictability.toFixed(3)} 
            status={signal.predictability > 0.5 ? "TRENDING" : "MEAN REVERT"}
            weight="25%"
            color={signal.predictability > 0.5 ? "text-bull" : "text-zinc-500"}
          />
        </div>
      </section>

      {/* METRICS ROW - ATOMIC DATA BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-white/[0.005] p-1 border border-white/5 rounded-xl">
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

      {/* TABS BUTTON BAR */}
      <div className="flex items-center border-b border-white/5 w-full overflow-x-auto scrollbar-hide p-1 gap-6">
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
        
        {/* TABS CONTENT: CHARTS & TECHNICALS */}
        {activeTab === 'CHARTS & TECHNICALS' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <section className="glass-card overflow-hidden relative">
                {isPredictionLive && (
                  <div className="flex items-center gap-2 px-3 py-1.5 absolute top-4 left-4 z-20 bg-black/80 border border-white/10 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-matrix leading-none">
                      4H Prediction: Live
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

              <ConfluenceEngine 
                details={d} 
                tech={signal.tech} 
                sentiment={signal.sentiment} 
                ticker={ticker} 
                synthesis={signal.synthesis} 
              />
              <TechnicalConfluencePanel tech={signal.tech} />
              <AlgorithmicTargetsPanel tech={signal.tech} />
            </div>

            <div className="lg:col-span-4 space-y-10">
              <InstitutionalFlowPanel 
                tech={signal.tech} 
                optionsFlow={d.optionsFlow} 
                currentPrice={p.current} 
                optionsIntelligence={signal.optionsIntelligence}
              />
              
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-6">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">52-Week Range Spectrum</h3>
                <FiftyTwoWeekBar low={p.fiftyTwoWeekLow} high={p.fiftyTwoWeekHigh} current={p.current} />
              </div>
            </div>
          </>
        )}

        {/* TABS CONTENT: QUANTITATIVE RISK */}
        {activeTab === 'QUANTITATIVE RISK' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <RiskEntropyPanel metrics={d.riskMetrics} />
              {simulation && <MonteCarloSimulation simulation={simulation} />}
              <AIIntelligencePanel ticker={ticker} prediction={signal.prediction!} regime={signal.regime} sentiment={signal.sentiment} history={signal.history} />
            </div>

            <div className="lg:col-span-4 space-y-10">
              {signal.optionsIntelligence && signal.optionsIntelligence.isValid && (
                <OptionsSurfaceVisualizer data={signal.optionsIntelligence} />
              )}
              {d.analyst.numberOfAnalysts > 0 && (
                <DataSection title="Consensus" icon={<AnalystIcon />}>
                  <AnalystRecommendation rec={d.analyst.recommendationKey} mean={d.analyst.recommendationMean} count={d.analyst.numberOfAnalysts} />
                  <div className="mt-8"><TargetUpside current={p.current} target={d.analyst.targetMean!} /></div>
                </DataSection>
              )}
            </div>
          </>
        )}

        {/* TABS CONTENT: VALUATION & FUNDAMENTALS */}
        {activeTab === 'VALUATION & FUNDAMENTALS' && (
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
                  <CorporateQualityPanel details={d} />
                  <WaccCalculator details={d} />
                </>
              )}
              
              <AIEarningsLab details={d} globalTrigger={isForensicEngaged} />

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
              </DataSection>

              {/* LIQUIDITY & FLOAT DYNAMICS (Relocated here out of Forensics) */}
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

        {/* TABS CONTENT: CONTEXT & NARRATIVES */}
        {activeTab === 'CONTEXT & NARRATIVES' && (
          <>
            <div className="lg:col-span-8 space-y-12">
              <ForensicAnalystReport 
                ticker={ticker} 
                history={signal.history} 
                technicals={signal.tech} 
                forensicAlerts={signal.forensicAlerts} 
                educationContext={educationContext}
              />

              <ForensicDiagnostics history={signal.history} />

              <AIForecastPanel 
                ticker={ticker} 
                history={signal.history} 
                news={d.news} 
                insight={insight}
                isExtracting={isExtracting}
                error={error}
                onExtract={handleExtraction}
                globalTrigger={isForensicEngaged} 
              />

              <div className="p-6 bg-white/[0.01] rounded-xl border border-white/5">
                <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-6">
                  Latest News
                </h2>
                <NewsFeed articles={d.news} />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <SentimentDeepDive ticker={ticker} news={d.news} sentiment={signal.sentiment} divergence={signal.synthesis.sentimentPriceDivergence} globalTrigger={isForensicEngaged} />
              
              <MacroOverlay snapshot={macroSnapshot} />
              
              <ContextEngine details={d} sentiment={signal.sentiment} divergence={signal.synthesis.sentimentPriceDivergence} />

              {!d.isETF && d.insiderTransactions.length > 0 && (
                <InsiderFeed transactions={d.insiderTransactions} />
              )}
              
              <section className="space-y-6">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Company Overview</h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed font-normal border-l-2 border-white/5 pl-6">{d.profile.description}</p>
              </section>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
