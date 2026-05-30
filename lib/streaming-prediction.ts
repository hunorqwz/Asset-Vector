/**
 * ASSET VECTOR | STREAMING PREDICTION ENGINE
 * Converts real-time Alpaca tick streams into intraday OHLCV bars
 * and feeds them into the local precision forecast engine for live 4H predictions.
 *
 * This runs client-side (browser) — all math is pure JS, no network calls.
 */

import { localPrecisionForecast, PredictionResult } from "./local-forecast";
import { SentimentReport } from "./sentiment";
import { OHLCV } from "./types";

export interface RawTick {
  price: number;
  size: number;
  timestamp: string; // ISO 8601
}

export interface StreamingBar extends OHLCV {
  tickCount: number;
  vwap: number;
}

/**
 * Aggregates an array of raw trade ticks into 1-minute OHLCV bars.
 * Bars are keyed by minute boundary (floor to nearest 60s epoch).
 *
 * @param ticks - Array of raw tick events from the Alpaca WebSocket
 * @returns Array of 1-minute bars sorted chronologically
 */
export function buildOHLCVFromTicks(ticks: RawTick[]): StreamingBar[] {
  if (ticks.length === 0) return [];

  const barMap = new Map<number, StreamingBar>();

  for (const tick of ticks) {
    if (!tick.price || !tick.timestamp) continue;
    const epochSec = Math.floor(new Date(tick.timestamp).getTime() / 1000);
    const minuteBoundary = epochSec - (epochSec % 60); // Floor to minute

    if (!barMap.has(minuteBoundary)) {
      barMap.set(minuteBoundary, {
        time: minuteBoundary,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.size || 0,
        tickCount: 1,
        vwap: tick.price,
      });
    } else {
      const bar = barMap.get(minuteBoundary)!;
      bar.high = Math.max(bar.high, tick.price);
      bar.low = Math.min(bar.low, tick.price);
      bar.close = tick.price;
      bar.volume += tick.size || 0;
      bar.tickCount += 1;
      // Incremental VWAP approximation: running dollar volume / running volume
      const prevDollarVol = bar.vwap * (bar.volume - (tick.size || 0));
      const addedDollarVol = tick.price * (tick.size || 0);
      bar.vwap = bar.volume > 0 ? (prevDollarVol + addedDollarVol) / bar.volume : tick.price;
    }
  }

  return Array.from(barMap.values()).sort((a, b) => a.time - b.time);
}

/**
 * Merges historical daily bars with fresh intraday streaming bars
 * and runs the local precision forecast engine to generate an updated 4H prediction.
 *
 * Strategy:
 *   - Use the historical sequence (daily bars) as the long-term context for
 *     ARIMA trend, Hurst exponent, and regime detection.
 *   - Append the streaming bars at the end to give the Kalman filter
 *     real-time velocity updates.
 *   - The 4H forecast horizon maps to 26 intraday bars (6.5 hour session / 15min).
 *
 * @param historicalBars  - Array of daily OHLCV bars (typically 252 bars / 1 year)
 * @param streamingBars   - Array of 1-min bars built from live ticks (last 30 min)
 * @param realizedVol     - Annualized realized volatility (from daily returns)
 * @param sentiment       - Sentiment report for tilt calculation
 * @param beta            - Systematic beta vs SPY
 * @returns Updated 4H PredictionResult
 */
export function computeStreamingForecast(
  historicalBars: OHLCV[],
  streamingBars: StreamingBar[],
  realizedVol: number,
  sentiment?: SentimentReport,
  beta: number = 1.0
): PredictionResult {
  if (historicalBars.length < 30) {
    return { p10: 0, p50: 0, p90: 0, source: "Insufficient history", horizon: "4H", confidence: 0 };
  }

  // Build the merged sequence: historical closes as 1D bars + streaming 1m bars
  // We downcast streaming bars to match the [open, high, low, close, volume] format
  // expected by localPrecisionForecast.
  const mergedSequence: number[][] = [
    ...historicalBars.map(b => [b.open, b.high, b.low, b.close, b.volume]),
    ...streamingBars.map(b => [b.open, b.high, b.low, b.close, b.volume]),
  ];

  // For a pure 4H prediction based on 1-minute bars:
  // 1 trading day = 390 minutes. 4H = 240 minutes = 240 bars at 1Min resolution.
  // barsPerDay at 1min = 390.
  const barsPerDay = 390;

  return localPrecisionForecast(
    mergedSequence,
    realizedVol,
    "4H",
    sentiment,
    barsPerDay,
    undefined, // VIX injected server-side by the main pipeline
    beta
  );
}

/**
 * Determines if the current time is within US equity market hours (Eastern Time).
 * Used to gate the streaming prediction refresh loop — no point refreshing at 3 AM.
 */
export function isMarketHours(): boolean {
  const now = new Date();
  const etOffset = -5; // EST base; DST handled via hour comparison
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat

  if (utcDay === 0 || utcDay === 6) return false; // Weekend

  // ET = UTC - 5 (EST) or UTC - 4 (EDT). Market hours: 9:30 AM - 4:00 PM ET.
  // We conservatively use UTC 13:30 - 21:00 (covers both EST and EDT).
  const totalMinutes = utcHour * 60 + utcMinute;
  return totalMinutes >= 13 * 60 + 30 && totalMinutes < 21 * 60;
}
