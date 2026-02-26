import { OHLCV } from "./market-data";
import { TechnicalIndicators } from "./technical-analysis";
import { StrategicInsight } from "@/app/actions/ai";

export interface Anomaly {
  id: string;
  type: 'CONFLICT' | 'DIVERGENCE' | 'RISK';
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  title: string;
  description: string;
  suggestion: string;
}

export function detectNeuralAnomalies(
  history: OHLCV[],
  technicals: TechnicalIndicators,
  aiInsight: StrategicInsight | null
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (history.length < 5) return [];

  const lastPrice = history[history.length - 1].close;
  const prevPrice = history[history.length - 2].close;
  const isUpDay = lastPrice > prevPrice;

  // 1. Narrative vs. Technical Conflict
  if (aiInsight && aiInsight.sentiment.bias === 'BULLISH' && (technicals.signal === 'SELL' || technicals.signal === 'STRONG SELL')) {
    anomalies.push({
      id: 'narrative_tech_conflict',
      type: 'CONFLICT',
      severity: 'CRITICAL',
      title: 'Narrative/Technical Decoupling',
      description: 'News sentiment is bullish, but technical momentum is firmly bearish. This suggests institutional distribution.',
      suggestion: 'Avoid long entries until technical confluence realigns with the narrative.'
    });
  }

  if (aiInsight && aiInsight.sentiment.bias === 'BEARISH' && (technicals.signal === 'BUY' || technicals.signal === 'STRONG BUY')) {
    anomalies.push({
      id: 'narrative_tech_conflict_rev',
      type: 'CONFLICT',
      severity: 'WARNING',
      title: 'Contrarian Accumulation',
      description: 'The narrative is bearish, but technical signals are showing strong buying pressure (RSI/MACD bottoming).',
      suggestion: 'Monitor for "Fear-based" accumulation. Potential long opportunity if support holds.'
    });
  }

  // 2. Overextension Warning (Mean Reversion)
  if (technicals.rsi14 > 75 && aiInsight?.sentiment.score && aiInsight.sentiment.score > 0.7) {
    anomalies.push({
      id: 'rsi_euphoria',
      type: 'RISK',
      severity: 'WARNING',
      title: 'Euphoric Extension',
      description: 'RSI is overbought (>75) and narrative sentiment is at extreme highs. High risk of a blow-off top.',
      suggestion: 'Tighten trailing stops or reduce exposure. Mean reversion is statistically imminent.'
    });
  }

  if (technicals.rsi14 < 25 && aiInsight?.sentiment.score && aiInsight.sentiment.score < 0.3) {
    anomalies.push({
      id: 'rsi_despair',
      type: 'RISK',
      severity: 'WARNING',
      title: 'Capitulation Signal',
      description: 'Asset is extremely oversold with peak despair in the headlines. Often marks a cycle bottom.',
      suggestion: 'Watch for a bullish MACD cross as a high-probability entry trigger.'
    });
  }

  // 3. Volatility / Bollinger Divergence
  if (technicals.bollingerBands.percentB > 1.0 && !isUpDay) {
    anomalies.push({
      id: 'bb_exhaustion',
      type: 'DIVERGENCE',
      severity: 'CRITICAL',
      title: 'Volatility Exhaustion',
      description: 'Price is outside the Upper Bollinger Band but closed lower on the day. Institutional rejection detected.',
      suggestion: 'Exit momentum positions immediately. Structural reversal in progress.'
    });
  }

  return anomalies;
}
