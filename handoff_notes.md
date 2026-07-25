# Market Intelligence & Dynamic Sentinel Platform Handoff & Roadmap

This document outlines what has been built, the current state, and the agreed architectural vision and feature roadmap for the platform.

---

## 1. Project Architecture (3-Layer Separation of Concerns)
*   **Layer 1 (Directive)**: SOP instructions and system parameters (stored in `directives/`).
*   **Layer 2 (Orchestration - Agent)**: Evaluates structural zones, order flow telemetry, R:R requirements, and manages dynamic trade alerts.
*   **Layer 3 (Execution - Scripts)**: Low-level data parsing and mathematical calculations.
    *   [databento_stream.py](file:///Users/a0/Documents/GitHub/Asset-Vector/execution/databento_stream.py): Databento streaming engine for real-time CME Globex & equities market data.
    *   [test_futures_math.py](file:///Users/a0/Documents/GitHub/Asset-Vector/execution/test_futures_math.py): Mathematical test runner for CVD, footprint imbalances, volume profiles, and swing structures.

---

## 2. Cost-Optimized Data Architecture Blueprint
*   **Primary Data Engine**: Single Databento streaming feed for live price action, quotes, Level 2/3 order book depth, and historical bars across Futures & Equities.
*   **Free Fundamental Datasets ($0/mo)**: SEC EDGAR API (for 10-K/10-Q metrics like DCF, WACC, Altman Z-Score) and FRED API (for macro interest rates, inflation, and yield curves).
*   **Backend SSE Distribution**: Single server process ingests streams and broadcasts updates to UI clients via Server-Sent Events (SSE) so costs remain flat as user count scales.

---

## 3. Core System Features

### A. High-Confidence Opportunity Scanner
*   Scans multi-asset instruments against 3 confluence layers:
    1.  **Market Structure**: Supply/Demand zones, Fair Value Gaps (FVGs), and Volume Profile (POC, VAH, VAL).
    2.  **Order Flow Telemetry**: CVD divergences, Level 2 bid/ask depth queue dominance, and $3:1$ diagonal footprint imbalances.
    3.  **Statistical & Volatility Engine**: 1D Kalman Filter, Dynamic VWAP/EMA alignment, and ATR-based volatility offsets.
*   **Filter Rule**: Pushes high-confidence alerts **only** when Confluence Score $\ge 80\%$ and Risk-to-Reward (R:R) ratio is $\ge 1:2.5$.

### B. Dynamic In-Trade Sentinel (Live Tracking)
*   When a trade is opened or set to "Live Track," a dedicated Sentinel process monitors the active position in real-time.
*   **Profit Maximization**: If market conditions accelerate in favor of the trade (surge in CVD buying delta, structural breakout), the system alerts the user to **extend Take-Profit targets higher** and trail Stop-Loss to Breakeven.
*   **Capital Protection**: If opposing limit queues or CVD absorption appear ahead of target, the system alerts the user to **lock in 50% partial profit** or tighten Stop-Loss.

---

## 4. Current State & Next Action Items

We are currently at **Step 7.4 of Phase 7**.

### **Step 7.4: SSE Real-Time Indicator Updates (Next Action)**
- **Goal**: When a trade tick is received in [`FuturesTerminal.tsx`](file:///Users/a0/Documents/GitHub/Asset-Vector/components/organisms/FuturesTerminal.tsx) via SSE:
  1.  Update the final candle in the state `candles` array.
  2.  On minute rollover, append a new candle to the array.
  3.  Trigger client-side EMA and VWAP indicator recalculation loops in real-time.

### **Step 7.5: System Check**
- Run compiler checks (`npx tsc --noEmit`) and Vitest test suite (`npx vitest run`).

---

## 5. Feature Implementation Roadmap

1.  **High-Confidence Confluence Scanner & R:R Engine**:
    *   Filter scanner results by minimum $1:2.5+$ R:R ratio and high-confluence scores.
2.  **Dynamic In-Trade Sentinel Engine**:
    *   Attach live-tracking listener to open position IDs.
    *   Trigger Real-Time TP Extension & Partial Profit / Breakeven alerts based on CVD and volume telemetry shifts.
3.  **On-Chart Markers & Dynamic Order Lines**:
    *   Place Buy/Sell markers on chart signals and draw horizontal colored lines for Entry (blue), Take-Profit (green), and Stop-Loss (red).
4.  **Synchronized Crosshair HUD & Timeframe Switcher**:
    *   Top-left chart row showing live parameters (`O, H, L, C, EMA, VWAP`) on hover, with 1m/5m interval switcher.
