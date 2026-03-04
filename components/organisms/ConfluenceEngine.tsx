import React, { useMemo } from 'react';
import { StockDetails } from "@/lib/stock-details";
import { TechnicalIndicators } from "@/lib/technical-analysis";
import { SentimentReport } from "@/lib/sentiment";
import { calculateGrahamNumber, calculatePeterLynchFairValue } from "@/lib/valuation";
import { MarketSynthesis } from "@/lib/synthesis";
import { StatsIcon } from "@/components/Icons";

interface ConfluenceEngineProps {
  details: StockDetails;
  tech: TechnicalIndicators;
  sentiment: SentimentReport;
  ticker: string;
  synthesis: MarketSynthesis;
}

export function ConfluenceEngine({ details, tech, sentiment, ticker, synthesis }: ConfluenceEngineProps) {
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

  // 2. Technical State (Hurst-Adaptive & Confluence-Aware)
  const technicalState = useMemo(() => {
    const score = tech.confluenceScore;
    
    if (score >= 60) return "BULLISH TREND";
    if (score <= 40) return "BEARISH TREND";
    return "SIDEWAYS";
  }, [tech.confluenceScore]);

  // 3. Contextual State
  const contextualState = useMemo(() => {
    const s = sentiment.score;
    if (s > 0.2) return "POSITIVE";
    if (s < -0.2) return "NEGATIVE";
    return "NEUTRAL";
  }, [sentiment]);

  // The Final Synthesis (Institutional Recommendation)
  const analysis = useMemo(() => {
    const score = synthesis.score;
    const signal = synthesis.signal;
    
    let color = "text-white/60 border-white/10 bg-white/5";
    let iconColor = "text-white/60";
    
    if (signal.includes('BUY') || signal === 'ACCUMULATE') {
      color = "text-bull border-bull/30 bg-bull/5";
      iconColor = "text-bull";
    } else if (signal.includes('SELL') || signal === 'REDUCE') {
      color = "text-bear border-bear/30 bg-bear/5";
      iconColor = "text-bear";
    }

    return { 
      label: `${signal} (${score} INDEX)`, 
      signal,
      color, 
      iconColor, 
      desc: synthesis.primaryDriver 
    };
  }, [synthesis]);

  return (
    <section 
      className={`p-6 border transition-all duration-700 ${analysis.color} relative overflow-hidden bg-[#030303] rounded-xl`}
      style={{ boxShadow: analysis.signal.includes('BUY') ? 'inset 0 0 40px rgba(34, 197, 94, 0.03)' : analysis.signal.includes('SELL') ? 'inset 0 0 40px rgba(239, 68, 68, 0.03)' : 'none' }}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transform rotate-12 scale-150">
        <StatsIcon />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-6 bg-current shadow-[0_0_15px_currentColor] transition-all duration-700`} />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white">Institutional Confluence Matrix</h2>
        </div>
        <div className={`text-[10px] font-bold font-mono px-4 py-2 border border-current transition-all duration-700 uppercase tracking-widest flex items-center gap-3 bg-black/40 backdrop-blur-sm`}>
           <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
           {analysis.label}
        </div>
      </div>

      <p className="text-[13px] text-zinc-400 leading-relaxed font-medium mb-10 max-w-3xl relative z-10 border-l border-white/5 pl-6 ml-1 italic">{analysis.desc}</p>
      
      {synthesis.sentimentPriceDivergence && synthesis.sentimentPriceDivergence !== 'NONE' && (
        <div className={`mb-10 p-5 border animate-in fade-in slide-in-from-bottom-2 duration-1000 flex items-center justify-between relative z-10 rounded-lg ${synthesis.sentimentPriceDivergence === 'BULLISH_DIVERGENCE' ? 'bg-bull/10 border-bull/20 text-bull' : 'bg-bear/10 border-bear/20 text-bear'}`}>
           <div className="flex items-center gap-4">
             <div className="w-1 h-8 bg-current shadow-[0_0_12px_currentColor]" />
             <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em]">{synthesis.sentimentPriceDivergence.replace('_', ' ')} DETECTED</h4>
                  <span className="text-[9px] px-1.5 py-0.5 bg-current text-black font-black rounded-sm">CRITICAL</span>
                </div>
                <p className="text-[11px] opacity-80 font-medium tracking-tight">Narrative velocity is decoupling from current price action. High probability of mean reversion.</p>
             </div>
           </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/5 relative z-10 rounded-lg overflow-hidden">
         <div className="p-6 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/[0.02] transition-colors">
            <span className="block text-[9px] uppercase tracking-[0.25em] text-zinc-500 mb-4 font-black">Fundamental Stratum</span>
            <span className={`text-[15px] font-bold font-mono uppercase tracking-widest ${fundamentalState === 'UNDERVALUED' ? 'text-bull' : fundamentalState === 'OVERVALUED' ? 'text-bear' : 'text-zinc-500'}`}>{fundamentalState}</span>
         </div>
         <div className="p-6 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/[0.02] transition-colors">
            <span className="block text-[9px] uppercase tracking-[0.25em] text-zinc-500 mb-4 font-black">Technical Telemetry</span>
            <span className={`text-[15px] font-bold font-mono uppercase tracking-widest ${technicalState === 'BULLISH TREND' ? 'text-bull' : technicalState === 'BEARISH TREND' ? 'text-bear' : 'text-zinc-500'}`}>{technicalState}</span>
         </div>
         <div className="p-6 bg-black/40 hover:bg-white/[0.02] transition-colors">
            <span className="block text-[9px] uppercase tracking-[0.25em] text-zinc-500 mb-4 font-black">Narrative Vector</span>
            <span className={`text-[15px] font-bold font-mono uppercase tracking-widest ${contextualState === 'POSITIVE' ? 'text-bull' : contextualState === 'NEGATIVE' ? 'text-bear' : 'text-zinc-500'}`}>{contextualState}</span>
         </div>
      </div>
    </section>
  );
}
