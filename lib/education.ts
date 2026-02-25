/**
 * ASSET VECTOR | SURGICAL EDUCATION ENGINE
 * Comprehensive technical and fundamental educational material.
 */

export interface DeepInsight {
  title: string;
  subtitle: string;
  definition: string;
  whyItMatters: string;
  surgicalTake: string;
  pitfalls: string[];
  formula?: string;
}

export const FUNDAMENTAL_DEEP_DIVES: Record<string, DeepInsight> = {
  PROFITABILITY: {
    title: "Profitability Framework",
    subtitle: "The Efficiency Engine",
    definition: "Profitability metrics measure a company's ability to generate earnings relative to its revenue, operating costs, and balance sheet assets.",
    whyItMatters: "A company that can't turn revenue into profit is ultimately unsustainable. We look for 'High-Stability Margins'—companies that maintain profitability even when costs rise.",
    surgicalTake: "Focus on the Delta (change) between Gross and Operating margins. If Gross Margin is stable but Operating Margin is falling, the company's management is likely losing control of administrative costs.",
    pitfalls: ["High net profit driven by one-time asset sales.", "Ignoring R&D expenses in 'adjusted' margins."],
  },
  LIQUIDITY: {
    title: "Solvency & Liquidity",
    subtitle: "The Survival Threshold",
    definition: "Solvency measures a company's long-term ability to meet its debt obligations, while liquidity measures its short-term ability to pay bills.",
    whyItMatters: "Most companies don't go bankrupt because they are unprofitable; they go bankrupt because they run out of cash. In high-interest-rate environments, this becomes the primary risk factor.",
    surgicalTake: "Look for a Debt/Equity ratio below 1.5 in technology and below 2.5 in industrials. A Current Ratio above 1.2 is the 'Safe Haven' threshold for high-velocity assets.",
    pitfalls: ["Relying on 'Current Assets' that are actually unsellable inventory.", "Aggressive debt-to-equity driven by share buybacks."],
  },
  VALUATION: {
    title: "Valuation Logic",
    subtitle: "Price vs. Value Perception",
    definition: "Valuation is the process of determining the present value of an asset. It is a bridge between current price and future earnings potential.",
    whyItMatters: "Buying a great company at a terrible price is a bad investment. Valuation helps us identify 'Surgical Entry Points.'",
    surgicalTake: "Don't look at P/E in a vacuum. A high P/E (e.g., 60x) is 'cheap' if the earnings are growing at 100% (PEG < 1.0). Always cross-reference multiple to growth.",
    pitfalls: ["Trailing P/E looking cheap because of a past peak that won't repeat.", "Ignoring 'hidden' liabilities like pension obligations."],
  }
};
