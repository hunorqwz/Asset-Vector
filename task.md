# Market Intelligence & Dynamic Sentinel Platform Task List

## Phase 1: Ingestion & Clean UI Shell
- `[x]` Step 1.1: Create Python Databento client (`execution/databento_stream.py`) with live and mock replay mode.
- `[x]` Step 1.2: Implement database schema updates in `db/schema.ts` for futures candles, alerts, and positions.
- `[x]` Step 1.3: Create Next.js server actions and API endpoints to ingest order flow data and alerts.
- `[x]` Step 1.4: Build the clean, light-themed Futures Terminal UI page (`app/(dashboard)/futures/page.tsx`).

## Phase 2: Order Flow Metrics Core
- `[x]` Step 2.1: Write calculations for CVD, Footprint imbalances, and Session Volume Profile in the Python script.
- `[x]` Step 2.2: Implement local tests to verify mathematical accuracy of the order flow engine.

## Phase 3: Multi-Agent Consensus Logic
- `[x]` Step 3.1: Build the Market Structure Agent (FVG and swing point mapper).
- `[x]` Step 3.2: Implement the Microstructure Agent (CVD divergences, order book imbalance, and block trades).
- `[x]` Step 3.3: Implement the Session & Risk Agent and the Consensus validation loop.

## Phase 4: Trade Ledger & Journal
- `[x]` Step 4.1: Integrate Server-Sent Events (SSE) for real-time frontend updates.
- `[x]` Step 4.2: Build the manual position logger and performance tracking journal.

## Phase 5: Advanced Precision Optimizations
- `[x]` Step 5.1: Implement Multi-Timeframe (5m) Structure Filter in MarketStructureAgent.
- `[x]` Step 5.2: Develop ATR-Based Volatility Adjusted TP/SL targets in SessionRiskAgent.
- `[x]` Step 5.3: Add real-time Diagonal Footprint Volume Imbalance alerts.
- `[x]` Step 5.4: Add Value Area Rejections and Low Volume Nodes (LVN) alerts.
- `[x]` Step 5.5: Run comprehensive mathematical and system verification tests.

## Phase 6: TradingView Custom Chart Indicators
- `[x]` Step 6.1: Setup Indicator Control Toolbar UI and customizable state inputs.
- `[x]` Step 6.2: Implement client-side EMA calculations & LineSeries overlays.
- `[x]` Step 6.3: Implement client-side VWAP calculations & LineSeries overlays.
- `[x]` Step 6.4: Integrate real-time incoming tick data with indicator recalculation loops.
- `[x]` Step 6.5: Run comprehensive TypeScript and Vitest verification tests.

## Phase 7: High-Confidence Scanner & Dynamic Sentinel Engine
- `[x]` Step 7.1: Build High-Confidence Market Scanner engine with mandatory R:R (1:2.5+) filter.
- `[x]` Step 7.2: Implement Dynamic In-Trade Sentinel process for live position tracking.
- `[x]` Step 7.3: Add real-time TP Extension (momentum surge) & Partial Profit / SL Tightening (friction) alerts.
- `[x]` Step 7.4: Add On-Chart Signal Markers and Dynamic Colored Order Lines (Entry, TP, SL).
