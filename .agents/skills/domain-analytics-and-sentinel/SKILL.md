---
name: domain-analytics-and-sentinel
description: Master quantitative analytics skill for market microstructure (CVD, Volume Profile, Footprints), fundamental forensics (DCF, WACC, Beneish M-Score, Altman Z-Score), and dynamic in-trade sentinel lifecycle management.
---

# Master Skill: Domain Analytics & Dynamic Sentinel Engine

## 1. Market Microstructure & Order Flow Math

### Cumulative Volume Delta (CVD)
$$\text{CVD}_t = \text{CVD}_{t-1} + \sum (\text{Volume}_{\text{buy}} - \text{Volume}_{\text{sell}})$$
* Trade at Ask/above $\rightarrow +V$ (Buy Delta). Trade at Bid/below $\rightarrow -V$ (Sell Delta).
* **Absorption**: Flag absorption when $\Delta \text{CVD} \ge +200\%$ while price fails to break local swing high (or vice-versa for sell delta).

### Session Volume Profile (POC, VAH, VAL)
* **POC**: Price node with maximum traded volume during session.
* **Value Area (VAH/VAL)**: Continuous price envelope around POC containing $70\%$ of total session volume.
* Expand iteratively outward from POC selecting adjacent node with higher volume until $\sum V_{\text{VA}} \ge 0.70 \times V_{\text{total}}$.

### Diagonal Footprint & Order Book Imbalances
$$\text{Diagonal Imbalance} = \frac{V_{\text{Ask}, P+1}}{V_{\text{Bid}, P}} \ge 3.0 \quad (300\%+ \text{ aggressive volume bias})$$
$$\text{Level 2 Book Imbalance} = \left( \frac{\sum \text{BidSize} - \sum \text{AskSize}}{\sum \text{BidSize} + \sum \text{AskSize}} \right) \times 100 \quad (\text{Guard against } 0 \text{ denominator})$$

---

## 2. Fundamental Valuation & Accounting Forensics

### Beneish M-Score (Earnings Manipulation Diagnostic)
$$M = -4.84 + 0.920 \cdot \text{DSRI} + 0.528 \cdot \text{GMI} + 0.404 \cdot \text{AQI} + 0.892 \cdot \text{SGI} + 0.115 \cdot \text{DEPI} - 0.172 \cdot \text{SGAI} + 4.679 \cdot \text{TATA} - 0.327 \cdot \text{LVGI}$$
* $M > -1.78 \rightarrow$ High probability of earnings manipulation.

### Altman Z-Score (Bankruptcy Risk Diagnostic)
$$Z = 1.2 X_1 + 1.4 X_2 + 3.3 X_3 + 0.6 X_4 + 0.999 X_5$$
* $Z < 1.81$ (Distress Zone), $1.81 \le Z \le 2.99$ (Grey Zone), $Z > 2.99$ (Safe Zone).

### Discounted Cash Flow (DCF) & WACC Bound
$$\text{Enterprise Value} = \sum_{t=1}^{N} \frac{\text{FCF}_t}{(1 + \text{WACC})^t} + \frac{\text{Terminal Value}}{(1 + \text{WACC})^N}, \quad \text{Terminal Value} = \frac{\text{FCF}_N \cdot (1 + g)}{\text{WACC} - g}$$
* Enforce $\text{WACC} > g$ to prevent division by zero or negative infinite valuations.

---

## 3. Pre-Trade Consensus & Dynamic In-Trade Sentinel

### Pre-Trade Confluence Rule
* Accept signals **only** if Confluence Score $\ge 80\%$ across Market Structure, Microstructure, and Risk layers AND:
$$\text{Risk-to-Reward Ratio} = \frac{|\text{Target Price} - \text{Entry Price}|}{|\text{Entry Price} - \text{Stop Loss}|} \ge 2.5$$

### In-Trade Sentinel Lifecycle
1. **Profit Maximization (Momentum Surge)**:
   * CVD surges $\ge +200\%$ in trade direction and structure breaks easily.
   * Action: Trail Stop Loss to **Breakeven** and extend Take-Profit limit by $+1.5 \times \text{ATR}$.
2. **Capital Protection (Order Flow Friction)**:
   * Opposing L2 queue volume $\ge 400\%$ or CVD divergence appears against position.
   * Action: Alert user to lock in **$50\%$ Partial Profit** and tighten Stop Loss.
