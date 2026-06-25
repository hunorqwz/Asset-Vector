import { calculateReturns, calculateVariance, runARIMAForecast, runARIMAXForecast, calculateGARCHVolatility } from "./math";
import { KalmanFilter } from "./kalman";
import { RegimeDetector } from "./regime";
import { SentimentReport } from "./sentiment";
import { detectVolumeProfileNodes } from "./technical-analysis";
import type { MacroRegime, MacroSnapshot } from "./macro-analysis";
import type { OptionsIntelligence } from "./options-pricing";

export type PredictionHorizon = "4H" | "1D" | "3D" | "1W" | "1M";

export interface PredictionResult {
  p10: number;
  p50: number;
  p90: number;
  source: string;
  horizon: PredictionHorizon;
  confidence: number; 
  tilt?: number; 
}

export type MultiHorizonPrediction = Record<PredictionHorizon, PredictionResult>;

const HORIZON_MAP: Record<PredictionHorizon, number> = {
  "4H": 0.16,  
  "1D": 1,
  "3D": 3,
  "1W": 5,     
  "1M": 21     
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL PRECISION ENGINE (Tier 1 Offline / Client-Safe)
// ─────────────────────────────────────────────────────────────────────────────
export function localPrecisionForecast(
  seq: number[][],
  realizedVol: number,
  horizon: PredictionHorizon = "1D",
  sentiment?: SentimentReport,
  barsPerDay: number = 1,
  vix?: number,
  beta: number = 1.0,
  macroRegime?: MacroRegime,
  creditSpread?: number,
  macroSnapshot?: MacroSnapshot,
  optionsIntelligence?: OptionsIntelligence | null,
  disableFeedback: boolean = false
): PredictionResult {
  const prices = seq.map((x) => x[3]);
  const last = prices[prices.length - 1];
  const targetBars = HORIZON_MAP[horizon];

  if (prices.length < 30 || last <= 0) {
    return { p10: 0, p50: 0, p90: 0, source: "Incomplete Data", horizon, confidence: 0 };
  }

  // 1. GARCH-Lite Volatility (Clustering Awareness)
  const returns = calculateReturns(prices);
  // Scale GARCH result (per-bar vol) to daily equivalent vol
  const garchVolDaily = calculateGARCHVolatility(returns) * Math.sqrt(barsPerDay);
  const localVol = Math.max(garchVolDaily, realizedVol / Math.sqrt(252));

  // Systemic Shield: Incorporate VIX as a macro volatility floor
  // VIX is annualized. Convert to daily equivalent. Baseline VIX ~15-20.
  const vixDaily = (vix || 20) / (Math.sqrt(252) * 100);
  
  // High Beta assets expand more in volatile markets. Floor at 15% systemic contribution.
  const systemicExpansion = Math.max(0.15, Math.abs(beta) * 0.4);
  
  // Credit stress volatility expansion
  const stressMultiplier = 1.0 + Math.max(0, (creditSpread ?? 3.8) - 4.0) * 0.15;

  let regimeDriftMultiplier = 1.0;
  let regimeVolMultiplier = 1.0;

  if (macroRegime) {
    switch (macroRegime) {
      case 'GOLDILOCKS':
        regimeDriftMultiplier = 1.35;
        regimeVolMultiplier = 0.85;
        break;
      case 'REFLATION':
        regimeDriftMultiplier = 1.15;
        regimeVolMultiplier = 1.0;
        break;
      case 'STAGFLATION':
        regimeDriftMultiplier = 0.50;
        regimeVolMultiplier = 1.2;
        break;
      case 'RECESSION':
        regimeDriftMultiplier = 0.30;
        regimeVolMultiplier = 1.4;
        break;
      case 'DEFLATION':
        regimeDriftMultiplier = 0.60;
        regimeVolMultiplier = 1.1;
        break;
      case 'NEUTRAL':
      default:
        regimeDriftMultiplier = 1.0;
        regimeVolMultiplier = 1.0;
        break;
    }
  }

  let optionsVolMultiplier = 1.0;
  let optionsDriftTilt = 0;

  if (optionsIntelligence && optionsIntelligence.isValid) {
    const totalGEX = optionsIntelligence.totalGEX;
    const totalVanna = optionsIntelligence.totalVanna;
    const totalCharm = optionsIntelligence.totalCharm;
    const ivSkew = optionsIntelligence.ivSkew;

    // 1. GEX Volatility Adjustment (Long GEX dampens, Short GEX amplifies)
    const gexFactor = totalGEX / 1e8;
    if (gexFactor >= 0) {
      optionsVolMultiplier = 1.0 - Math.min(0.20, Math.tanh(gexFactor) * 0.20);
    } else {
      optionsVolMultiplier = 1.0 + Math.min(0.30, Math.tanh(Math.abs(gexFactor)) * 0.30);
    }

    // 2. Vanna & Charm Drift Tilt (Dealer positioning buy/sell flows)
    const vannaFactor = totalVanna / 1e8;
    const charmFactor = totalCharm / 1e8;
    const vannaDrift = (Math.tanh(vannaFactor) * 0.0005) / barsPerDay;
    const charmDrift = (Math.tanh(charmFactor) * 0.0005) / barsPerDay;

    // 3. IV Skew Drift Drag (Bearish hedging premium drag)
    const skewFactor = Math.max(0, ivSkew);
    const skewDrift = -(Math.min(0.10, skewFactor) * 0.005) / barsPerDay;

    optionsDriftTilt = vannaDrift + charmDrift + skewDrift;
  }

  let feedbackVolMultiplier = 1.0;
  let feedbackDriftCorrection = 0;
  let feedbackConfidencePen = 0;

  if (!disableFeedback && prices.length >= 40) {
    const feedback = runWalkForwardFeedback(
      seq,
      realizedVol,
      barsPerDay,
      vix,
      beta,
      macroRegime,
      creditSpread,
      macroSnapshot,
      optionsIntelligence
    );

    if (feedback.isValid) {
      // Proportional correction gain to offset forecast drift bias
      feedbackDriftCorrection = feedback.bias * 0.4;
      // Widen the volatility cone when recent RMSE is high
      feedbackVolMultiplier = 1.0 + Math.min(0.50, feedback.rmse * 2.0);
      // Penalize prediction confidence under high error rate
      feedbackConfidencePen = feedback.rmse * 1.5;
    }
  }

  const effectiveVol = Math.sqrt(Math.pow(localVol, 2) + Math.pow(vixDaily * systemicExpansion, 2)) * stressMultiplier * regimeVolMultiplier * optionsVolMultiplier * feedbackVolMultiplier;

  const targetTotalBars = targetBars * barsPerDay;

  // ── Estimator 1: ARIMAX(1,1,0) or ARIMA(1,1,0) ──────────────────────────
  const arimaBars = Math.max(1, Math.round(targetTotalBars)); 
  let arimaResult;
  if (macroSnapshot && barsPerDay === 1) {
    // Generate business days matching the sequence length
    const dates = generateHistoricalDates(prices.length, barsPerDay);
    
    // Construct matched exogenous regressor matrix
    const exogenousMatrix: number[][] = [];
    const fedHistory = macroSnapshot.fedFunds.history;
    const yieldHistory = macroSnapshot.yieldCurve.history;
    const infHistory = macroSnapshot.inflation.history;
    const creditHistory = macroSnapshot.creditSpread.history;

    for (let t = 0; t < prices.length; t++) {
      const dateStr = dates[t];
      const findValue = (history: { date: string; value: number }[]) => {
        const matches = history
          .filter(h => new Date(h.date) <= new Date(dateStr))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return matches.length > 0 ? matches[0].value : (history[history.length - 1]?.value || 0);
      };

      exogenousMatrix.push([
        findValue(fedHistory),
        findValue(yieldHistory),
        findValue(infHistory),
        findValue(creditHistory)
      ]);
    }

    const latestChanges = [
      macroSnapshot.fedFunds.change,
      macroSnapshot.yieldCurve.change,
      macroSnapshot.inflation.change,
      macroSnapshot.creditSpread.change
    ];

    arimaResult = runARIMAXForecast(prices, exogenousMatrix, arimaBars, latestChanges);
  } else {
    arimaResult = runARIMAForecast(prices, arimaBars);
  }
  const arimaP50 = arimaResult.forecast.length > 0 ? arimaResult.forecast[arimaResult.forecast.length - 1] : null;

  // ── Estimator 2: Adaptive Kalman Trend Projection ──────────────────────
  const kalmanWindow = prices.slice(-60);
  const { R, Q } = KalmanFilter.deriveParameters(kalmanWindow);
  const kf = new KalmanFilter(R, Q);
  let currSmooth = 0, prevSmooth = 0;
  for (const p of kalmanWindow) {
    prevSmooth = currSmooth;
    currSmooth = kf.filter(p).prediction;
  }
  const kalmanVelocity = currSmooth - prevSmooth; 
  const kalmanP50 = last + kalmanVelocity * targetTotalBars;
  
  // ── Estimator 3: Regime-Gated GBM ──────────────────────────────────────
  // drift is per bar. Total drift = drift * (targetBars * barsPerDay)
  const drift = returns.slice(-20).reduce((a, b) => a + b, 0) / (20);
  const hurst = RegimeDetector.getHurst(prices);
  const driftAmplifier = hurst > 0.55 ? 1.25 : hurst < 0.45 ? 0.5 : 1.0;
  const effectiveDrift = drift * driftAmplifier * regimeDriftMultiplier;

  // Bayesian Sentiment Tilt (v4.0)
  let tilt = 0;
  if (sentiment && !sentiment.isInsufficientData) {
      // Sentiment score is [-1, 1], so 0 is neutral.
      const sentDelta = sentiment.score; // -1.0 (Bearish) to 1.0 (Bullish)
      // Sentiment velocity affects DAILY trend. Scale by 1/barsPerDay to get per-bar tilt.
      // Maximum boost is ~0.5% daily for strong sentiment + velocity.
      tilt = (sentDelta * (Math.abs(sentiment.velocity) + 0.5) * 0.005) / barsPerDay;
  }

  const finalDrift = effectiveDrift + tilt;

  // Structural Magnet Tilt (v4.1)
  // Price tends to gravitate towards high-liquidity zones (HVNs) in non-trending regimes
  const volumeProfile = detectVolumeProfileNodes(seq.map(x => ({ 
      time: 0, open: x[0], high: x[1], low: x[2], close: x[3], volume: x[4] 
  })), 30);
  const poc = volumeProfile.length > 0 ? volumeProfile[0].price : last;
  const gapToPoc = (poc - last) / last;
  
  // Magnet power: Stronger in mean-reversion regimes (Hurst < 0.45)
  // v4.2 Enhancement: Increase pull for high-liquidity stabilization
  const magnetStrength = hurst < 0.45 ? 0.35 : hurst > 0.55 ? 0.05 : 0.15;
  const structuralTilt = (gapToPoc * magnetStrength) / barsPerDay;

  // Final drift aggregation with a safety cap for institutional stability
  let totalDrift = finalDrift + structuralTilt + optionsDriftTilt + feedbackDriftCorrection;
  const driftCap = 0.01; // Max 1% move per bar (prevents extrapolation madness)
  totalDrift = Math.max(-driftCap, Math.min(driftCap, totalDrift));
  
  const gbmP50 = last * Math.exp(totalDrift * targetTotalBars);

  // ── Weighted Ensemble ────────────────────────────────────────────────────
  let kWeight = 0, aWeight = 0, gWeight = 0;
  if (targetBars < 1) { // 4H
    kWeight = 0.7; gWeight = 0.3; aWeight = 0;
  } else if (targetBars <= 3) { // 1D, 3D
    kWeight = 0.3; aWeight = 0.4; gWeight = 0.3;
  } else { // 1W, 1M
    kWeight = 0.1; aWeight = 0.4; gWeight = 0.5;
  }

  function weighted(a: number | null, k: number, g: number): number {
    const activeAWeight = a !== null ? aWeight : 0;
    const totalWeight = activeAWeight + kWeight + gWeight;
    return (( (a ?? k) * activeAWeight) + (k * kWeight) + (g * gWeight)) / totalWeight;
  }

  const p50 = weighted(arimaP50, kalmanP50, gbmP50);
  
  // ── High-Precision Uncertainty Cone ──────────────────────────────────────
  // Use GARCH daily vol scaled by horizon sqrt(T)
  const ci90Width = p50 * effectiveVol * Math.sqrt(targetBars) * 1.645;
  const p10 = p50 - ci90Width;
  const p90 = p50 + ci90Width;

  const kfSNR = kf.getSNR();
  const predictability = Math.abs(hurst - 0.5) * 2;
  const confidence = Number(Math.max(0, ((kfSNR * 0.4) + (predictability * 0.6)) - feedbackConfidencePen).toFixed(4));

  return {
    p10: Number(Math.max(0, p10).toFixed(4)),
    p50: Number(Math.max(0, p50).toFixed(4)),
    p90: Number(Math.max(0, p90).toFixed(4)),
    source: `Surgical Ensemble v4.2 (Systemic Shield)`,
    horizon,
    confidence,
    tilt: Number((tilt * 100).toFixed(4))
  };
}

/**
 * Reconstructs business dates backwards from today.
 */
function generateHistoricalDates(length: number, barsPerDay: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  if (barsPerDay === 1) {
    let current = new Date(now);
    for (let i = 0; i < length; i++) {
      while (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() - 1);
      }
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() - 1);
    }
    return dates.reverse();
  } else {
    let current = new Date(now);
    const minStep = Math.max(1, Math.round(390 / barsPerDay));
    for (let i = 0; i < length; i++) {
      dates.push(current.toISOString().split('T')[0]);
      current.setMinutes(current.getMinutes() - minStep);
    }
    return dates.reverse();
  }
}

export interface FeedbackMetrics {
  bias: number;
  rmse: number;
  isValid: boolean;
}

/**
 * Performs a rolling 1-step-ahead (1D) walk-forward calibration of the forecasting ensemble
 * over the past 10 bars to calculate forecast bias and root mean squared error.
 */
export function runWalkForwardFeedback(
  seq: number[][],
  realizedVol: number,
  barsPerDay: number,
  vix?: number,
  beta: number = 1.0,
  macroRegime?: MacroRegime,
  creditSpread?: number,
  macroSnapshot?: MacroSnapshot,
  optionsIntelligence?: OptionsIntelligence | null
): FeedbackMetrics {
  const prices = seq.map((x) => x[3]);
  const n = prices.length;

  // Require at least 30 training bars + 10 walk-forward evaluation bars
  if (n < 40) {
    return { bias: 0, rmse: 0, isValid: false };
  }

  let squaredErrorSum = 0;
  let errorSum = 0;
  let count = 0;

  const lookback = 10;
  for (let t = n - lookback; t < n; t++) {
    const subSeq = seq.slice(0, t);
    const actualPrice = prices[t];

    const pred = localPrecisionForecast(
      subSeq,
      realizedVol,
      "1D",
      undefined,
      barsPerDay,
      vix,
      beta,
      macroRegime,
      creditSpread,
      macroSnapshot,
      optionsIntelligence,
      true // disableFeedback to prevent infinite recursion
    );

    if (pred.p50 > 0 && actualPrice > 0) {
      const err = (actualPrice - pred.p50) / actualPrice;
      errorSum += err;
      squaredErrorSum += err * err;
      count++;
    }
  }

  if (count === 0) {
    return { bias: 0, rmse: 0, isValid: false };
  }

  const bias = errorSum / count;
  const rmse = Math.sqrt(squaredErrorSum / count);

  return { bias, rmse, isValid: true };
}
