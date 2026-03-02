import { fetchStockDetails } from "@/lib/stock-details";
import { getAssetDetails } from "@/app/actions";
import { MarketSignal } from "@/lib/market-data";
import { PredictionResult } from "@/lib/inference";
import { StockDetails } from "@/lib/stock-details";
import { calculateAlphaScore } from "@/lib/alpha-engine";
import { recordAlphaPicks } from "./backtest";

export interface AlphaPick {
  ticker: string;
  name: string;
  price: number;
  change: number;
  scanner: 'MOMENTUM' | 'VALUE' | 'UNCORRELATED';
  reason: string;
  score: number;
}

const DISCOVERY_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 
  'AVGO', 'COST', 'AMD', 'NFLX', 'QCOM', 'ADBE', 'INTC', 'TXN', 'AMAT',
  'JPM', 'GS', 'MS', 'V', 'MA', 
  'LLY', 'UNH', 'JNJ', 'PFE',
  'XOM', 'CVX', 'TSM', 'ASML'
];

export async function getInstitutionalAlphaPicks(): Promise<AlphaPick[]> {
  const picks: AlphaPick[] = [];
  
  const results = await Promise.allSettled(
    DISCOVERY_TICKERS.map(t => getAssetDetails(t))
  );

  const signals = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value as MarketSignal & { prediction: PredictionResult; stockDetails: StockDetails });

  signals.forEach(s => {
    const { score, scanner } = calculateAlphaScore(s, s.stockDetails);
    
    if (score > 0 && scanner) {
      let reason = "";
      if (scanner === 'MOMENTUM') reason = "Strong trend alignment with institutional momentum and technical support.";
      if (scanner === 'VALUE') reason = "Undervalued relative to growth with positive sentiment shifts.";
      if (scanner === 'UNCORRELATED') reason = "Outperforming broad market with low beta sensitivity.";

      picks.push({
        ticker: s.ticker,
        name: s.stockDetails.profile.name,
        price: s.stockDetails.price.current,
        change: s.stockDetails.price.dayChangePercent,
        scanner: scanner as any,
        reason,
        score
      });
    }
  });

  const uniquePicks = new Map<string, AlphaPick>();
  picks.sort((a, b) => b.score - a.score).forEach(p => {
    if (!uniquePicks.has(p.ticker)) uniquePicks.set(p.ticker, p);
  });

  const finalPicks = Array.from(uniquePicks.values()).slice(0, 8);
  
  // Archival Loop for performance backtesting
  await recordAlphaPicks(finalPicks);

  return finalPicks;
}
