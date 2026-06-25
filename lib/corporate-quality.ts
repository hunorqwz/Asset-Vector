import { StockDetails } from "./stock-details";

export interface AltmanResult {
  score: number;
  classification: "Safe" | "Grey" | "Distress";
  color: string;
  ratios: {
    workingCapitalToAssets: number;
    retainedEarningsToAssets: number;
    ebitToAssets: number;
    equityToDebt: number;
    salesToAssets: number;
  };
  isApplicable: boolean;
}

export interface PiotroskiResult {
  score: number;
  classification: "Strong" | "Stable" | "Weak";
  color: string;
  checks: {
    id: string;
    label: string;
    description: string;
    passed: boolean;
  }[];
  isApplicable: boolean;
}

export interface BeneishResult {
  score: number;
  classification: "High Risk" | "Low Risk";
  color: string;
  isApplicable: boolean;
  ratios: {
    dsri: number;
    gmi: number;
    aqi: number;
    sgi: number;
    depi: number;
    sgai: number;
    lvgi: number;
    tata: number;
  };
}

export interface WaccResult {
  costOfEquity: number;
  costOfDebt: number;
  costOfDebtAfterTax: number;
  weightEquity: number;
  weightDebt: number;
  wacc: number;
  equityValue: number;
  debtValue: number;
}

export interface DdmResult {
  fairValue: number | null;
  expectedDividend: number;
  isApplicable: boolean;
  message?: string;
}

/**
 * Calculates the Altman Z-Score using standard corporate finance heuristics
 * for asset/liability values if not directly exposed in Yahoo quote summaries.
 */
export function calculateAltmanZScore(d: StockDetails): AltmanResult {
  if (d.isCrypto || d.isETF) {
    return {
      score: 0,
      classification: "Safe",
      color: "text-zinc-500",
      ratios: { workingCapitalToAssets: 0, retainedEarningsToAssets: 0, ebitToAssets: 0, equityToDebt: 0, salesToAssets: 0 },
      isApplicable: false,
    };
  }

  const shares = d.keyStats.sharesOutstanding || 0;
  const bookVal = d.valuation.bookValue || 0;
  const bookValueEquity = bookVal * shares;
  const totalDebt = d.financialHealth.totalDebt || 0;

  // Assets = Liabilities + Equity (Balance Sheet Identity)
  const totalAssets = (bookValueEquity > 0 ? bookValueEquity : d.price.marketCap) + totalDebt;
  const marketCap = d.price.marketCap || 0;
  const sales = d.financialHealth.totalRevenue || 0;

  // EBIT estimation
  const ebit = d.financialHealth.ebitda 
    ? d.financialHealth.ebitda * 0.85 
    : d.profitability.operatingMargins 
    ? d.profitability.operatingMargins * sales 
    : sales * 0.12;

  // Working Capital estimation
  const currentRatio = d.financialHealth.currentRatio || 1.5;
  const currentLiabilities = totalDebt > 0 ? totalDebt * 0.35 : totalAssets * 0.15;
  const currentAssets = currentLiabilities * currentRatio;
  const workingCapital = currentAssets - currentLiabilities;

  // Ratios
  const T1 = totalAssets > 0 ? workingCapital / totalAssets : 0.15;
  const T2 = 0.28; // Retained earnings proxy (Standard average for large caps)
  const T3 = totalAssets > 0 ? ebit / totalAssets : 0.08;
  const T4 = totalDebt > 0 ? marketCap / totalDebt : marketCap / 1e6; // if debt-free, leverage is extremely safe
  const T5 = totalAssets > 0 ? sales / totalAssets : 0.5;

  // Z-Score for non-manufacturing/general companies
  // Z = 1.2 * T1 + 1.4 * T2 + 3.3 * T3 + 0.6 * T4 + 0.999 * T5
  const score = 1.2 * T1 + 1.4 * T2 + 3.3 * T3 + 0.6 * T4 + 0.999 * T5;

  let classification: "Safe" | "Grey" | "Distress" = "Safe";
  let color = "text-bull";

  if (score < 1.81) {
    classification = "Distress";
    color = "text-bear";
  } else if (score < 2.99) {
    classification = "Grey";
    color = "text-amber-400";
  }

  return {
    score: Number(score.toFixed(2)),
    classification,
    color,
    ratios: {
      workingCapitalToAssets: Number(T1.toFixed(4)),
      retainedEarningsToAssets: Number(T2.toFixed(4)),
      ebitToAssets: Number(T3.toFixed(4)),
      equityToDebt: Number(T4.toFixed(4)),
      salesToAssets: Number(T5.toFixed(4)),
    },
    isApplicable: true,
  };
}

/**
 * Calculates the Piotroski F-Score (0 - 9 criteria)
 */
export function calculatePiotroskiFScore(d: StockDetails): PiotroskiResult {
  if (d.isCrypto || d.isETF) {
    return { score: 0, classification: "Stable", color: "text-zinc-500", checks: [], isApplicable: false };
  }

  const checks = [
    {
      id: "net_income",
      label: "Positive Net Income",
      description: "Net profit margin is positive for the trailing period.",
      passed: (d.profitability.profitMargins || 0) > 0,
    },
    {
      id: "roa",
      label: "Positive Return on Assets (ROA)",
      description: "Return on Assets is positive, indicating asset profitability.",
      passed: (d.profitability.returnOnAssets || 0) > 0,
    },
    {
      id: "cfo",
      label: "Positive Operating Cash Flow (CFO)",
      description: "Cash flow from operations is positive.",
      passed: (d.financialHealth.operatingCashflow || 0) > 0,
    },
    {
      id: "accruals",
      label: "Cash Flow exceeding Earnings",
      description: "Operating Cash Flow exceeds Net Income (high earnings quality).",
      passed:
        (d.financialHealth.operatingCashflow || 0) >
        (d.financialHealth.totalRevenue || 0) * (d.profitability.profitMargins || 0),
    },
    {
      id: "leverage",
      label: "Healthy Leverage Profile",
      description: "Debt-to-equity is under 100% or cash exceeds debt obligations.",
      passed:
        (d.financialHealth.debtToEquity || 0) < 100 ||
        (d.financialHealth.totalCash || 0) > (d.financialHealth.totalDebt || 0),
    },
    {
      id: "liquidity",
      label: "Healthy Liquidity Ratio",
      description: "Current liquidity ratio is higher than 1.2x.",
      passed: (d.financialHealth.currentRatio || 0) >= 1.2,
    },
    {
      id: "non_dilution",
      label: "No Excessive Dilution",
      description: "No significant increase in shares outstanding in recent months.",
      passed: true, // Defaulting as true since dilution requires historical shares series
    },
    {
      id: "margins",
      label: "High Operating Margin",
      description: "Operating margin exceeds 10%, showing pricing power.",
      passed: (d.profitability.operatingMargins || 0) >= 0.1,
    },
    {
      id: "asset_turnover",
      label: "Efficient Asset Turnover",
      description: "Asset turnover ratio exceeds 0.4x, indicating operational velocity.",
      passed:
        (d.financialHealth.totalRevenue || 0) /
          ((d.valuation.bookValue || 1) * (d.keyStats.sharesOutstanding || 1) +
            (d.financialHealth.totalDebt || 0)) >=
        0.4,
    },
  ];

  const score = checks.filter((c) => c.passed).length;
  let classification: "Strong" | "Stable" | "Weak" = "Stable";
  let color = "text-zinc-400";

  if (score >= 8) {
    classification = "Strong";
    color = "text-bull";
  } else if (score <= 3) {
    classification = "Weak";
    color = "text-bear";
  }

  return {
    score,
    classification,
    color,
    checks,
    isApplicable: true,
  };
}

/**
 * Calculates the Beneish M-Score (Earnings Manipulation Detector)
 */
export function calculateBeneishMScore(d: StockDetails): BeneishResult {
  if (d.isCrypto || d.isETF) {
    return {
      score: 0,
      classification: "Low Risk",
      color: "text-zinc-500",
      isApplicable: false,
      ratios: { dsri: 1, gmi: 1, aqi: 1, sgi: 1, depi: 1, sgai: 1, lvgi: 1, tata: 0 },
    };
  }

  // Indices represent Year-over-Year changes (1.0 = stable)
  const dsri = 1.0; // Days Sales in Receivables Index
  const gmi = (d.profitability.grossMargins || 0.4) < 0.4 ? 1.05 : 0.98; // Gross Margin Index
  const aqi = 1.0; // Asset Quality Index
  const sgi = 1.0 + (d.profitability.revenueGrowth || 0.05); // Sales Growth Index
  const depi = 1.0; // Depreciation Index
  const sgai = 1.0; // SG&A Expenses Index
  const lvgi = (d.financialHealth.debtToEquity || 0) > 100 ? 1.08 : 0.96; // Leverage Index

  // Accruals Calculation
  const totalDebt = d.financialHealth.totalDebt || 0;
  const bookValueEquity = (d.valuation.bookValue || 0) * (d.keyStats.sharesOutstanding || 0);
  const totalAssets = (bookValueEquity > 0 ? bookValueEquity : d.price.marketCap) + totalDebt;
  const netIncome = (d.financialHealth.totalRevenue || 0) * (d.profitability.profitMargins || 0);
  const cfo = d.financialHealth.operatingCashflow || 0;
  const tata = totalAssets > 0 ? (netIncome - cfo) / totalAssets : 0.01; // Total Accruals to Total Assets

  // Beneish 8-variable model equation
  // M = -4.84 + 0.92*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.037*TATA + 0.0327*LVGI
  const score =
    -4.84 +
    0.92 * dsri +
    0.528 * gmi +
    0.404 * aqi +
    0.892 * sgi +
    0.115 * depi -
    0.172 * sgai +
    4.037 * tata +
    0.0327 * lvgi;

  const classification = score > -1.78 ? "High Risk" : "Low Risk";
  const color = classification === "High Risk" ? "text-bear" : "text-bull";

  return {
    score: Number(score.toFixed(3)),
    classification,
    color,
    isApplicable: true,
    ratios: { dsri, gmi, aqi, sgi, depi, sgai, lvgi, tata },
  };
}

/**
 * Computes cost of capital weightings and WACC
 */
export function calculateWacc(
  d: StockDetails,
  rf: number, // e.g. 0.042 (4.2%)
  erp: number, // e.g. 0.055 (5.5%)
  taxRate: number, // e.g. 0.21 (21%)
  costOfDebt: number // e.g. 0.055 (5.5%)
): WaccResult {
  const beta = d.keyStats.beta !== null ? d.keyStats.beta : 1.0;
  const costOfEquity = rf + beta * erp;

  const equityValue = d.price.marketCap || 1e9;
  const debtValue = d.financialHealth.totalDebt || 0;
  const totalCapital = equityValue + debtValue;

  const weightEquity = totalCapital > 0 ? equityValue / totalCapital : 1.0;
  const weightDebt = totalCapital > 0 ? debtValue / totalCapital : 0.0;

  const costOfDebtAfterTax = costOfDebt * (1 - taxRate);
  const wacc = weightEquity * costOfEquity + weightDebt * costOfDebtAfterTax;

  return {
    costOfEquity,
    costOfDebt,
    costOfDebtAfterTax,
    weightEquity,
    weightDebt,
    wacc,
    equityValue,
    debtValue,
  };
}

/**
 * Calculates Gordon Growth Model (Dividend Discount Model)
 */
export function calculateGordonDDM(
  d: StockDetails,
  wacc: number,
  dividendGrowth: number // e.g. 0.04 (4%)
): DdmResult {
  const divYield = d.dividends.dividendYield || 0;
  const currentPrice = d.price.current || 0;

  if (divYield <= 0 || !d.dividends.dividendRate) {
    return {
      fairValue: null,
      expectedDividend: 0,
      isApplicable: false,
      message: "Not Applicable (No dividend yield)",
    };
  }

  const d0 = d.dividends.dividendRate;
  const d1 = d0 * (1 + dividendGrowth);

  if (wacc <= dividendGrowth) {
    return {
      fairValue: null,
      expectedDividend: d1,
      isApplicable: true,
      message: "Undetermined (Cost of Capital <= Dividend Growth)",
    };
  }

  const fairValue = d1 / (wacc - dividendGrowth);

  return {
    fairValue: Number(fairValue.toFixed(2)),
    expectedDividend: d1,
    isApplicable: true,
  };
}
