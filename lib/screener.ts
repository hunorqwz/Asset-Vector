import { getFromCache, setInCache } from "@/lib/cache";

// Top 150 highly liquid, institutional-grade equities for the funnel baseline.
const LIQUID_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "COST", "AMD", 
  "NFLX", "QCOM", "ADBE", "INTC", "TXN", "AMAT", "JPM", "GS", "MS", "V", 
  "MA", "LLY", "UNH", "JNJ", "PFE", "XOM", "CVX", "TSM", "ASML", "SQ", 
  "PYPL", "SHOP", "SNOW", "PLTR", "U", "CRM", "ABBV", "MRK", "PEP", "KO",
  "WMT", "MCD", "DIS", "CSCO", "INTU", "VZ", "T", "CMCSA", "PFE", "NKE",
  "BA", "HON", "LMT", "RTX", "GE", "MMM", "CAT", "DE", "UNP", "UPS",
  "FDX", "SBUX", "TGT", "WBA", "CVS", "HD", "LOW", "BAC", "C", "WFC",
  "BLK", "SPGI", "MCO", "CME", "ICE", "NOW", "WDAY", "TEAM", "CRWD", "PANW",
  "FTNT", "ZS", "DDOG", "NET", "MDB", "OKTA", "ZM", "DOCU", "ROKU", "PINS",
  "SNAP", "UBER", "LYFT", "DASH", "ABNB", "HOOD", "COIN", "MARA", "RIOT", "MSTR",
  "SMCI", "ARM", "MU", "KLAC", "LRCX", "SNPS", "CDNS", "ANSS", "PTC", "ADSK",
  "ISRG", "SYK", "MDT", "BSX", "EW", "ZTS", "IDXX", "ILMN", "ALGN", "DXCM",
  "VRTX", "REGN", "BIIB", "GILD", "AMGN", "VRTX", "REGN", "BIIB", "GILD", "AMGN",
  "AEP", "EXC", "DUK", "SO", "D", "NEE", "PEG", "ED", "EIX", "AWK"
];

// Deduplicate just in case
const UNIVERSE = Array.from(new Set(LIQUID_UNIVERSE));

export interface BulkCandidate {
  symbol: string;
  price: number;
  changePct: number;
  forwardPE: number | null;
  volume: number;
  fiftyDayMAChangePct: number;
}

/**
 * Stage 1: The Bulk Filter (Cheap Layer)
 * Hits the Yahoo Finance Batch Quote API to instantly pull basic stats for 100+ stocks at once.
 * Eliminates 80% of the noise (low volume, bad trend, overvalued).
 */
export async function getScreenerCandidates(): Promise<string[]> {
  const CACHE_KEY = "screener_stage_1_candidates";
  const cached = await getFromCache<string[]>(CACHE_KEY);
  if (cached) return cached;

  const candidates: BulkCandidate[] = [];
  const chunkSize = 100; // Safe batch size for Yahoo v7 quote API
  
  try {
    for (let i = 0; i < UNIVERSE.length; i += chunkSize) {
      const chunk = UNIVERSE.slice(i, i + chunkSize);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(",")}&fields=regularMarketPrice,regularMarketChangePercent,forwardPE,regularMarketVolume,fiftyDayAverageChangePercent`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      
      if (!response.ok) continue;
      
      const res = await response.json();
      if (!res.quoteResponse || !res.quoteResponse.result) continue;

      for (const q of res.quoteResponse.result) {
        candidates.push({
          symbol: q.symbol,
          price: q.regularMarketPrice || 0,
          changePct: q.regularMarketChangePercent || 0,
          forwardPE: q.forwardPE || null,
          volume: q.regularMarketVolume || 0,
          fiftyDayMAChangePct: q.fiftyDayAverageChangePercent || 0
        });
      }
    }

    // Mathematical Pruning & Sorting
    // 1. Minimum Liquidity Filter (> 500k volume)
    // 2. Trend Filter (Must be near or above its 50-day average, preventing falling knives)
    const filtered = candidates.filter(c => 
      c.volume > 500000 && 
      c.price > 5 &&
      c.fiftyDayMAChangePct > -0.05 // Allows slight dips, but prevents massive downtrends
    );

    // Score based on a blend of Value (if PE exists) and Momentum
    // We want assets with High Momentum but reasonable valuation.
    const scored = filtered.map(c => {
      let score = c.changePct * 2 + (c.fiftyDayMAChangePct * 100);
      // Reward lower forward PEs (Deep Value)
      if (c.forwardPE && c.forwardPE > 0 && c.forwardPE < 25) {
        score += (25 - c.forwardPE); // e.g. PE 15 gets +10 points
      }
      return { symbol: c.symbol, score };
    });

    scored.sort((a, b) => b.score - a.score);
    
    // Select the Top 25 absolute best baseline candidates
    const topCandidates = scored.slice(0, 25).map(c => c.symbol);

    // Cache this bulk funnel outcome for 30 minutes. 
    // It's extremely cheap, but caching ensures 0 API load.
    await setInCache(CACHE_KEY, topCandidates, 30 * 60 * 1000);
    
    return topCandidates;

  } catch (error) {
    console.error("[Screener] Stage 1 Funnel Failed:", error);
    // Fallback: If network fails, return a randomized subset of mega-caps
    return UNIVERSE.slice(0, 20); 
  }
}
