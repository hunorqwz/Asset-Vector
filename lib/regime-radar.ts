import { fetchHistoryWithInterval } from "./market-data";
import { RegimeDetector, MarketRegime } from "./regime";
import { getFromCache, setInCache } from "./cache";

export type RegimeTrend = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface RegimeBreakout {
  currentRegime: MarketRegime;
  previousRegime: MarketRegime | null;
  isBreakout: boolean;            // True if regime changed since last window
  hurstScore: number;             // 0-1, current Hurst exponent
  predictability: number;         // 0-1, distance from random walk
  trend: RegimeTrend;
  breakoutDirection: "STRONGER" | "WEAKER" | "REVERSED" | null;
  strategySuggestion: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  detectedAt: string;             // ISO timestamp
}

const CACHE_KEY = "regime_radar_v2";
const CACHE_TTL = 45 * 60 * 1000; // 45 minutes

const STRATEGY_MAP: Record<MarketRegime, Record<RegimeTrend, string>> = {
  MOMENTUM: {
    BULLISH:  "Increase high-beta exposure. Trend-following strategies are rewarded — ride momentum, trail stops.",
    BEARISH:  "Reduce long exposure. Bearish momentum regime: consider inverse ETFs or defensive rotation.",
    NEUTRAL:  "Momentum regime confirmed. Monitor for trend direction before adding exposure.",
  },
  MEAN_REVERSION: {
    BULLISH:  "Mean-reversion regime: Fade extreme moves. Favour low-beta, dividend-paying defensive positions.",
    BEARISH:  "Bearish mean-reversion: Short-lived rallies are selling opportunities. Maintain high cash allocation.",
    NEUTRAL:  "Range-bound market. Reduce directional bets, harvest theta via covered positions.",
  },
  RANDOM_WALK: {
    BULLISH:  "Noise regime detected. Reduce position sizing — signal/noise ratio is too low.",
    BEARISH:  "Random Walk with downward drift. Preserve capital. Avoid leverage.",
    NEUTRAL:  "Market structure is incoherent. Hold core positions, avoid adding risk.",
  },
};

/**
 * REGIME BREAKOUT RADAR
 * Compares the Hurst Exponent of two sequential 60-day windows on SPY
 * to detect macro structural transitions in real time.
 */
export async function detectRegimeBreakout(): Promise<RegimeBreakout | null> {
  const cached = await getFromCache<RegimeBreakout>(CACHE_KEY);
  if (cached) return cached;

  try {
    const history = await fetchHistoryWithInterval("SPY", "1d");
    if (history.length < 120) return null;

    const prices = history.map(h => h.close);

    // Current window: last 60 trading days (≈ 3 months)
    const currentWindow = prices.slice(-60);
    // Previous window: 60 days before the current window
    const prevWindow = prices.slice(-120, -60);

    const currentResult = RegimeDetector.detect(currentWindow);
    const prevResult = RegimeDetector.detect(prevWindow);

    const isBreakout = currentResult.regime !== prevResult.regime;

    // Determine market trend direction from 20-day slope
    const trend20Start = prices[prices.length - 21];
    const trend20End = prices[prices.length - 1];
    const trendPct = trend20Start > 0 ? (trend20End - trend20Start) / trend20Start : 0;
    const trend: RegimeTrend = trendPct > 0.005 ? "BULLISH" : trendPct < -0.005 ? "BEARISH" : "NEUTRAL";

    // Determine breakout direction for narrative
    // IMPORTANT: Check REVERSED first — it represents the most critical structural flip
    let breakoutDirection: RegimeBreakout["breakoutDirection"] = null;
    if (isBreakout) {
      const prevH = prevResult.score;
      const curH = currentResult.score;
      // A REVERSED breakout is when Hurst crosses the 0.5 midpoint (trend ↔ mean-reversion)
      if ((curH > 0.5) !== (prevH > 0.5)) {
        breakoutDirection = "REVERSED";
      } else if (Math.abs(curH - 0.5) > Math.abs(prevH - 0.5)) {
        breakoutDirection = "STRONGER"; // More structurally defined regime
      } else {
        breakoutDirection = "WEAKER";   // Moving toward random walk
      }
    }

    // Urgency
    let urgency: RegimeBreakout["urgency"] = "LOW";
    if (isBreakout && breakoutDirection === "REVERSED") urgency = "HIGH";
    else if (isBreakout) urgency = "MEDIUM";
    else if (currentResult.predictability > 0.5) urgency = "MEDIUM";

    const strategySuggestion = STRATEGY_MAP[currentResult.regime][trend];

    const result: RegimeBreakout = {
      currentRegime: currentResult.regime,
      previousRegime: prevResult.regime,
      isBreakout,
      hurstScore: currentResult.score,
      predictability: currentResult.predictability,
      trend,
      breakoutDirection,
      strategySuggestion,
      urgency,
      detectedAt: new Date().toISOString(),
    };

    await setInCache(CACHE_KEY, result, CACHE_TTL);
    return result;

  } catch (err) {
    console.error("[RegimeRadar] Detection failed:", err);
    return null;
  }
}
