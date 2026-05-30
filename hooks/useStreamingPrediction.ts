"use client";
/**
 * ASSET VECTOR | useStreamingPrediction
 * 
 * Wires the live Alpaca WebSocket tick stream into the 4H prediction engine.
 * Every 60 seconds during market hours, this hook:
 *   1. Takes all ticks accumulated in the last 30 minutes
 *   2. Aggregates them into 1-minute OHLCV bars
 *   3. Merges those bars with the historical daily sequence
 *   4. Runs the local precision forecast engine
 *   5. Returns the updated PredictionResult
 *
 * When market is closed or Alpaca is not connected, falls back to the
 * static prediction passed in as `basePrediction`.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAlpacaContext, AlpacaTick } from "@/components/providers/AlpacaProvider";
import {
  RawTick,
  buildOHLCVFromTicks,
  computeStreamingForecast,
  isMarketHours,
} from "@/lib/streaming-prediction";
import { PredictionResult } from "@/lib/local-forecast";
import { OHLCV } from "@/lib/types";
import { SentimentReport } from "@/lib/sentiment";

const TICK_BUFFER_WINDOW_MS = 30 * 60 * 1000; // 30 minutes of ticks
const REFRESH_INTERVAL_MS = 60 * 1000;          // Refresh every 60 seconds

export interface StreamingPredictionState {
  /** The current active 4H prediction (streaming or base) */
  prediction4H: PredictionResult | null;
  /** True when we have a live refreshed prediction from real ticks */
  isLive: boolean;
  /** True when the Alpaca connection is up and we're subscribed */
  isConnected: boolean;
  /** ISO timestamp of the last successful refresh */
  lastUpdated: string | null;
  /** How many live ticks are in the current buffer */
  tickCount: number;
}

interface UseStreamingPredictionOptions {
  ticker: string;
  /** Full historical daily OHLCV bars (from the server-side signal) */
  historicalBars: OHLCV[];
  /** Server-side computed realized volatility (annualized) */
  realizedVol: number;
  /** Server-side sentiment report for tilt calculation */
  sentiment?: SentimentReport;
  /** Systematic beta vs SPY */
  beta?: number;
  /** The static 4H prediction from the initial server render */
  basePrediction: PredictionResult | null;
  /** Set false to disable streaming (e.g. for crypto which Alpaca doesn't stream) */
  enabled?: boolean;
}

export function useStreamingPrediction({
  ticker,
  historicalBars,
  realizedVol,
  sentiment,
  beta = 1.0,
  basePrediction,
  enabled = true,
}: UseStreamingPredictionOptions): StreamingPredictionState {
  const { isConnected, subscribe, unsubscribe, ticks } = useAlpacaContext();

  // Rolling tick buffer — we keep the last 30 minutes of ticks in memory
  const tickBufferRef = useRef<RawTick[]>([]);
  const lastTickRef = useRef<AlpacaTick | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<StreamingPredictionState>({
    prediction4H: basePrediction,
    isLive: false,
    isConnected: false,
    lastUpdated: null,
    tickCount: 0,
  });

  // Subscribe to the Alpaca ticker when enabled and it's a US equity
  const isUsEquity = !ticker.includes("-") && !ticker.startsWith("^") && ticker.length <= 5;
  const shouldStream = enabled && isUsEquity;

  useEffect(() => {
    if (!shouldStream || !ticker) return;
    subscribe(ticker);
    return () => unsubscribe(ticker);
  }, [ticker, shouldStream, subscribe, unsubscribe]);

  // Accumulate ticks into the rolling buffer
  useEffect(() => {
    if (!shouldStream) return;
    const latestTick = ticks[ticker];
    if (!latestTick) return;
    if (
      lastTickRef.current?.price === latestTick.price &&
      lastTickRef.current?.timestamp === latestTick.timestamp
    ) return; // Deduplicate

    lastTickRef.current = latestTick;
    const now = Date.now();

    // Append to buffer and prune ticks older than 30 minutes
    tickBufferRef.current.push({
      price: latestTick.price,
      size: latestTick.size,
      timestamp: latestTick.timestamp,
    });
    tickBufferRef.current = tickBufferRef.current.filter(
      t => now - new Date(t.timestamp).getTime() < TICK_BUFFER_WINDOW_MS
    );
  }, [ticks, ticker, shouldStream]);

  // Refresh the streaming prediction on a 60-second interval during market hours
  const runRefresh = useCallback(() => {
    if (!shouldStream) return;
    if (!isMarketHours()) return;
    if (historicalBars.length < 30) return;

    const buffer = tickBufferRef.current;
    if (buffer.length < 5) return; // Need at least 5 ticks to form meaningful bars

    const streamingBars = buildOHLCVFromTicks(buffer);
    if (streamingBars.length === 0) return;

    try {
      const result = computeStreamingForecast(
        historicalBars,
        streamingBars,
        realizedVol,
        sentiment,
        beta
      );

      // Sanity check: reject predictions that deviate more than 10% from base
      // (usually indicates corrupt tick data from a bad feed)
      const lastClose = historicalBars[historicalBars.length - 1]?.close;
      if (lastClose && result.p50 > 0) {
        const deviation = Math.abs(result.p50 - lastClose) / lastClose;
        if (deviation > 0.10) {
          console.warn(`[Streaming Prediction] Rejected outlier prediction: ${(deviation * 100).toFixed(1)}% deviation`);
          return;
        }
      }

      setState(prev => ({
        ...prev,
        prediction4H: result,
        isLive: true,
        isConnected: true,
        lastUpdated: new Date().toISOString(),
        tickCount: buffer.length,
      }));
    } catch (err) {
      console.warn("[Streaming Prediction] Refresh failed:", err);
    }
  }, [shouldStream, historicalBars, realizedVol, sentiment, beta]);

  // Start the refresh interval
  useEffect(() => {
    if (!shouldStream) return;

    // Run once immediately after a short delay (allow tick buffer to fill)
    const initialTimer = setTimeout(runRefresh, 5000);

    // Then run every 60 seconds
    refreshTimerRef.current = setInterval(runRefresh, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [shouldStream, runRefresh]);

  // Sync connection status
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected }));
  }, [isConnected]);

  return state;
}
