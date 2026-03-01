import React, { useMemo } from 'react';
import { StockDetails } from "@/lib/stock-details";
import { TechnicalIndicators } from "@/lib/technical-analysis";
import { SentimentReport } from "@/lib/sentiment";
import { calculateGrahamNumber, calculatePeterLynchFairValue } from "@/lib/valuation";
import { StatsIcon } from "@/components/Icons";

interface ConfluenceEngineProps {
  details: StockDetails;
  tech: TechnicalIndicators;
  sentiment: SentimentReport;
  ticker: string;
}

export function ConfluenceEngine({ details, tech, sentiment, ticker }: ConfluenceEngineProps) {
  // 1. Fundamental State
  const eps = details.keyStats.trailingEps;
  const bvps = details.valuation.bookValue;
  const growthRate = details.profitability?.revenueGrowth || details.profitability?.earningsGrowth || 0;
  const price = details.price.current;

  const fundamentalState = useMemo(() => {
    let undervaluedVotes = 0;
    let validModels = 0;

    const graham = calculateGrahamNumber(eps, bvps);
    if (graham.isValid) { validModels++; if (graham.value > price) undervaluedVotes++; }

    const lynch = calculatePeterLynchFairValue(eps, growthRate);
    if (lynch.isValid) { validModels++; if (lynch.value > price) undervaluedVotes++; }

    // Fallback if models are invalid
    if (validModels === 0) {
      if (details.valuation.forwardPE && details.valuation.forwardPE < 20) return "UNDERVALUED";
      if (details.valuation.forwardPE && details.valuation.forwardPE > 30) return "OVERVALUED";
      return "FAIR VALUE";
    }

    if (undervaluedVotes === validModels && validModels > 0) return "UNDERVALUED";
    if (undervaluedVotes === 0) return "OVERVALUED";
    return "FAIR VALUE";
  }, [eps, bvps, growthRate, price, details.valuation.forwardPE]);

  // 2. Technical State
  const technicalState = useMemo(() => {
    const isMacdBullish = tech.macd.histogram > 0;
    const rsi = tech.rsi14;

    let score = 0;
    if (isMacdBullish) score += 2; else score -= 2;
    if (rsi < 40) score += 2; // Oversold = Bullish bias for reversion
    if (rsi > 60) score -= 2; // Overbought = Bearish bias
    
    if (tech.signal === 'BUY' || tech.signal === 'STRONG BUY') score += 3;
    if (tech.signal === 'SELL' || tech.signal === 'STRONG SELL') score -= 3;

    if (score >= 3) return "BULLISH TREND";
    if (score <= -3) return "BEARISH TREND";
    return "SIDEWAYS";
  }, [tech]);

  // 3. Contextual State
  const contextualState = useMemo(() => {
    const s = sentiment.score;
    if (s > 0.2) return "POSITIVE";
    if (s < -0.2) return "NEGATIVE";
    return "NEUTRAL";
  }, [sentiment]);

  // The Synthesis
  const analysis = useMemo(() => {
    const isBullAligned = fundamentalState === "UNDERVALUED" && technicalState === "BULLISH TREND" && contextualState !== "NEGATIVE";
    const isBearAligned = fundamentalState === "OVERVALUED" && technicalState === "BEARISH TREND" && contextualState !== "POSITIVE";
    
    if (isBullAligned) return { label: "HIGH-CONVICTION VECTOR (BULL)", color: "text-bull border-bull/30 bg-bull/5", iconColor: "text-bull", desc: "Fundamental discount combined with bullish momentum and supportive sentiment." };
    if (isBearAligned) return { label: "HIGH-CONVICTION VECTOR (BEAR)", color: "text-bear border-bear/30 bg-bear/5", iconColor: "text-bear", desc: "Fundamental premium combined with bearish flow and negative/neutral sentiment." };
    
    const isDivergent = 
      (fundamentalState === "UNDERVALUED" && technicalState === "BEARISH TREND") ||
      (fundamentalState === "OVERVALUED" && technicalState === "BULLISH TREND");
      
    if (isDivergent) return { label: "DIVERGENCE DETECTED", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5", iconColor: "text-yellow-500", desc: "Price action contradicts fundamental value. Wait for technical confirmation." };

    return { label: "HIGH NOISE / INDECISION", color: "text-white/60 border-white/10 bg-white/5", iconColor: "text-white/60", desc: "Conflicting signals across layers. Low probability environment." };
  }, [fundamentalState, technicalState, contextualState]);

  return (
    <section className={`p-6 border transition-all ${analysis.color} relative overflow-hidden bg-[#050505]`}>
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <StatsIcon />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-current shadow-[0_0_10px_currentColor] opacity-50" />
          <h2 className="text-[13px] font-bold uppercase tracking-[0.2em] text-white">Confluence Matrix</h2>
        </div>
        <div className={`text-[11px] font-bold font-mono px-3 py-1.5 border border-current opacity-90 uppercase tracking-widest flex items-center gap-2 ${analysis.iconColor}`}>
           <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
           {analysis.label}
        </div>
      </div>

      <p className="text-[12px] text-zinc-300 leading-relaxed font-medium mb-8 max-w-2xl relative z-10">{analysis.desc}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/5 relative z-10">
         <div className="p-5 bg-black/60 border-b md:border-b-0 md:border-r border-white/5">
            <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Fundamental Stratum</span>
            <span className={`text-[14px] font-bold font-mono uppercase tracking-widest ${fundamentalState === 'UNDERVALUED' ? 'text-bull' : fundamentalState === 'OVERVALUED' ? 'text-bear' : 'text-zinc-400'}`}>{fundamentalState}</span>
         </div>
         <div className="p-5 bg-black/60 border-b md:border-b-0 md:border-r border-white/5">
            <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Technical Telemetry</span>
            <span className={`text-[14px] font-bold font-mono uppercase tracking-widest ${technicalState === 'BULLISH TREND' ? 'text-bull' : technicalState === 'BEARISH TREND' ? 'text-bear' : 'text-zinc-400'}`}>{technicalState}</span>
         </div>
         <div className="p-5 bg-black/60">
            <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Sentiment Vector</span>
            <span className={`text-[14px] font-bold font-mono uppercase tracking-widest ${contextualState === 'POSITIVE' ? 'text-bull' : contextualState === 'NEGATIVE' ? 'text-bear' : 'text-zinc-400'}`}>{contextualState}</span>
         </div>
      </div>
    </section>
  );
}
