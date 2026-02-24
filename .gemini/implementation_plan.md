# Asset Vector — Grand Implementation Plan
## Vision: Multi-Layer Analysis Engine + Learning Platform

---

## 🎯 Core Concept

Transform Asset Vector from a **watchlist + chart dashboard** into a **full-spectrum analysis engine** where every analysis layer:
1. **Shows the data** — visual, interactive, real-time
2. **Shows the theory** — explains *how* we arrived at the result  
3. **Teaches the user** — acts as a learning platform for financial literacy

---

## 📐 Architecture: The Analysis Layers

### LAYER 1: Technical Analysis ✅ (Partially Exists)
**What exists:** SMA (20/50), Bollinger Bands, RSI, MACD, Kalman Filter
**What to add:**
- **Fibonacci Retracements** — auto-draw on significant swing points
- **Ichimoku Cloud** — full cloud overlay (Tenkan, Kijun, Senkou A/B, Chikou)
- **Stochastic Oscillator** — momentum confirmation
- **ATR (Average True Range)** — volatility sizing
- **VWAP** — Volume Weighted Average Price
- **Support/Resistance Detection** — algorithmic level detection (not the current `price * 1.02` placeholder)

**Learn Panel:** "What is SMA and why does it lag?", "How Bollinger Bands measure volatility", etc.

---

### LAYER 2: Fundamental Analysis 🆕
**Data to fetch (from Yahoo Finance API):**
- **Valuation Ratios:** P/E, P/B, P/S, EV/EBITDA, PEG
- **Profitability:** Gross Margin, Operating Margin, Net Margin, ROE, ROA, ROIC
- **Growth:** Revenue Growth (YoY, QoQ), EPS Growth, Free Cash Flow Growth
- **Financial Health:** Debt/Equity, Current Ratio, Quick Ratio, Interest Coverage
- **Dividends:** Yield, Payout Ratio, Ex-Date, Frequency
- **Earnings:** Last 4 quarters EPS (beat/miss), Revenue (beat/miss), next earnings date
- **Cash Flow Statement:** Operating CF, CapEx, Free CF
- **Insider Activity:** Recent buys/sells

**UI Components:**
- `FundamentalScorecard` — radar chart showing value/growth/quality scores
- `EarningsTimeline` — visual history of beats/misses
- `FinancialHealthBar` — stacked horizontal gauge
- `ValuationCompass` — is it cheap or expensive vs. sector/history

**Learn Panel:** "What does P/E ratio actually mean?", "Why Free Cash Flow matters more than Net Income", etc.

---

### LAYER 3: Sentiment Analysis ✅ (Basic Exists → Upgrade)
**What exists:** Keyword-based positive/negative word counting
**What to add:**
- **News Feed** — actual headlines with source, date, sentiment score per headline
- **Social Sentiment** — aggregate from multiple news sources
- **Fear & Greed Index** — computed from VIX, put/call ratio, market breadth
- **Analyst Consensus** — Buy/Hold/Sell ratings, average target price
- **Insider Sentiment** — derived from insider buy/sell patterns

**UI Components:**
- `SentimentGauge` — visual arc from EXTREME FEAR to EXTREME GREED
- `NewsTimeline` — scrollable feed with per-headline sentiment badge
- `AnalystConsensus` — horizontal bar of Buy/Hold/Sell distribution
- `SentimentHistory` — sparkline of sentiment over time

**Learn Panel:** "Why sentiment is a contrarian indicator", "How to read analyst ratings", etc.

---

### LAYER 4: Machine Learning / AI Predictions ✅ (Skeleton Exists → Upgrade)
**What exists:** TFT model skeleton, heuristic fallback
**What to add:**
- **Model Transparency Panel:**
  - Show input features visually (what data the model uses)
  - Show confidence intervals (already have p10/p50/p90)
  - Show SHAP values — which features contributed most to the prediction
  - Historical accuracy tracker — how often was the model right?
- **Ensemble View:** Show agreement/disagreement between multiple signal sources
- **Backtest Results:** if model was applied historically, what would performance be?

**UI Components:**
- `ModelExplainer` — visual breakdown of "Why AI thinks X"
- `FeatureImportance` — horizontal bar chart of SHAP factors
- `AccuracyTracker` — historical hit rate
- `PredictionFunnel` — visual P10→P50→P90 cone

**Learn Panel:** "What is a Temporal Fusion Transformer?", "Understanding confidence intervals", etc.

---

### LAYER 5: Time Series Analysis ✅ (Partial → Expand)
**What exists:** Kalman Filter, Hurst Exponent / Regime Detection
**What to add:**
- **Autocorrelation Plot (ACF/PACF)** — show serial dependence
- **Decomposition** — Trend + Seasonal + Residual breakdown
- **Volatility Clustering** — GARCH-style visualization
- **Stationarity Test** — ADF test result display
- **Returns Distribution** — histogram + normal overlay + skew/kurtosis stats
- **Rolling Statistics** — rolling mean, std, Sharpe ratio

**UI Components:**
- `RegimeTimeline` — colored bar showing regime changes over time
- `VolatilitySurface` — heatmap of historical volatility
- `ReturnsDistribution` — histogram with normal curve overlay
- `KalmanExplainer` — animated visualization of noise filtering

**Learn Panel:** "What is a Kalman Filter and why use it?", "Understanding market regimes with Hurst Exponent", etc.

---

### LAYER 6: Risk Analysis 🆕
- **Value at Risk (VaR)** — 95% and 99% confidence
- **Conditional VaR (CVaR)** — expected shortfall
- **Maximum Drawdown** — historical max peak-to-trough
- **Sharpe Ratio** — risk-adjusted return
- **Sortino Ratio** — downside-only risk
- **Beta** — correlation to benchmark (S&P 500)
- **Correlation Matrix** — vs. other assets in watchlist

**Learn Panel:** "What is VaR and why banks use it?", "Sharpe vs. Sortino: which is better?", etc.

---

### LAYER 7: Comparative / Sector Analysis 🆕
- **Peer Comparison** — rank asset vs. sector peers on key metrics
- **Sector Heatmap** — which sectors are hot/cold
- **Relative Strength** — performance vs. benchmark over time
- **Correlation to Watchlist** — how correlated is this asset to others you track

---

## 🎓 The Learning Platform System

### Core Concept: "Learn" Toggle
Every analysis section has a toggle: **Analysis Mode** ↔ **Learn Mode**

**In Analysis Mode:** Pure data, charts, numbers — for experienced users
**In Learn Mode:** Each metric/chart gets:
1. **Definition** — plain English explanation
2. **Why It Matters** — practical significance
3. **How To Read It** — interpreting the current values
4. **Example** — concrete real-world example
5. **Deep Dive Link** — optional expand for the math/theory

### Implementation:
- `LearnCard` component — expandable explanation card with icon, title, body
- `TheoryPanel` component — collapsible sidebar with theory content
- `InfoTooltip` component — hover ? icon that shows inline explanations
- Content stored in structured JSON/MD files under `/content/learn/`

---

## 🏗️ UI Architecture

### Asset Detail Page Redesign: `/asset/[ticker]`

```
┌─────────────────────────────────────────────────┐
│  HEADER: Ticker | Price | Change | Trend Badge  │
├─────────────────────────────────────────────────┤
│  TAB BAR:                                       │
│  [Overview] [Technicals] [Fundamentals]         │
│  [Sentiment] [AI/ML] [Time Series] [Risk]       │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHART (always visible, top section)            │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  TAB CONTENT (below chart)                      │
│  ┌──────────────────┬──────────────────────┐    │
│  │  Data Cards      │  Theory / Learn Panel│    │
│  │  (analysis data) │  (explanations)      │    │
│  └──────────────────┴──────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📦 Implementation Phases

### Phase 1: Foundation & Architecture (Current)
- [ ] Create tab-based navigation system on asset detail page
- [ ] Build reusable `AnalysisSection` component with Learn toggle
- [ ] Build `LearnCard` and `TheoryPanel` components
- [ ] Create content structure for educational material
- [ ] Refactor asset detail page to support tabbed layout

### Phase 2: Fundamental Analysis
- [ ] Create `lib/fundamentals.ts` — fetch P/E, margins, etc. from Yahoo Finance
- [ ] Build `FundamentalScorecard` component
- [ ] Build `EarningsTimeline` component  
- [ ] Build `ValuationCompass` component
- [ ] Write learn content for fundamentals

### Phase 3: Sentiment Upgrade
- [ ] Upgrade `lib/sentiment.ts` — real news feed, multi-source
- [ ] Build `SentimentGauge` component
- [ ] Build `NewsTimeline` component
- [ ] Build `AnalystConsensus` component
- [ ] Write learn content for sentiment

### Phase 4: Time Series & Risk
- [ ] Create `lib/timeseries.ts` — decomposition, ACF, distribution
- [ ] Create `lib/risk.ts` — VaR, Sharpe, drawdown, beta
- [ ] Build visualization components
- [ ] Write learn content

### Phase 5: ML Transparency
- [ ] Build `ModelExplainer` component
- [ ] Build `FeatureImportance` chart
- [ ] Build `AccuracyTracker`
- [ ] Write learn content for ML concepts

### Phase 6: Polish & Cross-Layer
- [ ] Sector/peer comparison
- [ ] Cross-asset correlation
- [ ] Global learn mode toggle
- [ ] Performance optimization

---

## ✅ What We Start With (Phase 1)
1. **Tab system** on the asset detail page
2. **Fundamental data fetching** from Yahoo Finance (quoteSummary)  
3. **Learn toggle** with first educational content
4. **Overview tab** combining existing data into a cohesive summary
