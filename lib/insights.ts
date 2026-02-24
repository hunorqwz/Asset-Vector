/**
 * ASSET VECTOR | SURGICAL KNOWLEDGE BASE
 * Standardized explanations for complex financial metrics to turn the app into a learning platform.
 */

export interface MetricInsight {
  label: string;
  shortDesc: string;
  context: string;
  idealRange?: string;
}

export const METRIC_INSIGHTS: Record<string, MetricInsight> = {
  trailingPE: {
    label: "Trailing P/E",
    shortDesc: "Price relative to the last 12 months of profit.",
    context: "Indicates how many dollars investors are paying for $1 of current profit. High growth stocks usually have higher P/Es as the market expects future earnings to justify the current price.",
    idealRange: "Varies by sector (15-25 is average)"
  },
  forwardPE: {
    label: "Forward P/E",
    shortDesc: "Price relative to expected profit next year.",
    context: "A more surgical look at value. If Forward P/E is significantly lower than Trailing P/E, analysts expect the company's profit to grow significantly.",
  },
  pegRatio: {
    label: "PEG Ratio",
    shortDesc: "P/E divided by growth rate.",
    context: "Standardizes P/E by accounting for growth. A PEG of 1.0 means the P/E is perfectly in line with growth. Below 1.0 is often considered undervalued for its growth speed.",
    idealRange: "< 1.0 is favorable"
  },
  grossMargins: {
    label: "Gross Margin",
    shortDesc: "Profit kept after production costs.",
    context: "The 'purest' measure of product value. Higher margins mean the company has strong 'pricing power' and isn't just competing on price.",
    idealRange: "> 40% is strong for Tech"
  },
  profitMargins: {
    label: "Profit Margin",
    shortDesc: "Net income as a % of total revenue.",
    context: "How much of every $1 of sales reaches the bottom line. It accounts for all costs: taxes, interest, and operations.",
  },
  debtToEquity: {
    label: "Debt / Equity",
    shortDesc: "Total debt relative to shareholder value.",
    context: "Measures financial leverage. High values mean the company is funded heavily by debt. While efficient in bull markets, it adds risk during downturns.",
    idealRange: "< 2.0 is generally safe"
  },
  currentRatio: {
    label: "Current Ratio",
    shortDesc: "Short-term assets vs short-term debts.",
    context: "A liquidity 'survival' test. Can the company pay its bills for the next 12 months using only current assets? Above 1.0 is a pass; below 1.0 suggests a cash crunch.",
    idealRange: "> 1.5 is healthy"
  },
  beta: {
    label: "Beta (5Y)",
    shortDesc: "Comparison of volatility to the S&P 500.",
    context: "A Beta of 1.0 means the stock moves exactly with the market. > 1.0 (like NVDA at 2.3) means it is much more volatile. Useful for sizing your position risk.",
  },
  revenueGrowth: {
    label: "Revenue Growth",
    shortDesc: "Year-over-year increase in sales.",
    context: "The 'Top Line' speedometer. Sustained growth above 20% is typical of compounders; triple-digit growth (like NVDA) is rare and usually driven by massive paradigm shifts.",
  }
};
