"use server";
import { getMinimalAssetDetails } from "@/app/actions";
import { MarketSignal, fetchHistoryWithInterval } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
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
  
  // 1. Fetch User Portfolio for Correlation Check
  const positions = await getPositions();
  const portfolioTickers = positions.map(p => p.ticker);
  
  // Get historical returns for the portfolio (Top-level approximation)
  let portfolioReturns: number[] | null = null;
  if (portfolioTickers.length > 0) {
    try {
      const topHolding = portfolioTickers[0]; // Proxy for portfolio for speed in discovery
      const topHist = await fetchHistoryWithInterval(topHolding, '1d');
      portfolioReturns = calculateReturns(topHist.map(h => h.close));
    } catch {
      portfolioReturns = null;
    }
  }

  // 2. Throttled Batch Scanner (Institutional Stability)
  // Instead of Promise.all (Optimistic), we use Chunked Serial batches to prevent 429 Rate Limits
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
    
    // Tiny delay between chunks to let the connection pool breathe
    if (i + CHUNK_SIZE < DISCOVERY_TICKERS.length) {
      await new Promise(res => setTimeout(res, 50));
    }
  }

  signals.forEach(s => {
    // Skip if already in portfolio
    if (portfolioTickers.includes(s.ticker)) return;

    const { score, scanner } = calculateAlphaScore(s, s.stockDetails);
    
    if (score > 0 && scanner) {
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
        score,
        correlationToPortfolio: correlation !== undefined ? Number(correlation.toFixed(2)) : undefined,
        beta: s.stockDetails.keyStats.beta || 1.0
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
