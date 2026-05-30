/**
 * ASSET VECTOR | SURGICAL EDUCATION ENGINE
 * Comprehensive technical and fundamental educational material.
 */

export interface DeepInsight {
  title: string;
  subtitle: string;
  definition: string;
  whyItMatters: string;
  keyTakeaway: string;
  pitfalls: string[];
  formula?: string;
  lookback?: string;
}

export const FUNDAMENTAL_DEEP_DIVES: Record<string, DeepInsight> = {
  PROFITABILITY: {
    title: "Operating Efficiency Analysis",
    subtitle: "Operating Efficiency Framework",
    definition: "Profitability metrics measure a company's ability to generate earnings relative to its revenue, operating costs, and balance sheet assets.",
    whyItMatters: "A company that can't turn revenue into profit is ultimately unsustainable. We look for 'High-Stability Margins'—companies that maintain profitability even when costs rise.",
    keyTakeaway: "Focus on the Delta (change) between Gross and Operating margins. If Gross Margin is stable but Operating Margin is falling, the company's management is likely losing control of administrative costs.",
    pitfalls: ["High net profit driven by one-time asset sales.", "Ignoring R&D expenses in 'adjusted' margins."],
  },
  LIQUIDITY: {
    title: "Capital Solvency & Liquidity Metrics",
    subtitle: "Solvency & Liquidity",
    definition: "Solvency measures a company's long-term ability to meet its debt obligations, while liquidity measures its short-term ability to pay bills.",
    whyItMatters: "Most companies don't go bankrupt because they are unprofitable; they go bankrupt because they run out of cash. In high-interest-rate environments, this becomes the primary risk factor.",
    keyTakeaway: "Look for a Debt/Equity ratio below 1.5 in technology and below 2.5 in industrials. A Current Ratio above 1.2 is the 'Safe Haven' threshold for high-velocity assets.",
    pitfalls: ["Relying on 'Current Assets' that are actually unsellable inventory.", "Aggressive debt-to-equity driven by share buybacks."],
  },
  VALUATION: {
    title: "Intrinsic Valuation Multiples",
    subtitle: "Valuation Logic",
    definition: "Valuation is the process of determining the present value of an asset. It is a bridge between current price and future earnings potential.",
    whyItMatters: "Buying a great company at a terrible price is a bad investment. Valuation helps us identify 'Surgical Entry Points.'",
    keyTakeaway: "Don't look at P/E in a vacuum. A high P/E (e.g., 60x) is 'cheap' if the earnings are growing at 100% (PEG < 1.0). Always cross-reference multiple to growth.",
    pitfalls: ["Trailing P/E looking cheap because of a past peak that won't repeat.", "Ignoring 'hidden' liabilities like pension obligations."],
  },
  DCF_MODEL: {
    title: "Intrinsic Equity Value (DCF Model)",
    subtitle: "Discounted Cash Flow (DCF)",
    definition: "A valuation method that estimates the value of an investment based on its expected future cash flows, discounted back to their present value using a discount rate.",
    whyItMatters: "It is the gold standard of fundamental analysis. It teaches that a company is worth exactly the sum of its future cash flows, discounted for the time-value of money.",
    keyTakeaway: "Intrinsic value is highly sensitive to input growth rates and discount rates. A 1% change in discount rate can shift the value by 15-20%. Always use conservative projections.",
    formula: "Intrinsic Value = Sum[ CF_t / (1 + r)^t ] + Terminal Value / (1 + r)^N",
    lookback: "10-Year free cash flow forecasts, weighted average cost of capital (WACC) as discount rate.",
    pitfalls: ["Garbage in, garbage out: Overestimating growth rates yields falsely high valuations.", "Underestimating Capex requirements for capital-intensive companies."]
  },
  GRAHAM_NUMBER: {
    title: "Defensive Book-Value Ceiling (Graham Number)",
    subtitle: "Graham Number",
    definition: "A formula developed by Benjamin Graham, the father of value investing, that calculates the maximum price a defensive investor should pay for a stock.",
    whyItMatters: "It sets a hard mathematical limit based on tangible assets (Book Value) and actual earnings, ignoring hype and abstract future growth projections.",
    keyTakeaway: "When a stock trades below its Graham Number, it possesses a deep 'Margin of Safety'. This is typical for undervalued value stocks with heavy assets.",
    formula: "Graham Number = Sqrt( 22.5 * EPS * Book Value Per Share )",
    lookback: "Trailing 12-Month (TTM) EPS and latest quarterly Balance Sheet Book Value.",
    pitfalls: ["Useless for asset-light software or biotech companies with high R&D and low physical assets.", "Assumes a static multiplier (22.5) which may not apply to modern sectors."]
  },
  PETER_LYNCH: {
    title: "PEG-Based Fair Value Ceiling (Lynch Model)",
    subtitle: "Peter Lynch Fair Value",
    definition: "A valuation model popularized by legendary manager Peter Lynch that sets fair value as equal to the company's historical earnings growth rate multiplied by its EPS.",
    whyItMatters: "It adjusts valuation multiples based on growth. A PE of 20 is fair for a company growing at 20%, but expensive for one growing at 5%.",
    keyTakeaway: "A valuation score above the current price suggests the company's growth rate is high relative to its multiple. The model identifies growth at a reasonable price (GARP).",
    formula: "Lynch Fair Value = PEG_Target (1.0) * Earnings Growth Rate * TTM EPS",
    lookback: "3-Year to 5-Year average annualized historical earnings growth rate.",
    pitfalls: ["High past growth rates cannot be recursively extrapolated forever.", "Fails during cyclical down-years where growth temporarily drops to negative."]
  },
  PE_RATIO: {
    title: "Equity Valuation Multiples (P/E Ratio)",
    subtitle: "P/E Ratio",
    definition: "A ratio measuring the current share price relative to its per-share earnings. It represents how much the market is willing to pay for $1 of the company's profit.",
    whyItMatters: "It is the most popular metric for quick value comparisons. It reveals market optimism: new PE means high expectations; low PE indicates pessimism or distress.",
    keyTakeaway: "P/E must be compared to peers in the same industry. Comparing a software P/E to a utility P/E is a category error due to different capital structures and margins.",
    formula: "P/E = Share Price / Earnings Per Share (EPS)",
    lookback: "Trailing 12 Months (TTM) or 1-Year Forward projections.",
    pitfalls: ["EPS can be manipulated via share buybacks, one-time accounting write-offs, or tax adjustments.", "Trailing P/E fails to account for forward structural declines."]
  },
  DEBT_EQUITY: {
    title: "Financial Leverage Gauge (Debt/Equity)",
    subtitle: "Debt-to-Equity Ratio",
    definition: "A leverage ratio comparing a company's total liabilities to its shareholder equity. It shows how much the company relies on debt to finance operations.",
    whyItMatters: "High debt increases fixed interest expenses, raising bankruptcy risk. In high-rate environments, refinancing debt degrades operating profit.",
    keyTakeaway: "A Debt-to-Equity ratio under 1.0 is highly stable. Ratios above 2.0 require careful analysis of cash flows to ensure interest coverage.",
    formula: "Debt/Equity = Total Liabilities / Shareholders' Equity",
    lookback: "Latest quarterly balance sheet filings.",
    pitfalls: ["Some stable industries (utilities, telecom) safely operate with high leverage due to utility cash flows.", "Does not show cash reserves: a company with high debt but massive cash piles is highly solvent."]
  },
  DIVIDEND_YIELD: {
    title: "Capital Distribution Yield",
    subtitle: "Dividend Yield & Payout",
    definition: "The financial ratio of a company's annual dividend payouts divided by its share price. Represents the cash return on investment independent of stock price changes.",
    whyItMatters: "Crucial for cash flow and defensive income investors. Provides a steady yield, stabilizing portfolio volatility.",
    keyTakeaway: "High yields (> 8%) can be a trap. If the stock price falls, the yield percentage rises artificially. Check the Payout Ratio to ensure cash flows can cover the dividend.",
    formula: "Dividend Yield = Annual Dividend Per Share / Share Price",
    lookback: "Trailing 12 Months (TTM) of declared dividends.",
    pitfalls: ["High payout ratios (> 80%) mean the company is returning almost all cash, leaving little for internal growth or debt repayment.", "Dividends can be cut at any time by board decisions."]
  },
  WEIGHTED_RETURN: {
    title: "Weighted Portfolio Return",
    subtitle: "Capital Allocation Performance",
    definition: "The average return of the portfolio, where the return of each asset is weighted by its relative size (allocation percentage) in the portfolio.",
    whyItMatters: "Simple average returns are misleading. Weighted returns reflect the actual performance of your capital allocation decisions by accounting for position sizing.",
    keyTakeaway: "A high simple return with a low weighted return means your biggest positions are underperforming, while small positions are doing the heavy lifting.",
    formula: "Weighted Return = Sum( w_i * R_i ), where w_i is weight and R_i is asset return.",
    lookback: "Calculated based on current holding weights and historical purchase costs.",
    pitfalls: ["Does not reflect cash drag (uninvested cash cushions).", "Can skew portfolio health if a single micro-cap asset has an anomalous return."]
  },
  PORTFOLIO_WIN_RATE: {
    title: "Portfolio Win Rate",
    subtitle: "Allocation Hit Ratio",
    definition: "The percentage of active positions in the portfolio that are currently trading above their average purchase cost (positive P&L).",
    whyItMatters: "It measures the consistency of your asset selection. However, a high win rate does not guarantee profitability if losses on losing trades exceed gains.",
    keyTakeaway: "Aim for a high win rate, but always evaluate it alongside the average Win/Loss size ratio. A 40% win rate can be highly profitable if wins are large.",
    formula: "Win Rate = ( Number of Winning Positions / Total Number of Positions ) * 100",
    lookback: "Computed dynamically across all active positions in the holdings database.",
    pitfalls: ["Ignores the magnitude of gains and losses.", "Holding onto 'paper losses' to artificially inflate the win rate (Disposition Effect)."]
  },
  TRADING_VOLUME: {
    title: "Trading Volume & Liquidity",
    subtitle: "Market Liquidity Statistics",
    definition: "The total number of shares transacted for a security during a given trading period, representing the depth of market interest and liquidity.",
    whyItMatters: "High volume indicates institutional interest and tight bid-ask spreads, reducing transaction costs and execution slippage.",
    keyTakeaway: "Always check volume alongside price breakouts. A breakout on low volume is historically prone to failure (bull trap); breakouts on high volume confirm trend momentum.",
    formula: "Volume = Sum of all transacted shares during daily trading intervals.",
    lookback: "Standard 30-day average comparison.",
    pitfalls: ["High volume can occur during panic selling or liquidation, indicating stress rather than value.", "Illiquid penny stocks are subject to volume manipulation."]
  },
  MARKET_CAP: {
    title: "Market Capitalization",
    subtitle: "Equity Scale Classification",
    definition: "The total dollar market value of a company's outstanding shares of stock, reflecting its size as defined by the market.",
    whyItMatters: "It determines the investment classification (Mega, Large, Mid, Small Cap) and index weighting (e.g. S&P 500 cap-weighted structure).",
    keyTakeaway: "Focus on sector classification: Mega-cap stocks offer stability but lower growth speed; small-cap stocks offer higher growth upside but suffer from volatility and bankruptcy risk.",
    formula: "Market Capitalization = Share Price * Total Outstanding Shares",
    lookback: "Updated in real-time based on live tick trading price.",
    pitfalls: ["Does not represent enterprise value: a company with high market cap but massive debt has a higher enterprise valuation.", "Outstanding shares can fluctuate due to buybacks and dilutions."]
  }
};

export const QUANT_DEEP_DIVES: Record<string, DeepInsight> = {
  REGIME_BETA: {
    title: "Ex-Ante Systematic Risk (Beta / β)",
    subtitle: "Systematic Market Sensitivity",
    definition: "Beta measures the volatility of an individual asset's returns relative to the systematic volatility of a market benchmark (S&P 500 ETF: SPY).",
    whyItMatters: "It helps investors understand the directional leverage of an asset. A Beta > 1.0 indicates higher volatility and movement amplification; a Beta < 1.0 indicates a defensive asset with muted moves.",
    keyTakeaway: "Beta changes based on market regimes. A high beta stock offers high rewards during bull runs but presents deep drawdown risk during corrections.",
    formula: "Beta = Covariance(R_asset, R_benchmark) / Variance(R_benchmark)",
    lookback: "252 trading days of aligned daily log-returns (ln(P_t / P_t-1)).",
    pitfalls: ["Historical Beta might not predict future Beta if company fundamentals shift.", "Beta is highly sensitive to the choice of benchmark (SPY vs. Nasdaq)."]
  },
  JENSENS_ALPHA: {
    title: "Risk-Adjusted Excess Return (Jensen's Alpha / α)",
    subtitle: "Risk-Adjusted Excess Performance",
    definition: "Jensen's Alpha measures the average excess return of an asset or portfolio above the return predicted by the Capital Asset Pricing Model (CAPM), given the asset's Beta and market returns.",
    whyItMatters: "It answers the question: Is the active manager or AI model actually adding value, or is the return just a result of taking on higher market risk (Beta)?",
    keyTakeaway: "A positive Alpha (> 0) means the asset outperformed on a risk-adjusted basis. A negative Alpha (< 0) indicates underperformance given the risk exposure.",
    formula: "Alpha = R_p - [R_f + Beta * (R_m - R_f)]",
    lookback: "Daily log-returns annualized over 252 trading days; Risk-free rate (R_f) capped at 4.0% standard.",
    pitfalls: ["Alpha calculations assume a static Beta over the lookback window.", "Heavily dependent on an accurate risk-free rate assumption."]
  },
  MONTE_CARLO: {
    title: "Stochastic Price Projection (Monte Carlo)",
    subtitle: "Stochastic Price Pathways",
    definition: "A statistical simulation modeling 5,000 potential future asset price trajectories using Geometric Brownian Motion (GBM) based on historical trend drift and price variance.",
    whyItMatters: "Markets are probabilistic, not deterministic. Rather than predicting a single target, Monte Carlo maps the probability distribution of future outcomes to identify extreme risk boundaries.",
    keyTakeaway: "Focus on the boundaries: the 5th percentile (Bear case / p10) shows the support envelope where price has a 95% chance of staying above, while the 95th percentile (Bull case / p90) shows the resistance boundary.",
    formula: "S_t = S_0 * exp((μ - σ²/2)*dt + σ*sqrt(dt)*Z), where Z ~ N(0,1)",
    lookback: "30-day historical log-returns covariance. 5,000 recursive simulated paths.",
    pitfalls: ["Assumes returns are normally distributed (ignores fat-tail risks and flash crash black swans).", "Drift (μ) is based on historical performance, which may not continue."]
  },
  KALMAN_EQUILIBRIUM: {
    title: "State-Space Price Equilibrium (Kalman Filter)",
    subtitle: "Recursive Linear Trend Filtering",
    definition: "A state-space model that recursively estimates the true underlying value of an asset by separating long-term signal trends from high-frequency market noise.",
    whyItMatters: "Traditional moving averages (like SMA or EMA) lag behind price. The Kalman Filter dynamically adjusts its gain based on real-time volatility, reacting instantly to trend shifts with zero lag.",
    keyTakeaway: "When the live price falls below the Kalman Equilibrium, the asset is statistically discounted relative to its smoothed trend; when above, it is trading at a premium.",
    formula: "State Transition: X_k = A*X_k-1 + w_k | Measurement: Z_k = H*X_k + v_k",
    lookback: "Calculated dynamically over tick data, process noise Q=1e-4, measurement noise R=1e-2.",
    pitfalls: ["During extreme regime shifts or news announcements, the filter can temporarily over-fit the noise.", "Requires tuning of Q and R matrices to prevent lagging or over-sensitivity."]
  },
  CONFLUENCE_SCORE: {
    title: "Cross-Factor Confluence Index",
    subtitle: "Cross-Indicator Signal Alignment",
    definition: "A proprietary index score (0-100) evaluating the alignment of multiple technical signals (RSI, MACD, Bollinger Bands, and Moving Average crossings) combined with AI sentiment velocity.",
    whyItMatters: "Single indicators frequently trigger false signals. A high confluence score (> 75) proves that multiple independent dimensions of market structure are confirming the same directional trend.",
    keyTakeaway: "Scores above 75 indicate strong bullish alignment; scores below 25 indicate strong bearish alignment. Mid-ranges (30-65) signify consolidation and trendlessness.",
    formula: "Score = weighted_average(RSI_alignment + MACD_trend + BB_deviation + AI_sentiment_velocity)",
    lookback: "Evaluated dynamically over the active trading window.",
    pitfalls: ["High confluence does not guarantee trend continuation (e.g., in a surprise earnings event).", "Indicators can remain in overbought/oversold clusters for extended periods."]
  },
  VALUE_AT_RISK: {
    title: "Parametric 1-Day 95% Value-at-Risk (VaR)",
    subtitle: "Institutional Downside Risk Threshold",
    definition: "A statistical metric that estimates the maximum potential loss in value of a portfolio over a 1-day time horizon at a 95% confidence level, under normal market conditions.",
    whyItMatters: "It answers the question: What is the worst-case dollar or percentage loss I can expect to experience tomorrow with 95% certainty?",
    keyTakeaway: "A 95% Daily VaR of 2.5% means there is a 95% probability the portfolio will not lose more than 2.5% of its value in a single day, leaving a 5% chance of a greater loss.",
    formula: "VaR_95% = 1.645 * StdDev_Daily_Returns",
    lookback: "Annualized daily returns standard deviation (252-day window).",
    pitfalls: ["Parametric VaR assumes a normal distribution, ignoring 'fat tails' and black swan market crashes.", "Past volatility does not guarantee future risk limits during regime breaks."]
  },
  PORTFOLIO_CORRELATION: {
    title: "Systemic Asset Covariance Matrix",
    subtitle: "Systemic Diversification Analytics",
    definition: "A statistical grid mapping the correlation coefficients between the daily returns of all assets in a portfolio, ranging from -1.0 (perfect opposite) to +1.0 (perfect lockstep).",
    whyItMatters: "True diversification is not about how many stocks you own, but how they move together. Highly correlated assets increase systematic portfolio risk.",
    keyTakeaway: "Correlation scores above +0.85 indicate assets move in lockstep, offering no diversification benefit. Look for uncorrelated assets (< +0.30) to smooth drawdowns.",
    formula: "Correlation (X,Y) = Covariance(X,Y) / ( StdDev(X) * StdDev(Y) )",
    lookback: "252 trading days of aligned price change vectors.",
    pitfalls: ["During extreme market panics, correlations tend to converge to +1.0 as investors dump all assets.", "Correlation is dynamic and shifts over time as macro drivers change."]
  },
  ANNUALIZED_VOLATILITY: {
    title: "Annualized Realized Volatility (σ)",
    subtitle: "Asset Price Standard Deviation",
    definition: "A statistical measurement of the dispersion of returns for a given asset over a 1-year lookback, representing the historical volatility rate of price action.",
    whyItMatters: "Volatility represents systemic asset uncertainty. High volatility indicates large swing potential in both directions; low volatility indicates stable, predictable movements.",
    keyTakeaway: "Annualized volatility allows direct risk comparison between asset classes (e.g. comparing Bitcoin's 60% volatility to Apple's 20% volatility).",
    formula: "Volatility_Annualized = StdDev(Daily_Returns) * Sqrt(252)",
    lookback: "Daily log-return volatility scaled over 252 trading days.",
    pitfalls: ["Volatility does not distinguish between upside price rallies and downside liquidations.", "Historical volatility does not capture future implied pricing jumps (e.g., pre-earnings)."]
  },
  TTM_SQUEEZE: {
    title: "Volatility Compression Index (TTM Squeeze)",
    subtitle: "Volatility Compression Indicator",
    definition: "A technical indicator that identifies periods of volatility compression. Triggered when Bollinger Bands (representing short-term price variance) compress inside Keltner Channels.",
    whyItMatters: "Market trends alternate between periods of low volatility (compression) and high volatility (expansion). A squeeze indicates price is store-housing energy for an explosive move.",
    keyTakeaway: "A red dot indicates the squeeze is active (compressed). A green dot indicates the squeeze has fired (releasing volatility). Combine with momentum to find the breakout direction.",
    formula: "Bollinger Bands Width < Keltner Channel Width",
    lookback: "20-Period standard lookback window.",
    pitfalls: ["Squeezes can fire false breakouts in one direction before reversing sharply.", "Fails during flat, trendless macro environments."]
  },
  HURST_EXPONENT: {
    title: "Trend Persistence Index (Hurst Exponent / H)",
    subtitle: "Trend Persistence & Fractal Dimension",
    definition: "A statistical measure of long-term memory of time series. It evaluates if price action is mean-reverting (H < 0.5), trending/persistent (H > 0.5), or random walk noise (H = 0.5).",
    whyItMatters: "It prevents traders from using the wrong indicators: RSI is highly effective in mean-reverting regimes ($H < 0.5$), while moving average trend-following works best in persistent regimes ($H > 0.5$).",
    keyTakeaway: "A Hurst Exponent > 0.65 suggests an extremely strong structural momentum, meaning price breakouts are highly likely to persist rather than revert.",
    formula: "Calculated via Rescaled Range Analysis: R/S = c * T^H",
    lookback: "Aligned price logs spanning 126 to 252 historical periods.",
    pitfalls: ["Historical persistence can flip instantly during unexpected company announcements or macro shocks.", "Mathematically complex and prone to estimation error on small data sequences."]
  },
  VOLUME_PROFILE_POC: {
    title: "Volume-Weighted Point of Control (POC)",
    subtitle: "Maximum Liquidity Node",
    definition: "The specific price level where the highest volume of shares was transacted over a defined lookback window.",
    whyItMatters: "It represents the 'fair value consensus' of the market. Because volume is heaviest here, the POC acts as a strong statistical gravity magnet, attracting prices back to it.",
    keyTakeaway: "Prices trading far from the POC in a mean-reverting environment will experience a 'pull back' to this liquidity node. In trending markets, the POC acts as major support/resistance.",
    formula: "POC = Price Level with Max(Volume_at_Price)",
    lookback: "Aligned volume vectors over 250 daily trading bars.",
    pitfalls: ["Old POC levels lose significance if company margins change structurally.", "Can shift rapidly if massive institutional volume prints at new levels."]
  },
  SENTIMENT_VELOCITY: {
    title: "Narrative Sentiment Velocity",
    subtitle: "Narrative Acceleration Index",
    definition: "An index measuring the rate of change and acceleration in financial news sentiment, earnings call transcripts, and corporate disclosures.",
    whyItMatters: "Price follows narrative shifts. A sudden acceleration in positive sentiment (high velocity) often precedes institutional buying volume.",
    keyTakeaway: "Watch for sentiment-price divergences. If price is falling but sentiment velocity is accelerating upward, a bullish reversal is statistically likely.",
    formula: "Velocity = Delta(Sentiment_Score) / Time_Delta",
    lookback: "Rolling 7-day to 14-day NLP sentiment vectors.",
    pitfalls: ["AI sentiment scanners can misinterpret sarcasm, double negatives, or technical industry jargon in disclosures.", "News velocity spikes can be short-lived reactions to noise."]
  },
  SHARPE_RATIO: {
    title: "Risk-Adjusted Return Index (Sharpe Ratio)",
    subtitle: "Risk-Adjusted Performance Index",
    definition: "A metric calculating the excess return of an asset per unit of total volatility, relative to a risk-free benchmark.",
    whyItMatters: "Answers if the asset's earnings are high enough to justify its daily price swings. Helps compare assets with different risk profiles.",
    keyTakeaway: "A Sharpe ratio above 1.0 is adequate, above 2.0 is very good, and above 3.0 is exceptional. A low Sharpe means you are taking high risk for low returns.",
    formula: "Sharpe = (R_p - R_f) / Volatility_p",
    lookback: "Annualized log returns standard deviation.",
    pitfalls: ["Can be distorted by anomalous high outlier returns.", "Assumes volatility is the only measure of risk, ignoring tail risks."]
  },
  SORTINO_RATIO: {
    title: "Downside Deviation-Adjusted Ratio (Sortino Ratio)",
    subtitle: "Downside Volatility Efficiency",
    definition: "Similar to Sharpe, but only divides excess return by downside deviation (ignoring positive volatility spikes).",
    whyItMatters: "Investors like upward swings. Sharpe penalizes positive volatility, whereas Sortino only penalizes negative volatility, making it a better reflection of 'bad' risk.",
    keyTakeaway: "A Sortino above 2.0 indicates high efficiency in generating gains while limiting downside drawdown risk.",
    formula: "Sortino = (R_p - R_f) / Downside_Deviation",
    lookback: "Annualized downside standard deviation.",
    pitfalls: ["Assumes past negative volatility patterns persist in future regimes.", "Less reliable for short data samples."]
  },
  MAX_DRAWDOWN: {
    title: "Peak-to-Trough Capital Loss (Max Drawdown)",
    subtitle: "Peak-to-Trough Capital Loss",
    definition: "The maximum observed peak-to-trough drop in value of an asset or portfolio, before a new peak is achieved.",
    whyItMatters: "Represents the historical worst-case scenario. Essential for understanding capital impairment risk and psychological survivability.",
    keyTakeaway: "A high drawdown (> 30%) requires massive returns to break even (e.g. a 50% drop requires a 100% gain to recover). Always size positions to survive maximum drawdowns.",
    formula: "Max Drawdown = (Trough Value - Peak Value) / Peak Value",
    lookback: "1-Year trailing daily price vectors.",
    pitfalls: ["Does not indicate how long it takes to recover from the trough.", "A historical drawdown can always be breached by a future crash."]
  },
  CONCENTRATION_HHI: {
    title: "Herfindahl-Hirschman Concentration Index (HHI)",
    subtitle: "Portfolio Concentration Metrics",
    definition: "A mathematical measure of concentration risk calculated by summing the squared percentage weights of all holdings in the portfolio.",
    whyItMatters: "High concentration increases single-stock tail risk. HHI helps quantify whether risk is distributed or clustered in a few large positions.",
    keyTakeaway: "An HHI below 1,500 indicates a diversified portfolio. 1,500 to 2,500 is moderately concentrated, and above 2,500 indicates high concentration risk requiring active monitoring.",
    formula: "HHI = Sum( w_i^2 ) for all weights w_i expressed as whole percentages (0-100).",
    lookback: "Evaluated dynamically over the current active portfolio weights.",
    pitfalls: ["Does not account for correlation: holding three highly correlated tech stocks yields a low HHI but high systemic risk.", "Squared weighting heavily penalizes high-conviction positions."]
  },
  GAMMA_EXPOSURE: {
    title: "Net Dealer Gamma Exposure (GEX)",
    subtitle: "Option Market Liquidity & Volatility Gravity",
    definition: "An options market metric quantifying the total dollar value of index or stock movement that market makers must buy or sell to remain delta-neutral, reflecting dealer positioning.",
    whyItMatters: "High GEX acts as a stabilizer (volatility dampener) because dealers buy dips and sell rallies. Negative GEX accelerates volatility because dealers must trade in the direction of the trend (short-gamma positioning).",
    keyTakeaway: "Zero Gamma level is the 'Flip Line' where market dynamics switch from low volatility (above flip) to high volatility (below flip). Strikes with massive GEX concentrations act as price gravity magnets.",
    formula: "Dealer Gamma = Position Gamma * Open Interest * Contract Multiplier (100).",
    lookback: "Calculated dynamically across active option chains and open interest metrics.",
    pitfalls: ["Assumes option market makers are always short retail puts and long retail calls, which may not hold during rapid flow transitions.", "Does not predict direction directly, only the expected volatility velocity of a move."]
  }
};
