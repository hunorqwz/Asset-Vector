export interface DCFParams {
  fcf: number;
  growthRateStage1: number; // Years 1-5
  growthRateStage2: number; // Years 6-10
  discountRate: number;
  terminalGrowthRate: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  projectionYears: number; // Usually 10
}

export interface DCFResult {
  intrinsicValue: number;
  enterpriseValue: number;
  equityValue: number;
  projectedFCFs: { year: number; fcf: number; pv: number }[];
  terminalValue: number;
  pvOfTerminalValue: number;
  isValid: boolean;
}

/**
 * Validates variables and returns a safe empty DCF object on failure.
 */
function createEmptyDCFResult(): DCFResult {
  return {
    intrinsicValue: 0,
    enterpriseValue: 0,
    equityValue: 0,
    projectedFCFs: [],
    terminalValue: 0,
    pvOfTerminalValue: 0,
    isValid: false
  };
}

/**
 * 1. DISCOUNTED CASH FLOW (DCF) MODEL
 * 
 * Calculates the present value of expected future cash flows over a 10-year period,
 * then adds a terminal value (using the Gordon Growth Model) discounted back to today.
 * Extremely rigid but highly accurate for mature companies with predictable cash flow.
 */
export function calculateDCF(params: DCFParams): DCFResult {
  const projectedFCFs = [];
  let sumPvs = 0;
  let currentFCF = params.fcf;

  // Strict boundary checks to prevent infinity or negative equity anomalies
  if (params.discountRate <= params.terminalGrowthRate) {
    return createEmptyDCFResult();
  }
  if (!params.sharesOutstanding || params.sharesOutstanding <= 0) {
    return createEmptyDCFResult();
  }

  // Calculate Present Value of Free Cash Flows for Years 1-10
  for (let i = 1; i <= params.projectionYears; i++) {
    const growthRate = i <= 5 ? params.growthRateStage1 : params.growthRateStage2;
    currentFCF = currentFCF * (1 + growthRate);
    const pv = currentFCF / Math.pow(1 + params.discountRate, i);
    
    projectedFCFs.push({ year: i, fcf: currentFCF, pv });
    sumPvs += pv;
  }

  // Terminal Value (Gordon Growth Model) based on year N+1 FCF
  const terminalFCF = currentFCF * (1 + params.terminalGrowthRate);
  const terminalValue = terminalFCF / (params.discountRate - params.terminalGrowthRate);
  
  // Present Value of the Terminal Value
  const pvOfTerminalValue = terminalValue / Math.pow(1 + params.discountRate, params.projectionYears);

  // Sum everything to get Enterprise Value, add net cash to get Equity Value
  const enterpriseValue = sumPvs + pvOfTerminalValue;
  const equityValue = enterpriseValue + params.cash - params.debt;
  
  const intrinsicValue = equityValue / params.sharesOutstanding;

  // Final check to ensure the math didn't trigger an edge case breakdown
  const isValid = intrinsicValue > 0 && Number.isFinite(intrinsicValue);

  return {
    intrinsicValue: isValid ? intrinsicValue : 0,
    enterpriseValue,
    equityValue,
    projectedFCFs,
    terminalValue,
    pvOfTerminalValue,
    isValid
  };
}

/**
 * 2. BENJAMIN GRAHAM FAIR VALUE
 * 
 * Developed by Warren Buffett's mentor, Benjamin Graham. Identifies the absolute 
 * maximum price a defensive value investor should pay. It heavily penalizes companies 
 * with no physical assets (book value) or negative earnings.
 * 
 * Formula: √(22.5 × EPS × Book Value Per Share)
 * Where 22.5 is derived from Graham's rule: P/E should not exceed 15, and P/B should not exceed 1.5 (15 * 1.5 = 22.5).
 */
export function calculateGrahamNumber(eps: number | null, bvps: number | null): { value: number, isValid: boolean } {
  if (eps === null || bvps === null) return { value: 0, isValid: false };

  // Graham strictly avoids negative earnings or negative book value
  if (eps <= 0 || bvps <= 0) return { value: 0, isValid: false };

  // The base Graham Multiplier is 22.5
  const intrinsicValue = Math.sqrt(22.5 * eps * bvps);

  return {
    value: Number.isFinite(intrinsicValue) ? intrinsicValue : 0,
    isValid: Number.isFinite(intrinsicValue) && intrinsicValue > 0
  };
}

/**
 * 3. PETER LYNCH FAIR VALUE
 * 
 * Developed by legendary Fidelity Magellan fund manager Peter Lynch. This model assumes
 * a "Fairly Valued" company trades at a P/E multiple equal to its growth rate (PEG ratio of 1).
 * Excellent for valuing high-growth tech stocks where DCF requires speculative 10-year assumptions.
 * 
 * Formula: (Earnings Growth Rate % as integer × EPS)
 * Note: Growth rate is expected as a decimal (e.g., 0.15 for 15%). We floor the effective 
 * growth multiple to 5 and cap it at 40 to prevent extreme valuations.
 */
export function calculatePeterLynchFairValue(eps: number | null, growthRatePct: number | null): { value: number, isValid: boolean } {
  if (eps === null || growthRatePct === null || eps <= 0) {
    return { value: 0, isValid: false };
  }

  // Convert decimal to percentage integer for the Lynch formula (0.15 -> 15)
  let growthMultiple = growthRatePct * 100;

  // Peter Lynch bounds (Multiples): 
  // - Growth under 5% (0.05) is practically dead money, assign a baseline multiple of 5
  // - Infinite extrapolation of >40% (0.40) growth is dangerous, cap the multiple at 40
  if (growthMultiple < 5) growthMultiple = 5;
  if (growthMultiple > 40) growthMultiple = 40;

  const value = eps * growthMultiple;

  return {
    value: Number.isFinite(value) ? value : 0,
    isValid: Number.isFinite(value) && value > 0
  };
}
