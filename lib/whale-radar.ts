import { StockDetails, InsiderTransaction, Holder } from "@/lib/stock-details";

export interface WhaleIntelligence {
  insiderSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  insiderConvictionScore: number; // 0-100
  institutionalSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  institutionalConvictionScore: number; // 0-100
  whaleConsensus: "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL" | "HIGH_CONVICTION_BUY";
  whaleConsensusScore: number; // 0-100
  clusterBuyDetected: boolean;
  topHoldersAlpha: number; // Average pctChange of top holders
  primaryDriver: string;
}

/**
 * Whale Radar Engine (v1.0)
 * Analyzes Insider & Institutional Intent to derive smart money conviction.
 */
export function calculateWhaleIntelligence(details: StockDetails): WhaleIntelligence {
  const { insiderTransactions, topHolders, keyStats } = details;
  
  // 1. Insider Intent Analysis
  let insiderSales = 0;
  let insiderPurchases = 0;
  let insiderBuyValue = 0;
  let insiderSellValue = 0;
  const uniqueBuyers = new Set<string>();
  
  const lookbackDays = 90;
  const now = Date.now();
  
  insiderTransactions.forEach(tx => {
    const txDate = tx.startDate ? new Date(tx.startDate).getTime() : 0;
    const ageDays = (now - txDate) / (1000 * 3600 * 24);
    
    if (ageDays <= lookbackDays) {
      const text = tx.transactionText.toLowerCase();
      const isSale = text.includes('sale') || text.includes('sell');
      const isPurchase = text.includes('purchase') || text.includes('buy');
      
      if (isSale) {
        insiderSales++;
        insiderSellValue += tx.value || 0;
      } else if (isPurchase) {
        insiderPurchases++;
        insiderBuyValue += tx.value || 0;
        uniqueBuyers.add(tx.filerName);
      }
    }
  });
  
  const clusterBuyDetected = uniqueBuyers.size >= 3;
  let insiderScore = 50;
  if (insiderPurchases > insiderSales) {
    insiderScore += Math.min(40, insiderPurchases * 10);
  } else if (insiderSales > insiderPurchases) {
    insiderScore -= Math.min(40, insiderSales * 5);
  }
  
  // 2. Institutional Flow Analysis
  let instScore = 50;
  let totalPctChange = 0;
  let validHolders = 0;
  
  topHolders.forEach(h => {
    if (h.pctChange !== null) {
      totalPctChange += h.pctChange;
      validHolders++;
    }
  });
  
  const avgInstChange = validHolders > 0 ? totalPctChange / validHolders : 0;
  instScore += Math.max(-40, Math.min(40, avgInstChange * 2));
  
  // Add weight for total institutional holding
  if (keyStats.heldPercentInstitutions) {
    if (keyStats.heldPercentInstitutions > 0.8) instScore += 5;
    if (keyStats.heldPercentInstitutions < 0.2) instScore -= 5;
  }
  
  // 3. Overall Whale Consensus
  let whaleScore = (insiderScore * 0.6) + (instScore * 0.4);
  if (clusterBuyDetected) whaleScore += 15;
  
  const finalWhaleScore = Math.max(0, Math.min(100, Math.round(whaleScore)));
  
  let consensus: WhaleIntelligence['whaleConsensus'] = "NEUTRAL";
  if (clusterBuyDetected && finalWhaleScore > 75) consensus = "HIGH_CONVICTION_BUY";
  else if (finalWhaleScore > 55) consensus = "ACCUMULATION";
  else if (finalWhaleScore < 45) consensus = "DISTRIBUTION";
  
  let driver = "Smart money positioning is currently neutral.";
  if (clusterBuyDetected) {
    driver = `CRITICAL: Cluster buy detected—${uniqueBuyers.size} separate insiders accumulating shares.`;
  } else if (insiderScore > 70) {
    driver = "Strong insider acquisition activity detected over the last 90 days.";
  } else if (avgInstChange > 5) {
    driver = "Top institutional holders are significanty increasing their positions.";
  } else if (insiderScore < 30) {
    driver = "Heavy insider liquidation trend observed.";
  } else if (avgInstChange < -5) {
    driver = "Institutional distribution phase detected among top holders.";
  }
  
  return {
    insiderSentiment: insiderScore > 60 ? "BULLISH" : insiderScore < 40 ? "BEARISH" : "NEUTRAL",
    insiderConvictionScore: insiderScore,
    institutionalSentiment: instScore > 60 ? "BULLISH" : instScore < 40 ? "BEARISH" : "NEUTRAL",
    institutionalConvictionScore: instScore,
    whaleConsensus: consensus,
    whaleConsensusScore: finalWhaleScore,
    clusterBuyDetected,
    topHoldersAlpha: avgInstChange,
    primaryDriver: driver
  };
}
