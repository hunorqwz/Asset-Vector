"use server";
import { getMinimalAssetDetails } from "@/app/actions";
import { MarketSignal, fetchHistoryWithInterval } from "@/lib/market-data";
import { PredictionResult, MultiHorizonPrediction } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { calculateAlphaScore, AlphaScanner } from "@/lib/alpha-engine";
import { recordAlphaPicks } from "./backtest";
import { getPositions } from "./portfolio";
import { calculateReturns, calculateCorrelation } from "@/lib/math";
import { getFromCache, setInCache } from "@/lib/cache";

export interface AlphaPick {
  ticker: string;
  name: string;
  price: number;
  change: number;
  scanner: AlphaScanner;
  reason: string;
  score: number;
  correlationToPortfolio?: number; // 1.0 to -1.0
  beta?: number;
  multiHorizonPrediction?: MultiHorizonPrediction;
  isNarrativeConflicted?: boolean;
  hasFreshOrderBlock?: boolean;
}

const DISCOVERY_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 
  'AVGO', 'COST', 'AMD', 'NFLX', 'QCOM', 'ADBE', 'INTC', 'TXN', 'AMAT',
  'JPM', 'GS', 'MS', 'V', 'MA', 
  'LLY', 'UNH', 'JNJ', 'PFE',
  'XOM', 'CVX', 'TSM', 'ASML',
  'SQ', 'PYPL', 'SHOP', 'SNOW', 'PLTR', 'U' // Added growth names for variety
];

export async function getInstitutionalAlphaPicks(): Promise<AlphaPick[]> {
  const CACHE_KEY = "institutional_alpha_picks_v2";
  const cached = await getFromCache<AlphaPick[]>(CACHE_KEY);
  if (cached) return cached;

  const picks: AlphaPick[] = [];
  
  // 1. Calculate Real Weighted Portfolio Returns for Correlation (Surgical Fix)
  const positions = await getPositions();
  const portfolioTickers = positions.map(p => p.ticker);

  let portfolioReturns: number[] | null = null;
  if (positions.length > 0) {
    try {
      const tickers = positions.map(p => p.ticker);
      const allHistories = await Promise.all(
        tickers.map(t => fetchHistoryWithInterval(t, '1d').catch(() => []))
      );

      // Map histories to tickers for easy lookup
      const historyMap = new Map<string, any[]>(tickers.map((t, i) => [t, allHistories[i]]));
      
      // Use the earliest common date or a 1Y lookback
      const spyHist = await fetchHistoryWithInterval('SPY', '1d');
      const timeMaster = spyHist.map(h => h.time);
      
      const weightedRet: number[] = new Array(timeMaster.length - 1).fill(0);

      positions.forEach(pos => {
        const hist = historyMap.get(pos.ticker) || [];
        const priceMap = new Map<number, number>(hist.map(h => [h.time, h.close]));
        
        for (let i = 1; i < timeMaster.length; i++) {
          const t = timeMaster[i];
          const prevT = timeMaster[i-1];
          const p = priceMap.get(t);
          const prevP = priceMap.get(prevT);
          
          if (p !== undefined && prevP !== undefined && prevP > 0) {
            const r = (p - prevP) / prevP;
            weightedRet[i-1] += r * pos.shares * prevP; // Value-weighted contribution
          }
        }
      });
      portfolioReturns = weightedRet; 
    } catch (err) {
      console.error("[Discovery] Portfolio proxy calculation failed:", err);
      portfolioReturns = null;
    }
  }

  // 2. Throttled Batch Scanner (Institutional Stability)
  const signals: (MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails })[] = [];
  const CHUNK_SIZE = 5;
  
  for (let i = 0; i < DISCOVERY_TICKERS.length; i += CHUNK_SIZE) {
    const chunk = DISCOVERY_TICKERS.slice(i, i + CHUNK_SIZE);
    const batchResults = await Promise.allSettled(
      chunk.map(t => getMinimalAssetDetails(t))
    );
    
    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        signals.push(r.value as any);
      }
    });
    
    // Delay between chunks to respect API rate limits (500ms is much safer than 50ms)
    if (i + CHUNK_SIZE < DISCOVERY_TICKERS.length) {
      await new Promise(res => setTimeout(res, 500));
    }
  }

  signals.forEach(s => {
    // Skip if already in portfolio
    if (portfolioTickers.includes(s.ticker)) return;

    const { score, scanner } = calculateAlphaScore(s, s.stockDetails);
    
    // Horizon Confluence Bonus
    let confluenceMultiplier = 1.0;
    if (s.multiHorizonPrediction) {
      const dirs = Object.values(s.multiHorizonPrediction).map(p => Math.sign(p.p50 - s.price));
      if (dirs.every(d => d === 1) || dirs.every(d => d === -1)) {
        confluenceMultiplier = 1.25; // 25% Bonus for all-horizon agreement
      }
    }

    if (score > 0 && scanner) {
      const finalScore = Math.min(100, Math.round(score * confluenceMultiplier));
      let reason = "";
      if (scanner === 'SURGICAL_ALPHA') reason = "Exceptional convergence of institutional confidence and alpha generation.";
      if (scanner === 'REGIME_FIT') reason = "Perfect structural alignment with the current market volatility regime.";
      if (scanner === 'VOL_SQUEEZE') reason = "Low-noise accumulation phase detected; high probability structural breakout.";
      if (scanner === 'MOMENTUM') reason = "Strong trend persistence with high predictive predictability.";
      if (scanner === 'VALUE') reason = "Institutional quality at a discount with recovering narrative momentum.";
      if (scanner === 'UNCORRELATED') reason = "Idiosyncratic performance outlier with defensive beta profile.";

      // Correlation Check
      let correlation: number | undefined = undefined;
      if (portfolioReturns && s.history.length > 20) {
        try {
          const assetReturns = calculateReturns(s.history.map(h => h.close));
          correlation = calculateCorrelation(assetReturns, portfolioReturns);
        } catch {}
      }

      picks.push({
        ticker: s.ticker,
        name: s.stockDetails.profile.name,
        price: s.stockDetails.price.current,
        change: s.stockDetails.price.dayChangePercent,
        scanner,
        reason,
        score: finalScore,
        correlationToPortfolio: correlation !== undefined ? Number(correlation.toFixed(2)) : undefined,
        beta: s.stockDetails.keyStats.beta || 1.0,
        multiHorizonPrediction: s.multiHorizonPrediction,
        isNarrativeConflicted: s.sentiment.isConflicted,
        hasFreshOrderBlock: s.orderBlocks?.some(ob => !ob.isMitigated)
      });
    }
  });

  // Sort and filter: Prioritize High Score and Uncorrelated (Hedge) picks
  const sortedPicks = picks.sort((a, b) => {
    // If we have correlation, prioritize low correlation for hedging
    if (a.correlationToPortfolio !== undefined && b.correlationToPortfolio !== undefined) {
        const aPref = a.score * (1.5 - a.correlationToPortfolio);
        const bPref = b.score * (1.5 - b.correlationToPortfolio);
        return bPref - aPref;
    }
    return b.score - a.score;
  });

  const finalPicks = sortedPicks.slice(0, 8);
  
  // Cache for 10 minutes (Slightly shorter for dynamic regime changes)
  await setInCache(CACHE_KEY, finalPicks, 10 * 60 * 1000);

  // Archival Loop
  await recordAlphaPicks(finalPicks.map(p => ({ ...p, scanner: p.scanner as any })));

  return finalPicks;
}
