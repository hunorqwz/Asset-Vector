# CME Futures & Market Intelligence Dashboard: Vision & Specifications

This document outlines the vision, structural requirements, technical architecture, and system specifications for the Market Scanning, Order Flow Intelligence, and Dynamic In-Trade Sentinel platform.

---

## 1. Core Vision & Objective
The goal is to build an **institutional-grade, highly performant, and cost-optimized** market scanning and trade intelligence terminal.

The system performs two main jobs:
1. **High-Confidence Market Scanner**: Continuously scans multi-asset markets (CME Futures like `GC`, `6E`, `6B`, `ES`, `NQ` and top equities) to discover ultra-high-probability trade setups with a mandatory minimum Risk-to-Reward ratio (e.g. $1:2.5+$).
2. **Dynamic In-Trade Sentinel (Live Tracking)**: Once a user enters or live-tracks a trade, the system monitors real-time market health to **dynamically adjust Take-Profit (TP) limits higher when momentum surges** or **tighten Stop-Loss (SL) / lock in partial profits when market friction occurs**.

---

## 2. Cost-Optimized Data Architecture

To achieve maximum performance and precision on a lean fixed budget:
* **Primary Market Data Backbone (Databento)**: Single streaming feed provider handling live tick-by-tick trades, quote events, Level 2/Level 3 order book depth, and OHLCV bars across Futures and Equities. Eliminates duplicate price feed subscriptions.
* **Free Fundamental & Macro Providers ($0/month)**:
  * **SEC EDGAR API**: Direct government API retrieval of 10-K/10-Q statements for fundamental metrics (DCF, WACC, Altman Z-Score, Beneish M-Score).
  * **FRED API**: Macroeconomic datasets (Fed Funds, Inflation, Yield Spreads).
* **Backend Single-Stream Fan-out (SPLR Cache)**: One backend process ingests Databento streams, caches state in local memory & Postgres, and broadcasts updates to UI clients via **Server-Sent Events (SSE)**. API costs remain flat regardless of active user count.

---

## 3. High-Confidence Opportunity Scanner

The scanner evaluates assets across three independent confluence layers and computes a **Confluence Score (0–100%)**:

1. **Market Structure & Value Areas (Price Action)**:
   * Supply/Demand Zones and 3-candle Fair Value Gaps (FVGs) across timeframes (1m, 5m, 15m).
   * Session Volume Profile: Point of Control (POC), Value Area High (VAH), Value Area Low (VAL).
   * Liquidity Sweeps: Identifies swing high/low stop hunts followed by immediate structural rejections.
2. **Microstructure & Order Flow Telemetry**:
   * Cumulative Volume Delta (CVD) divergence and volume absorption.
   * Diagonal Footprint Imbalance ($3:1$ aggressive buyer/seller ratio).
   * Order Book Imbalance (real-time Level 2 bid/ask depth queue dominance).
3. **Statistical & Volatility Engine**:
   * 1D Kalman Filter (noise reduction vs. true price trend).
   * Dynamic VWAP and 9/21/50 EMA structural alignment.
   * ATR (Average True Range) volatility offsets for SL/TP precision.

*Filter Rule*: Alerts are generated **only** if Confluence Score $\ge 80\%$ and Risk-to-Reward ratio $\ge 1:2.5$.

---

## 4. Dynamic In-Trade Sentinel (Live Tracking Lifecycle)

When a trade is opened or set to "Live Track," a dedicated real-time Sentinel process monitors the active position:

```
                      ┌────────────────────────────┐
                      │    User Opens/Tracks Trade │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │ Attach Real-time Sentinel  │
                      │ (Live Order Flow & Ticks)  │
                      └─────────────┬──────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
  [ Scenario A: Momentum Surge ]              [ Scenario B: Order Flow Friction ]
  - CVD Volume Explodes (+200%)               - CVD Divergence against trade
  - Structure Breaks easily                   - Heavy opposing L2 limit queue
             │                                             │
             ▼                                             ▼
  [ Profit Maximization Alert ]               [ Capital Protection Alert ]
  - Extend TP Target Higher                   - Take 50% Partial Profit
  - Trail SL to Breakeven                     - Tighten Stop-Loss
```

### Modes of Management:
* **Interactive Assistant (Default)**: Pushes real-time recommendation alerts with single-click UI approval (*"Extend TP to +40 pips"*, *"Move SL to Breakeven"*, *"Lock Partial Profit"*).
* **Auto-Pilot (Optional)**: Automatically executes real-time SL/TP updates on the ledger according to user risk guidelines.

---

## 5. Implementation & Documentation Roadmap

* **Phase 1: Ingestion & Server SSE Bridge**: Unified Databento stream connection and SSE event fan-out.
* **Phase 2: Multi-Factor Confluence & Scanner Core**: Scanner engine calculating Market Structure, CVD, Footprint, and ATR Risk-to-Reward filters.
* **Phase 3: Dynamic In-Trade Sentinel Engine**: Live tracking listener monitoring open positions for momentum expansion (TP extension) or order flow absorption (risk tightening).
* **Phase 4: High-Fidelity UI Terminal & Execution Journal**: Interactive Light-Theme Dashboard with real-time indicators, dynamic order lines, alert feed, and trade management cards.
