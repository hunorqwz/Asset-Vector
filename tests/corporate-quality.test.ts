import { describe, expect, it } from 'vitest';
import { StockDetails } from '../lib/stock-details';
import {
  calculateAltmanZScore,
  calculatePiotroskiFScore,
  calculateBeneishMScore,
  calculateWacc,
  calculateGordonDDM,
} from '../lib/corporate-quality';

// Create a helper to construct mock stock details
function createMockStock(overrides: Partial<StockDetails> = {}): StockDetails {
  return {
    ticker: 'AAPL',
    fetchedAt: Date.now(),
    isCrypto: false,
    isETF: false,
    optionsFlow: null,
    profile: {
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      description: 'Mock Description',
      website: '',
      employees: 100000,
      country: 'USA',
      city: 'Cupertino',
      exchange: 'NASDAQ',
      currency: 'USD',
      quoteType: 'EQUITY',
    },
    price: {
      current: 150.0,
      previousClose: 148.0,
      open: 149.0,
      dayHigh: 151.0,
      dayLow: 148.5,
      fiftyTwoWeekHigh: 180.0,
      fiftyTwoWeekLow: 130.0,
      fiftyDayAverage: 145.0,
      twoHundredDayAverage: 140.0,
      volume: 50000000,
      averageVolume: 60000000,
      averageVolume10Day: 55000000,
      marketCap: 1500000000, // $1.5B
      dayChange: 2.0,
      dayChangePercent: 1.35,
      fiftyTwoWeekChangePercent: 15.0,
      distanceFrom52wHigh: 16.67,
      distanceFrom52wLow: 15.38,
    },
    valuation: {
      trailingPE: 25,
      forwardPE: 22,
      pegRatio: 1.5,
      priceToBook: 5,
      priceToSales: 4.5,
      enterpriseValue: 1600000000,
      enterpriseToRevenue: 4.8,
      enterpriseToEbitda: 15,
      bookValue: 30,
    },
    profitability: {
      grossMargins: 0.42,
      operatingMargins: 0.25,
      profitMargins: 0.20,
      returnOnAssets: 0.12,
      returnOnEquity: 0.35,
      revenueGrowth: 0.08,
      earningsGrowth: 0.10,
    },
    financialHealth: {
      totalCash: 200000000,
      totalCashPerShare: 4.0,
      totalDebt: 300000000,
      debtToEquity: 50,
      currentRatio: 1.8,
      quickRatio: 1.4,
      totalRevenue: 5000000000,
      revenuePerShare: 100.0,
      ebitda: 1200000000,
      freeCashflow: 900000000,
      operatingCashflow: 1100000000,
      grossProfits: 2100000000,
    },
    dividends: {
      dividendRate: 2.4,
      dividendYield: 0.016, // 1.6%
      exDividendDate: '2026-05-15',
      payoutRatio: 0.25,
      fiveYearAvgDividendYield: 0.015,
      lastDividendValue: 0.6,
      lastDividendDate: '2026-05-15',
      hasDividend: true,
    },
    analyst: {
      targetLow: 140,
      targetMean: 170,
      targetMedian: 172,
      targetHigh: 190,
      numberOfAnalysts: 35,
      recommendationKey: 'BUY',
      recommendationMean: 1.8,
    },
    keyStats: {
      beta: 1.2,
      sharesOutstanding: 50000000, // 50M
      floatShares: 48000000,
      sharesShort: 1000000,
      shortRatio: 2.0,
      shortPercentOfFloat: 0.02,
      heldPercentInsiders: 0.05,
      heldPercentInstitutions: 0.75,
      trailingEps: 6.0,
      forwardEps: 6.8,
      earningsQuarterlyGrowth: 0.12,
      mostRecentQuarter: '2026-03-31',
      lastSplitFactor: '',
      lastSplitDate: '',
    },
    earningsHistory: [],
    quarterlyReports: [],
    topHolders: [],
    news: [],
    insiderTransactions: [],
    etfHoldings: [],
    sectorExposure: [],
    alphaIntelligence: null,
    analystTrend: [],
    riskMetrics: null,
    upcomingCatalysts: null,
    secFilings: [],
    peerBenchmark: null,
    ...overrides,
  };
}

describe('Corporate Quality & WACC Calculations', () => {
  it('calculates Altman Z-Score with safe classification for healthy company', () => {
    const stock = createMockStock();
    const result = calculateAltmanZScore(stock);
    expect(result.isApplicable).toBe(true);
    expect(result.score).toBeGreaterThan(2.99); // Safe zone
    expect(result.classification).toBe('Safe');
    expect(result.color).toBe('text-bull');
  });

  it('detects Distress classification for highly leveraged company with weak margins', () => {
    const stock = createMockStock({
      price: {
        current: 10.0,
        previousClose: 11.0,
        open: 11.0,
        dayHigh: 11.5,
        dayLow: 9.8,
        fiftyTwoWeekHigh: 25.0,
        fiftyTwoWeekLow: 8.0,
        fiftyDayAverage: 12.0,
        twoHundredDayAverage: 15.0,
        volume: 1000000,
        averageVolume: 800000,
        averageVolume10Day: 900000,
        marketCap: 50000000, // Low Market Cap ($50M)
        dayChange: -1.0,
        dayChangePercent: -9.09,
        fiftyTwoWeekChangePercent: -50.0,
        distanceFrom52wHigh: 60.0,
        distanceFrom52wLow: 25.0,
      },
      valuation: {
        trailingPE: null,
        forwardPE: null,
        pegRatio: null,
        priceToBook: 0.5,
        priceToSales: 0.5,
        enterpriseValue: 150000000,
        enterpriseToRevenue: 1.5,
        enterpriseToEbitda: 25,
        bookValue: 2.0,
      },
      profitability: {
        grossMargins: 0.10,
        operatingMargins: -0.05, // Negative margin
        profitMargins: -0.08,
        returnOnAssets: -0.04,
        returnOnEquity: -0.20,
        revenueGrowth: -0.15, // Shrinking revenue
        earningsGrowth: null,
      },
      financialHealth: {
        totalCash: 5000000,
        totalCashPerShare: 1.0,
        totalDebt: 100000000, // Massive debt relative to size
        debtToEquity: 500,
        currentRatio: 0.8, // Weak current ratio
        quickRatio: 0.5,
        totalRevenue: 100000000,
        revenuePerShare: 20.0,
        ebitda: -5000000, // Burning cash
        freeCashflow: -10000000,
        operatingCashflow: -8000000,
        grossProfits: 10000000,
      },
    });

    const result = calculateAltmanZScore(stock);
    expect(result.isApplicable).toBe(true);
    expect(result.score).toBeLessThan(1.81); // Distress zone
    expect(result.classification).toBe('Distress');
    expect(result.color).toBe('text-bear');
  });

  it('calculates Piotroski F-Score metrics checks correctly', () => {
    const stock = createMockStock();
    const result = calculatePiotroskiFScore(stock);
    expect(result.isApplicable).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(4); // Healthy stable stock
    expect(result.checks.length).toBe(9);
  });

  it('calculates Beneish M-Score and flags low risk for typical profile', () => {
    const stock = createMockStock();
    const result = calculateBeneishMScore(stock);
    expect(result.isApplicable).toBe(true);
    expect(result.score).toBeLessThan(-1.78); // Low Risk
    expect(result.classification).toBe('Low Risk');
    expect(result.color).toBe('text-bull');
  });

  it('flags high risk for companies with aggressive accruals (net income >> operating cash flow)', () => {
    const stock = createMockStock({
      profitability: {
        grossMargins: 0.42,
        operatingMargins: 0.25,
        profitMargins: 0.40, // high margins
        returnOnAssets: 0.12,
        returnOnEquity: 0.35,
        revenueGrowth: 0.30, // massive sales growth (SGI high)
        earningsGrowth: 0.10,
      },
      financialHealth: {
        totalCash: 200000000,
        totalCashPerShare: 4.0,
        totalDebt: 300000000,
        debtToEquity: 50,
        currentRatio: 1.8,
        quickRatio: 1.4,
        totalRevenue: 5000000000,
        revenuePerShare: 100.0,
        ebitda: 1200000000,
        freeCashflow: -500000000,
        operatingCashflow: 100000000, // cash flow is only 100M vs 2B net income
        grossProfits: 2100000000,
      }
    });
    const result = calculateBeneishMScore(stock);
    expect(result.isApplicable).toBe(true);
    expect(result.score).toBeGreaterThan(-1.78); // High Risk
    expect(result.classification).toBe('High Risk');
    expect(result.color).toBe('text-bear');
  });

  it('computes WACC and Gordon DDM fair value correctly', () => {
    const stock = createMockStock();
    const w = calculateWacc(stock, 0.04, 0.06, 0.20, 0.05);

    // Cost of Equity = 4% + 1.2 * 6% = 11.2%
    expect(w.costOfEquity).toBeCloseTo(0.112);
    // Cost of Debt After-Tax = 5% * (1 - 20%) = 4%
    expect(w.costOfDebtAfterTax).toBeCloseTo(0.04);
    // WACC should lie between Cost of Debt (4%) and Cost of Equity (11.2%)
    expect(w.wacc).toBeGreaterThan(0.04);
    expect(w.wacc).toBeLessThan(0.112);

    const d = calculateGordonDDM(stock, w.wacc, 0.03); // 3% dividend growth
    expect(d.isApplicable).toBe(true);
    expect(d.fairValue).toBeGreaterThan(0);
  });
});
