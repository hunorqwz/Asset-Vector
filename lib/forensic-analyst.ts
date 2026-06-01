import { MarketSignal, OHLCV } from "./market-data";

export interface ForensicAlert {
  id: string;
  type: 'CONFLICT' | 'DIVERGENCE' | 'RISK' | 'COMPRESSION';
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  title: string;
  description: string;
  suggestion: string;
  insightKey?: string; // Links to the Educational sandbox key (e.g. TRADING_VOLUME, MONTE_CARLO)
  insightCategory?: 'QUANT' | 'FUNDAMENTAL';
}

/**
 * Institutional Forensic Analyst Engine (v4.5)
 * Analyzes market signals and history to detect statistical divergences, order flow imbalances,
 * and structural warnings. Connects diagnostics directly to interactive learning blueprints.
 */
export function detectForensicAlerts(signal: MarketSignal): ForensicAlert[] {
  const alerts: ForensicAlert[] = [];
  const history = signal.history || [];
  const ticker = signal.ticker;
  const currentPrice = signal.price;

  if (history.length < 5 || currentPrice <= 0) return [];

  const lastBar = history[history.length - 1];
  const prevBar = history[history.length - 2];
  const isUpDay = currentPrice > prevBar.close;

  // 1. NARRATIVE / TECHNICAL CONFLICT
  const sentiment = signal.sentiment;
  const tech = signal.tech;

  if (sentiment && !sentiment.isInsufficientData) {
    // Bullish sentiment + Bearish technicals
    if (sentiment.score > 0.3 && (tech.signal === 'SELL' || tech.signal === 'STRONG SELL')) {
      alerts.push({
        id: 'conflict_narrative_bearish_tech',
        type: 'CONFLICT',
        severity: 'CRITICAL',
        title: 'Narrative/Technical Decoupling',
        description: `News sentiment for ${ticker} is bullish (+${sentiment.score.toFixed(2)}), but technical indicators exhibit selling pressure. This suggests institutional distribution.`,
        suggestion: 'Exercise caution. Avoid long entries until technical confluence realigns with narrative support.',
        insightKey: 'CONFLUENCE_SCORE',
        insightCategory: 'QUANT'
      });
    }
    // Bearish sentiment + Bullish technicals
    else if (sentiment.score < -0.3 && (tech.signal === 'BUY' || tech.signal === 'STRONG BUY')) {
      alerts.push({
        id: 'conflict_bearish_narrative_bull_tech',
        type: 'CONFLICT',
        severity: 'WARNING',
        title: 'Contrarian Accumulation',
        description: `Market headlines for ${ticker} show negative bias (-${Math.abs(sentiment.score).toFixed(2)}), but technical flow shows buying momentum. Typically indicates a fear-based bottom or quiet accumulation.`,
        suggestion: 'Monitor support levels. A bullish MACD cross here can signal a contrarian reversal opportunity.',
        insightKey: 'CONFLUENCE_SCORE',
        insightCategory: 'QUANT'
      });
    }
  }

  // 2. VOLUME-PRICE DIVERGENCE
  // Price has moved significantly over the last 5 bars, but volume is thin
  const lookbackPeriod = Math.min(5, history.length - 1);
  if (lookbackPeriod >= 3) {
    const startPrice = history[history.length - 1 - lookbackPeriod].close;
    const priceChangePct = (currentPrice - startPrice) / startPrice;
    
    // Calculate average volume over the last 20 periods
    const volLookback = Math.min(20, history.length);
    const avgVolume = history.slice(-volLookback).reduce((sum, h) => sum + (h.volume || 0), 0) / volLookback;
    const currentVolume = lastBar.volume || 0;

    if (Math.abs(priceChangePct) > 0.015 && avgVolume > 0) {
      const volDecreasePct = (avgVolume - currentVolume) / avgVolume;
      
      if (volDecreasePct > 0.30) { // Volume is 30% below 20-day average
        const direction = priceChangePct > 0 ? 'Bullish' : 'Bearish';
        alerts.push({
          id: `divergence_volume_price_${direction.toLowerCase()}`,
          type: 'DIVERGENCE',
          severity: 'WARNING',
          title: `Thin-Volume ${direction} Move`,
          description: `Price moved ${priceChangePct > 0 ? '+' : ''}${(priceChangePct * 100).toFixed(2)}% over the last ${lookbackPeriod} days, but current volume (${currentVolume.toLocaleString()}) is ${(volDecreasePct * 100).toFixed(0)}% below average. This suggests low conviction.`,
          suggestion: 'High probability of a trap. Do not chase this breakout without volume expansion.',
          insightKey: 'TRADING_VOLUME',
          insightCategory: 'FUNDAMENTAL'
        });
      }
    }
  }

  // 3. OVEREXTENSION WARNINGS (RSI / Bollinger Bands)
  if (tech && tech.isValid) {
    // Overbought Overextension
    if (tech.rsi14 > 75 && tech.bollingerBands.percentB > 0.95) {
      alerts.push({
        id: 'risk_rsi_overbought',
        type: 'RISK',
        severity: 'WARNING',
        title: 'Euphoric Extension',
        description: `RSI is extremely overbought (${tech.rsi14}) and price is pushing the upper Bollinger boundary. This indicates statistical exhaustion.`,
        suggestion: 'Consider scaling out or tightening trailing stops. Mean reversion is statistically favored.',
        insightKey: 'SHARPE_RATIO',
        insightCategory: 'QUANT'
      });
    }
    // Oversold Overextension
    else if (tech.rsi14 < 25 && tech.bollingerBands.percentB < 0.05) {
      alerts.push({
        id: 'risk_rsi_oversold',
        type: 'RISK',
        severity: 'WARNING',
        title: 'Capitulation Exhaustion',
        description: `RSI is extremely oversold (${tech.rsi14}) and price has breached the lower Bollinger boundary. This indicates maximum panic.`,
        suggestion: 'Watch for a bullish MACD histogram cross to confirm a high-probability reversal entry.',
        insightKey: 'SORTINO_RATIO',
        insightCategory: 'QUANT'
      });
    }

    // 4. VOLATILITY SQUEEZE (TTM Squeeze Energy)
    const compression = tech.volatilityCompression;
    if (compression && compression.isSqueezing && compression.compressionScore > 50) {
      alerts.push({
        id: 'compression_ttm_squeeze',
        type: 'COMPRESSION',
        severity: 'NOTICE',
        title: 'Volatility Compression Squeeze',
        description: `Bollinger Bands have compressed inside the Keltner Channels (Score: ${compression.compressionScore}/100). Price is storing energy for a large expansion.`,
        suggestion: 'Monitor the Directional Index (ADX) and wait for Bollinger Bands to expand to trade the breakout direction.',
        insightKey: 'TTM_SQUEEZE',
        insightCategory: 'QUANT'
      });
    }
  }

  // 5. DARK POOL BLOCK RETEST
  const darkPools = signal.darkPoolBlocks || [];
  if (darkPools.length > 0) {
    // Find if price is within 0.75% of any dark pool block
    const nearbyDp = darkPools.find(dp => Math.abs(currentPrice - dp.price) / dp.price <= 0.0075);
    if (nearbyDp) {
      alerts.push({
        id: 'divergence_dark_pool_retest',
        type: 'DIVERGENCE',
        severity: 'NOTICE',
        title: 'Shadow Liquidity Retest',
        description: `Price has returned to a major Dark Pool execution level ($${nearbyDp.price.toFixed(2)}) with a volume of ${nearbyDp.volume.toLocaleString()} shares. Expect institutional defense.`,
        suggestion: 'Watch for volume absorption at this price. A break above/below this block indicates major institutional direction.',
        insightKey: 'VOLUME_PROFILE_POC',
        insightCategory: 'QUANT'
      });
    }
  }

  // 6. ORDER BLOCK RETEST
  const orderBlocks = signal.orderBlocks || [];
  if (orderBlocks.length > 0) {
    // Filter to unmitigated blocks
    const activeBlocks = orderBlocks.filter(ob => !ob.isMitigated);
    
    // Check if price has entered the block range
    const touchedBlock = activeBlocks.find(ob => currentPrice >= ob.bottom && currentPrice <= ob.top);
    if (touchedBlock) {
      const isBullish = touchedBlock.type === 'BULLISH';
      alerts.push({
        id: `divergence_order_block_${touchedBlock.type.toLowerCase()}`,
        type: 'DIVERGENCE',
        severity: 'WARNING',
        title: `${isBullish ? 'Bullish' : 'Bearish'} Order Block Retest`,
        description: `Price has re-entered an unmitigated structural imbalance zone ($${touchedBlock.bottom} - $${touchedBlock.top}) formed on ${touchedBlock.date}. This is an institutional reaction node.`,
        suggestion: isBullish 
          ? 'Look for bullish candlestick absorption patterns (e.g., pinbars) as confirmation of support.' 
          : 'Exercise downside caution. Expect distribution pressure within this overhead block.',
        insightKey: 'CONFLUENCE_SCORE',
        insightCategory: 'QUANT'
      });
    }
  }

  // 7. RANDOM WALK / NOISE WARNING
  // Hurst Exponent near 0.5 (Predictability < 0.25)
  if (signal.predictability !== undefined && signal.predictability < 0.25) {
    alerts.push({
      id: 'risk_random_walk',
      type: 'RISK',
      severity: 'NOTICE',
      title: 'High-Noise Regime',
      description: `The Hurst fractal dimension indicates a Random Walk regime (Predictability: ${(signal.predictability * 100).toFixed(0)}%). Price movements are statistically indistinguishable from noise.`,
      suggestion: 'Avoid trend-following strategies. Pivot to tight range-bound mean-reversion filters or remain cash.',
      insightKey: 'HURST_EXPONENT',
      insightCategory: 'QUANT'
    });
  }

  // 8. SENTIMENT-PRICE DIVERGENCE (Double Guard)
  if (signal.synthesis && signal.synthesis.sentimentPriceDivergence) {
    const div = signal.synthesis.sentimentPriceDivergence;
    if (div === 'BULLISH_DIVERGENCE') {
      alerts.push({
        id: 'divergence_sentiment_bullish',
        type: 'DIVERGENCE',
        severity: 'WARNING',
        title: 'Bullish Narrative Divergence',
        description: `Price velocity is bearish, but media and disclosure sentiment velocity is accelerating positively. Narrative is leading price.`,
        suggestion: 'Accumulate slowly. Historical studies show narrative leaders tend to resolve upward.',
        insightKey: 'SENTIMENT_VELOCITY',
        insightCategory: 'QUANT'
      });
    } else if (div === 'BEARISH_DIVERGENCE') {
      alerts.push({
        id: 'divergence_sentiment_bearish',
        type: 'DIVERGENCE',
        severity: 'CRITICAL',
        title: 'Bearish Narrative Divergence',
        description: `Price is rising on retail momentum, but institutional headlines and sentiment velocity are accelerating negatively.`,
        suggestion: 'Avoid buying breakouts. Retail distribution is likely concluding, leading to a structural drop.',
        insightKey: 'SENTIMENT_VELOCITY',
        insightCategory: 'QUANT'
      });
    }
  }

  return alerts;
}
