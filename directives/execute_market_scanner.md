# SOP Directive: High-Confidence Market Scanner Operations

## Objective
Standardized workflow for executing multi-asset market scans, filtering setups by high confluence and Risk-to-Reward ratios, and dispatching alerts.

## Pre-Scan Inputs & Criteria
* **Target Universe**: CME Futures (`GC.V.0`, `6E.V.0`, `ES.V.0`, `NQ.V.0`) and liquid US equities.
* **Minimum Confluence Threshold**: Score $\ge 80\%$.
* **Minimum Risk-to-Reward (R:R) Threshold**: Ratio $\ge 1:2.5$.

## Operational Workflow

### Step 1: Evaluate Market Confluences
For each asset in the target universe, calculate scores across 3 layers:
1. **Market Structure**: Check if price is at a Fair Value Gap (FVG), Volume Profile POC/VAH/VAL, or liquidity sweep level.
2. **Order Flow Telemetry**: Check for Cumulative Volume Delta (CVD) divergence, diagonal footprint imbalances, and Level 2 depth queue dominance.
3. **Volatility Engine**: Compute ATR-based stop loss and take profit targets.

### Step 2: Compute Risk-to-Reward Ratio
$$\text{R:R} = \frac{|\text{Take Profit Price} - \text{Entry Price}|}{|\text{Entry Price} - \text{Stop Loss Price}|}$$
* If $\text{R:R} < 2.5$ or $\text{Confluence Score} < 80\%$, **discard signal silently**.

### Step 3: Dispatch High-Confidence Alert
If criteria are met:
1. Format alert payload containing Ticker, Signal Type (BULLISH/BEARISH), Entry Price, SL, TP, R:R Ratio, and Confluence Score.
2. Send payload to POST `/api/futures/alerts`.
3. Broadcast alert to UI dashboard via SSE bridge.
