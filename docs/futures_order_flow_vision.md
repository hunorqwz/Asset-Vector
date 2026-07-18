# CME Futures Order Flow & Entry Alerts Dashboard: Vision & Specifications

This document outlines the vision, structural requirements, technical architecture, and implementation phases for the CME Futures Order Flow and Entry Alerts platform. It serves as a persistent context record for any AI agent or developer working on this project.

---

## 1. Core Vision & Objective
The goal is to build an institutional-grade, low-latency trading dashboard that tracks **CME Futures** (specifically Forex: `6E.v.0` and Gold: `GC.v.0` continuous contracts) using Databento's live feeds. The system will analyze order flow and price action to generate highly accurate entry alerts and provide a clean dashboard for manual execution.

---

## 2. UI & Design System Guidelines
The dashboard must follow a premium, modern, and clean visual style based on a high-fidelity light-theme SaaS layout:
*   **Palette**: Crisp white background, light gray card surfaces, subtle borders (`border-white/10` or soft grays), and clean blue/indigo accents.
*   **Layout**: Left-hand vertical navigation sidebar, clear balance and statistics cards, centralized interactive chart, and a scrolling alerts feed.
*   **Responsive Cards**: Rounded corners (`rounded-xl` or `rounded-2xl`) and soft shadow offsets.
*   **Chart Elements**: Price candles integrated with a vertical Volume Profile overlay, Cumulative Volume Delta (CVD) sub-pane, and a dynamic bid-ask size imbalance meter.

---

## 3. Trading & Technical Confluences
To maximize precision and achieve a high win rate, the system tracks the following price action and order flow concepts:

1.  **Market Structure & Value Areas**:
    *   *Supply & Demand Zones / Fair Value Gaps (FVG)*: Automatically maps imbalances in market structure.
    *   *Volume Profile (Session/Fixed Range)*: Highlights the Point of Control (POC - highest volume price), Value Area High (VAH), and Value Area Low (VAL).
    *   *Area of Value*: High-confluence coordinates where FVGs/Zones intersect with VAL, VAH, or POC.
2.  **Liquidity Sweeps**:
    *   Identifies swing highs/lows and tracks price sweeps (institutional stop hunting) that immediately reject back into structure.
3.  **Entry Triggers**:
    *   *Candlestick Patterns*: Hammers, pin bars, or engulfing candles in context.
    *   *Order Flow Confirmation*: Aggressive buyer/seller footprint imbalances ($300\%+$ diagonal volume bias) and CVD absorption/divergence signatures.
4.  **Surgical Exit Strategy**:
    *   Targets the next major swing high/low but exits **a few pips/ticks early** to guarantee fills and raise overall win rate.

---

## 4. Multi-Agent Consensus Architecture
To prevent false alerts and ensure robustness, the backend uses a multi-agent validation process:

```
                  ┌──────────────────────┐
                  │ Databento Live Feed  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Agent 1   │  │   Agent 2   │  │   Agent 3   │
     │   Market    │  │ Order Flow  │  │   Session   │
     │  Structure  │  │  Telemetry  │  │   & Risk    │
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                    [ Consensus Rule ] 
                    (Must all approve)
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                 [ YES ]            [ NO ]
                    │                 │
           ┌────────┴────────┐    [ Discard ]
           │ Broadcast Alert │
           └─────────────────┘
```

*   **Agent 1: Market Structure Analyst**: Confirms the price is at a structural key level, swing point, or Fair Value Gap.
*   **Agent 2: Microstructure Analyst**: Validates that order flow (CVD divergence, footprint imbalance, size sweep) confirms the direction.
*   **Agent 3: Session & Risk Manager**: Restricts alerts to active session hours (New York / London) and halts execution if spreads are too wide or volume is thin.

---

## 5. Phased Implementation Roadmap

*   **Phase 1: Ingestion & Clean UI Shell**
    *   Establish background Python stream connection to Databento's `GLBX.MDP3` feed.
    *   Create Next.js light-theme dashboard shell, navigation menu, and empty widgets.
*   **Phase 2: Order Flow Metrics Core**
    *   Implement calculation of CVD, footprints, imbalances, and Volume Profile (POC, VAL, VAH).
    *   Pass aggregated 1-minute order flow candles to the database.
*   **Phase 3: Multi-Agent Engine**
    *   Implement structural detection (FVG, swing points) and order flow trigger scripts.
    *   Connect the validation consensus rules.
*   **Phase 4: Live Event Broadcast**
    *   Implement Server-Sent Events (SSE) to push triggered entries and order book imbalances to the dashboard UI instantly.
*   **Phase 5: Trading Ledger & Execution Journal**
    *   Create manual execution cards with ATR-based Stop Loss suggestions and optimized Take Profits.
    *   Develop a position tracker and trade journal database ledger.
