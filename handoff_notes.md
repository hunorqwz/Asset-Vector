# CME Futures Terminal Handoff & Future Roadmap

This document serves as the developer handoff for the next AI agent session. It outlines what has been built, the current state of Phase 7, and the planned roadmap for future enhancements.

---

## 1. Project Architecture (3-Layer concern separation)
*   **Layer 1 (Directive)**: SOP instructions and system parameters.
*   **Layer 2 (Orchestration - Agent)**: Evaluates structural zones, order flow imbalance, and triggers consensus alerts.
*   **Layer 3 (Execution - Scripts)**: Low-level data parsing and mathematical calculations.
    *   [databento_stream.py](file:///c:/Projects/Asset-Vector/execution/databento_stream.py): Core CME Globex real-time and mock ingestion engine.
    *   [test_futures_math.py](file:///c:/Projects/Asset-Vector/execution/test_futures_math.py): Mathematical test runner checking volume profile, candle builders, swing structures, CVD divergences, ATR volatility risk, footprint imbalances, and LVNs.

---

## 2. Completed Implementations (Phases 1-6 + Indicators Steps 7.1-7.3)

### **Ingestion & UI Core**
*   **Streaming bridge**: Transmits raw trade/quote events via Next.js SSE router ([app/api/futures/stream/route.ts](file:///c:/Projects/Asset-Vector/app/api/futures/stream/route.ts)) and client broker ([lib/futures-server-bridge.ts](file:///c:/Projects/Asset-Vector/lib/futures-server-bridge.ts)).
*   **Futures Terminal Dashboard** ([components/organisms/FuturesTerminal.tsx](file:///c:/Projects/Asset-Vector/components/organisms/FuturesTerminal.tsx)):
    *   Synchronized candlesticks and CVD charts using `lightweight-charts`.
    *   Book Imbalance meter and manual simulated ledger tracker.
*   **Session Volume Profile**: POC, VAH, and VAL calculations on $70\%$ volume parameters.

### **Consensus Engines**
*   `MarketStructureAgent`: swing highs/lows and Fair Value Gaps (FVG) mapper.
*   `MicrostructureAgent`: CVD price divergences and bid/ask volume imbalance.
*   `SessionRiskAgent`: Stop Loss and Take Profit limits placed just *before* swing boundaries to optimize fill rates.

### **Phase 6: Advanced Precision Optimizations**
*   **Multi-Timeframe Trend filter**: Aggregates 1m candles into 5m candles and enforces Higher Timeframe alignment in `ConsensusEngine`.
*   **ATR-Sized volatility offsets**: Implemented rolling 14-period SMA of True Ranges to adjust SL/TP offsets based on market volatility.
*   **Diagonal Footprint imbalances**: Scans transaction sizes diagonally at $3:1$ ratios.
*   **Low Volume Nodes & VAH/VAL Rejections**: Alerts when price touches Value Area limits or approaches LVNs.

### **Phase 7: Customizable Technical Overlays (Current Phase)**
*   **Indicators Toolbar**: Floating header UI to check/uncheck indicators and type customize periods.
*   **Dynamic EMAs**: Client-side EMA calculators (EMA 1, 2, 3) mapped as LineSeries on the chart.
*   **VWAP**: Client-side Volume Weighted Average Price series overlay.

---

## 3. Current Task State & Next Steps

We are currently at **Step 7.4 of Phase 7**.

### **Step 7.4: SSE Real-Time Indicator Updates (Next Action)**
- **Goal**: When a trade tick is received in `FuturesTerminal.tsx` via the SSE EventSource stream:
  1.  Update the final candle in the browser state `candles` array.
  2.  If the minute rolls over, append a new candle to the array.
  3.  Trigger the EMA and VWAP calculation loops to extend the overlay lines in real-time.
- **Where to edit**: `components/organisms/FuturesTerminal.tsx` around `sse.onmessage` trade event callback.

### **Step 7.5: System check**
- Run compiler checks (`npx tsc --noEmit`) and the Vitest test suite (`npx vitest run`) to verify build integrity.

---

## 4. Future Chart Feature Roadmap
After completing Step 7.4 & 7.5, implement the following features one-by-one:

1.  **On-Chart Buy/Sell Markers**:
    *   Place small green "BUY" arrows below candles and red "SELL" arrows above candles on the price chart whenever a consensus alert occurs.
2.  **Dynamic Order lines**:
    *   Draw horizontal colored price lines representing **Entry Price** (blue), **Take Profit** (green), and **Stop Loss** (red) on the chart when a position is logged.
3.  **Crosshair Synchronized HUD Bar**:
    *   Show a text bar row at top-left of chart containing candle parameters: `O: [Val] H: [Val] L: [Val] C: [Val] EMA1: [Val] VWAP: [Val]` updating dynamically on cursor moves.
4.  **1m / 5m Candlestick Switcher**:
    *   Toggles the primary chart candlesticks between 1-minute interval view and 5-minute interval view.
