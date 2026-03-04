import YahooFinance from 'yahoo-finance2';
import { getFromCache, setInCache, CACHE_TTL } from './cache';
import { fetchHistoryWithInterval } from './market-data';
import { calculateRiskEntropy } from './risk';
import { NarrativeArticle } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface StockProfile { name: string; sector: string; industry: string; description: string; website: string; employees: number | null; country: string; city: string; exchange: string; currency: string; quoteType: string; }
export interface PriceData { current: number; previousClose: number; open: number; dayHigh: number; dayLow: number; fiftyTwoWeekHigh: number; fiftyTwoWeekLow: number; fiftyDayAverage: number; twoHundredDayAverage: number; volume: number; averageVolume: number; averageVolume10Day: number; marketCap: number; dayChange: number; dayChangePercent: number; fiftyTwoWeekChangePercent: number; distanceFrom52wHigh: number; distanceFrom52wLow: number; }
export interface ValuationMetrics { trailingPE: number | null; forwardPE: number | null; pegRatio: number | null; priceToBook: number | null; priceToSales: number | null; enterpriseValue: number | null; enterpriseToRevenue: number | null; enterpriseToEbitda: number | null; bookValue: number | null; }
export interface ProfitabilityMetrics { grossMargins: number | null; operatingMargins: number | null; profitMargins: number | null; returnOnAssets: number | null; returnOnEquity: number | null; revenueGrowth: number | null; earningsGrowth: number | null; }
export interface FinancialHealth { totalCash: number | null; totalCashPerShare: number | null; totalDebt: number | null; debtToEquity: number | null; currentRatio: number | null; quickRatio: number | null; totalRevenue: number | null; revenuePerShare: number | null; ebitda: number | null; freeCashflow: number | null; operatingCashflow: number | null; grossProfits: number | null; }
export interface DividendData { dividendRate: number | null; dividendYield: number | null; exDividendDate: string | null; payoutRatio: number | null; fiveYearAvgDividendYield: number | null; lastDividendValue: number | null; lastDividendDate: string | null; hasDividend: boolean; }
export interface AnalystData { targetLow: number | null; targetMean: number | null; targetMedian: number | null; targetHigh: number | null; numberOfAnalysts: number; recommendationKey: string | null; recommendationMean: number | null; }
export interface KeyStatistics { beta: number | null; sharesOutstanding: number | null; floatShares: number | null; sharesShort: number | null; shortRatio: number | null; shortPercentOfFloat: number | null; heldPercentInsiders: number | null; heldPercentInstitutions: number | null; trailingEps: number | null; forwardEps: number | null; earningsQuarterlyGrowth: number | null; mostRecentQuarter: string | null; lastSplitFactor: string | null; lastSplitDate: string | null; }
export interface EarningsQuarter { date: string; actual: number | null; estimate: number | null; surprise: number | null; surprisePercent: number | null; }
export interface QuarterlyReport { date: string; fiscalQuarter: string; revenue: number | null; netIncome: number | null; epsActual: number | null; epsEstimate: number | null; epsSurprise: number | null; epsSurprisePercent: number | null; reportedDate: string | null; priceReaction: number | null; priceReactionPct: number | null; }
export interface OptionsFlow { callsVolume: number; putsVolume: number; callsOpenInterest: number; putsOpenInterest: number; impliedVolatility: number | null; nearestExpiration: string | null; }
export interface StockDetails { ticker: string; fetchedAt: number; profile: StockProfile; price: PriceData; valuation: ValuationMetrics; profitability: ProfitabilityMetrics; financialHealth: FinancialHealth; dividends: DividendData; analyst: AnalystData; keyStats: KeyStatistics; earningsHistory: EarningsQuarter[]; quarterlyReports: QuarterlyReport[]; topHolders: Holder[]; news: NarrativeArticle[]; insiderTransactions: InsiderTransaction[]; etfHoldings: ETFHolding[]; sectorExposure: SectorExposure[]; alphaIntelligence: BenchmarkPerformance | null; analystTrend: AnalystTrendEntry[]; riskMetrics: RiskMetrics | null; upcomingCatalysts: UpcomingCatalysts | null; secFilings: SECListing[]; peerBenchmark: PeerMetrics | null; isCrypto: boolean; isETF: boolean; optionsFlow: OptionsFlow | null; }
export interface PeerMetrics { ticker: string; name: string; price: number; forwardPE: number | null; profitMargin: number | null; revenueGrowth: number | null; }
export interface SECListing { date: string; type: string; title: string; url: string; }
export interface UpcomingCatalysts { earningsDate: string | null; isEarningsEstimate: boolean; revenueAverage: number | null; earningsAverage: number | null; exDividendDate: string | null; dividendDate: string | null; }
export interface RiskMetrics { sharpeRatio: number; sortinoRatio: number; maxDrawdown1Y: number; realizedVolatility1Y: number; downsideDeviation1Y: number; isValid: boolean; }
export interface AnalystTrendEntry { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; }
export interface SectorExposure { sector: string; weight: number; }
export interface BenchmarkPerformance { assetReturn1Y: number; benchmarkReturn1Y: number; alpha1Y: number; benchmarkTicker: string; }
export interface ETFHolding { symbol: string; name: string; pct: number | null; }
export interface InsiderTransaction { filerName: string; filerRelation: string; transactionText: string; shares: number | null; value: number | null; startDate: string | null; }
export interface Holder { name: string; pctHeld: number | null; value: number | null; pctChange: number | null; }

import { safeNum, safeStr, safeDate } from './utils';

export async function fetchStockDetails(ticker: string): Promise<StockDetails> {
  const cacheKey = `stock_details:${ticker}`;
  const cached = await getFromCache<StockDetails>(cacheKey);
  if (cached) return cached;

  const sym = decodeURIComponent(ticker);
  const isCrypto = sym.includes('-USD') || sym.includes('-BTC');
  const benchmark = isCrypto ? 'BTC-USD' : 'SPY';

  const [resRaw, history, search, benchHistory, peers, optsRaw] = await Promise.all([
    Promise.race([
      yahooFinance.quoteSummary(sym, { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'earningsHistory', 'earnings', 'institutionOwnership', 'insiderTransactions', 'topHoldings', 'recommendationTrend', 'calendarEvents', 'secFilings', 'assetProfile'] }, { validateResult: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
    ]).catch(err => {
      console.warn(`[Stock Details] QuoteSummary failed or timed out for ${sym}:`, err.message);
      return null;
    }),
    fetchHistoryWithInterval(sym, '1d', 730 * 86400).catch(() => []),
    Promise.race([
      yahooFinance.search(sym, { newsCount: 5 }, { validateResult: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
    ]).catch(() => null),
    fetchHistoryWithInterval(benchmark, '1d', 365 * 86400).catch(() => []),
    yahooFinance.recommendationsBySymbol(sym).then(r => r?.recommendedSymbols?.[0]?.symbol).then(s => s ? yahooFinance.quoteSummary(s, { modules: ['price', 'defaultKeyStatistics', 'financialData'] }, { validateResult: false }).then(q => ({ symbol: s, summary: q as any })) : null).catch(() => null),
    Promise.race([
       yahooFinance.options(sym),
       new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
    ]).catch(() => null)
  ]);

  if (!resRaw) {
    if (!sym.includes("-") && sym.length <= 5) {
      try {
        return await fetchStockDetails(`${sym}-USD`);
      } catch {
        // Fallback if the recursive call fails too
      }
    }
    // Return a minimal Zero-State instead of throwing to prevent page crash
    console.warn(`[Stock Details] Returning zero-state for ${sym}`);
    return generateZeroStateDetails(sym, isCrypto);
  }
  const res = resRaw as any;

  const qt = safeStr(res.price?.quoteType, 'EQUITY');
  const isETF = qt === 'ETF';
  const cur = safeNum(res.price?.regularMarketPrice) ?? safeNum(res.summaryDetail?.previousClose) ?? 0;
  const prev = safeNum(res.summaryDetail?.previousClose) ?? cur;
  const h52 = safeNum(res.summaryDetail?.fiftyTwoWeekHigh) ?? cur;
  const l52 = safeNum(res.summaryDetail?.fiftyTwoWeekLow) ?? cur;

  let optionsFlow: OptionsFlow | null = null;
  const oRaw = optsRaw as any;
  if (!isCrypto && oRaw && oRaw.options && oRaw.options.length > 0) {
    const nearest = oRaw.options[0];
    let callsVol = 0, callsOi = 0, putsVol = 0, putsOi = 0;
    let avgIv = 0, ivCount = 0;
    
    (nearest.calls || []).forEach((c: any) => {
      callsVol += c.volume || 0; callsOi += c.openInterest || 0;
      if (c.impliedVolatility) { avgIv += c.impliedVolatility; ivCount++; }
    });
    (nearest.puts || []).forEach((p: any) => {
      putsVol += p.volume || 0; putsOi += p.openInterest || 0;
      if (p.impliedVolatility) { avgIv += p.impliedVolatility; ivCount++; }
    });
    
    optionsFlow = {
      callsVolume: callsVol, putsVolume: putsVol, 
      callsOpenInterest: callsOi, putsOpenInterest: putsOi,
      impliedVolatility: ivCount > 0 ? avgIv / ivCount : null,
      nearestExpiration: safeDate(nearest.expirationDate)
    };
  }

  const details: StockDetails = {
    ticker: sym, fetchedAt: Date.now(), isCrypto, isETF, optionsFlow,
    profile: {
      name: safeStr(res.price?.longName || res.price?.shortName, sym),
      sector: safeStr(res.assetProfile?.sector, isCrypto ? 'Crypto' : 'Unknown'),
      industry: safeStr(res.assetProfile?.industry, isCrypto ? 'Digital' : 'Unknown'),
      description: safeStr(res.assetProfile?.longBusinessSummary, ''),
      website: safeStr(res.assetProfile?.website, ''),
      employees: safeNum(res.assetProfile?.fullTimeEmployees),
      country: safeStr(res.assetProfile?.country, ''),
      city: safeStr(res.assetProfile?.city, ''),
      exchange: safeStr(res.price?.exchangeName || res.price?.exchange, ''),
      currency: safeStr(res.price?.currency || res.summaryDetail?.currency, 'USD'),
      quoteType: qt,
    },
    price: {
      current: cur, previousClose: prev, open: safeNum(res.summaryDetail?.open) ?? cur,
      dayHigh: safeNum(res.summaryDetail?.dayHigh) ?? cur, dayLow: safeNum(res.summaryDetail?.dayLow) ?? cur,
      fiftyTwoWeekHigh: h52, fiftyTwoWeekLow: l52,
      fiftyDayAverage: safeNum(res.summaryDetail?.fiftyDayAverage) ?? cur,
      twoHundredDayAverage: safeNum(res.summaryDetail?.twoHundredDayAverage) ?? cur,
      volume: safeNum(res.summaryDetail?.volume) ?? 0,
      averageVolume: safeNum(res.summaryDetail?.averageVolume) ?? 0,
      averageVolume10Day: safeNum(res.summaryDetail?.averageVolume10Day) ?? 0,
      marketCap: safeNum(res.price?.marketCap) ?? 0,
      dayChange: cur - prev, dayChangePercent: prev !== 0 ? ((cur - prev) / prev) * 100 : 0,
      fiftyTwoWeekChangePercent: safeNum(res.summaryDetail?.fiftyTwoWeekChangePercent) ?? 0,
      distanceFrom52wHigh: h52 !== 0 ? ((h52 - cur) / h52) * 100 : 0,
      distanceFrom52wLow: l52 !== 0 ? ((cur - l52) / l52) * 100 : 0,
    },
    valuation: {
      trailingPE: safeNum(res.summaryDetail?.trailingPE), forwardPE: safeNum(res.summaryDetail?.forwardPE),
      pegRatio: safeNum(res.defaultKeyStatistics?.pegRatio), priceToBook: safeNum(res.defaultKeyStatistics?.priceToBook),
      priceToSales: safeNum(res.summaryDetail?.priceToSales), enterpriseValue: safeNum(res.defaultKeyStatistics?.enterpriseValue),
      enterpriseToRevenue: safeNum(res.defaultKeyStatistics?.enterpriseToRevenue), enterpriseToEbitda: safeNum(res.defaultKeyStatistics?.enterpriseToEbitda),
      bookValue: safeNum(res.defaultKeyStatistics?.bookValue),
    },
    profitability: {
      grossMargins: safeNum(res.financialData?.grossMargins), operatingMargins: safeNum(res.financialData?.operatingMargins),
      profitMargins: safeNum(res.financialData?.profitMargins), returnOnAssets: safeNum(res.financialData?.returnOnAssets),
      returnOnEquity: safeNum(res.financialData?.returnOnEquity), revenueGrowth: safeNum(res.financialData?.revenueGrowth),
      earningsGrowth: safeNum(res.financialData?.earningsGrowth),
    },
    financialHealth: {
      totalCash: safeNum(res.financialData?.totalCash), totalCashPerShare: safeNum(res.financialData?.totalCashPerShare),
      totalDebt: safeNum(res.financialData?.totalDebt), debtToEquity: safeNum(res.financialData?.debtToEquity),
      currentRatio: safeNum(res.financialData?.currentRatio), quickRatio: safeNum(res.financialData?.quickRatio),
      totalRevenue: safeNum(res.financialData?.totalRevenue), revenuePerShare: safeNum(res.financialData?.revenuePerShare),
      ebitda: safeNum(res.financialData?.ebitda), freeCashflow: safeNum(res.financialData?.freeCashflow),
      operatingCashflow: safeNum(res.financialData?.operatingCashflow), grossProfits: safeNum(res.financialData?.grossProfits),
    },
    dividends: {
      dividendRate: safeNum(res.summaryDetail?.dividendRate), dividendYield: safeNum(res.summaryDetail?.dividendYield),
      exDividendDate: safeDate(res.summaryDetail?.exDividendDate),
      payoutRatio: safeNum(res.summaryDetail?.payoutRatio), fiveYearAvgDividendYield: safeNum(res.summaryDetail?.fiveYearAvgDividendYield),
      lastDividendValue: safeNum(res.summaryDetail?.lastDividendValue), lastDividendDate: safeDate(res.summaryDetail?.lastDividendDate),
      hasDividend: !!res.summaryDetail?.dividendYield,
    },
    analyst: {
      targetLow: safeNum(res.financialData?.targetLowPrice), targetMean: safeNum(res.financialData?.targetMeanPrice),
      targetMedian: safeNum(res.financialData?.targetMedianPrice), targetHigh: safeNum(res.financialData?.targetHighPrice),
      numberOfAnalysts: safeNum(res.financialData?.numberOfAnalystEstimates) ?? 0,
      recommendationKey: safeStr(res.financialData?.recommendationKey, "NEUTRAL"),
      recommendationMean: safeNum(res.financialData?.recommendationMean),
    },
    keyStats: {
      beta: safeNum(res.defaultKeyStatistics?.beta), sharesOutstanding: safeNum(res.defaultKeyStatistics?.sharesOutstanding),
      floatShares: safeNum(res.defaultKeyStatistics?.floatShares), sharesShort: safeNum(res.defaultKeyStatistics?.sharesShort),
      shortRatio: safeNum(res.defaultKeyStatistics?.shortRatio), shortPercentOfFloat: safeNum(res.defaultKeyStatistics?.shortPercentOfFloat),
      heldPercentInsiders: safeNum(res.defaultKeyStatistics?.heldPercentInsiders), heldPercentInstitutions: safeNum(res.defaultKeyStatistics?.heldPercentInstitutions),
      trailingEps: safeNum(res.defaultKeyStatistics?.trailingEps), forwardEps: safeNum(res.defaultKeyStatistics?.forwardEps),
      earningsQuarterlyGrowth: safeNum(res.defaultKeyStatistics?.earningsQuarterlyGrowth), mostRecentQuarter: safeDate(res.defaultKeyStatistics?.mostRecentQuarter),
      lastSplitFactor: res.defaultKeyStatistics?.lastSplitFactor, lastSplitDate: safeDate(res.defaultKeyStatistics?.lastSplitDate),
    },
    earningsHistory: (res.earningsHistory?.history || []).map((e: any) => ({ date: safeDate(e.date), actual: safeNum(e.actual), estimate: safeNum(e.estimate), surprise: safeNum(e.actual - e.estimate), surprisePercent: safeNum(e.surprisePct) })),
    quarterlyReports: mergeQuarterly(res.earnings?.earningsChart?.quarterly, res.earnings?.financialsChart?.quarterly, history),
    topHolders: (res.institutionOwnership?.ownershipList || []).map((h: any) => ({ name: h.organization, pctHeld: safeNum(h.pctHeld), value: safeNum(h.value), pctChange: safeNum(h.pctChange) })),
    news: ((search as any)?.news || []).map((n: any) => ({ 
      title: n.title, 
      publisher: n.publisher, 
      url: n.link, 
      date: new Date(n.providerPublishTime * 1000).toISOString() 
    })),
    insiderTransactions: (res.insiderTransactions?.transactions || []).map((t: any) => ({ filerName: t.filerName, filerRelation: t.filerRelation, transactionText: t.transactionText, shares: safeNum(t.shares), value: safeNum(t.value), startDate: safeDate(t.startDate) })),
    etfHoldings: (res.topHoldings?.holdings || []).map((h: any) => ({ symbol: h.symbol, name: h.holdingName, pct: safeNum(h.holdingPercent) })),
    sectorExposure: (res.topHoldings?.sectorWeightings || []).map((s: any) => ({ sector: Object.keys(s)[0], weight: safeNum(Object.values(s)[0]) })),
    alphaIntelligence: calculateAlpha(history, benchHistory, benchmark),
    analystTrend: (res.recommendationTrend?.trend || []),
    riskMetrics: ((): RiskMetrics | null => {
      const r = calculateRiskEntropy(history);
      if (!r.isValid) return null;
      return {
        sharpeRatio: r.sharpeRatio,
        sortinoRatio: r.sortinoRatio,
        maxDrawdown1Y: r.maxDrawdown,
        realizedVolatility1Y: r.realizedVolatility,
        downsideDeviation1Y: r.downsideDeviation,
        isValid: true
      };
    })(),
    upcomingCatalysts: {
      earningsDate: safeDate(res.calendarEvents?.earnings?.earningsDate?.[0]),
      isEarningsEstimate: true, revenueAverage: safeNum(res.calendarEvents?.earnings?.revenueAverage),
      earningsAverage: safeNum(res.calendarEvents?.earnings?.earningsAverage), exDividendDate: safeDate(res.calendarEvents?.exDividendDate),
      dividendDate: safeDate(res.calendarEvents?.dividendDate),
    },
    secFilings: (res.secFilings?.filings || []).map((f: any) => ({ date: safeDate(f.date), type: f.type, title: f.title, url: f.edgarUrl || f.url })),
    peerBenchmark: peers ? { ticker: peers.symbol, name: safeStr(peers.summary.price?.longName, peers.symbol), price: safeNum(peers.summary.price?.regularMarketPrice) || 0, forwardPE: safeNum(peers.summary.defaultKeyStatistics?.forwardPE), profitMargin: safeNum(peers.summary.financialData?.profitMargins), revenueGrowth: safeNum(peers.summary.financialData?.revenueGrowth) } : null,
  };

  calibrateMetrics(details);
  await setInCache(cacheKey, details, CACHE_TTL.STOCK_DETAILS);
  return details;
}

function generateZeroStateDetails(ticker: string, isCrypto: boolean): StockDetails {
  return {
    ticker,
    fetchedAt: Date.now(),
    isCrypto,
    isETF: false,
    optionsFlow: null,
    profile: {
      name: ticker,
      sector: "Unknown",
      industry: "Unknown",
      description: "Data temporarily unavailable.",
      website: "",
      employees: null,
      country: "",
      city: "",
      exchange: "",
      currency: "USD",
      quoteType: "EQUITY"
    },
    price: {
      current: 0, previousClose: 0, open: 0, dayHigh: 0, dayLow: 0,
      fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0, fiftyDayAverage: 0, twoHundredDayAverage: 0,
      volume: 0, averageVolume: 0, averageVolume10Day: 0, marketCap: 0,
      dayChange: 0, dayChangePercent: 0, fiftyTwoWeekChangePercent: 0,
      distanceFrom52wHigh: 0, distanceFrom52wLow: 0
    },
    valuation: {
      trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null,
      priceToSales: null, enterpriseValue: null, enterpriseToRevenue: null,
      enterpriseToEbitda: null, bookValue: null
    },
    profitability: {
      grossMargins: null, operatingMargins: null, profitMargins: null,
      returnOnAssets: null, returnOnEquity: null, revenueGrowth: null, earningsGrowth: null
    },
    financialHealth: {
      totalCash: null, totalCashPerShare: null, totalDebt: null, debtToEquity: null,
      currentRatio: null, quickRatio: null, totalRevenue: null, revenuePerShare: null,
      ebitda: null, freeCashflow: null, operatingCashflow: null, grossProfits: null
    },
    dividends: {
      dividendRate: null, dividendYield: null, exDividendDate: null, payoutRatio: null,
      fiveYearAvgDividendYield: null, lastDividendValue: null, lastDividendDate: null,
      hasDividend: false
    },
    analyst: {
      targetLow: null, targetMean: null, targetMedian: null, targetHigh: null,
      numberOfAnalysts: 0, recommendationKey: "NEUTRAL", recommendationMean: null
    },
    keyStats: {
      beta: null, sharesOutstanding: null, floatShares: null, sharesShort: null,
      shortRatio: null, shortPercentOfFloat: null, heldPercentInsiders: null,
      heldPercentInstitutions: null, trailingEps: null, forwardEps: null,
      earningsQuarterlyGrowth: null, mostRecentQuarter: null, lastSplitFactor: null, lastSplitDate: null
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
    upcomingCatalysts: {
      earningsDate: null, isEarningsEstimate: true, revenueAverage: null,
      earningsAverage: null, exDividendDate: null, dividendDate: null
    },
    secFilings: [],
    peerBenchmark: null
  };
}

function calibrateMetrics(d: StockDetails) {
  // Manual PEG Calculation: PE / Growth
  if (d.valuation.pegRatio === null && d.valuation.trailingPE && d.profitability.earningsGrowth) {
    const growthPercent = d.profitability.earningsGrowth * 100;
    if (growthPercent > 1) {
      d.valuation.pegRatio = d.valuation.trailingPE / growthPercent;
    }
  }

  // Manual Price/Sales Calculation: Market Cap / Total Revenue
  if (d.valuation.priceToSales === null && d.price.marketCap > 0 && d.financialHealth.totalRevenue) {
    d.valuation.priceToSales = d.price.marketCap / d.financialHealth.totalRevenue;
  }
}

function mergeQuarterly(earnings: any[] = [], financials: any[] = [], history: any[] = []): QuarterlyReport[] {
  const finMap = new Map(financials.map(f => [f.date, f]));
  return earnings.map(e => {
    const f = finMap.get(e.date) || {};
    const reportDateSec = e.reportedDate ? (typeof e.reportedDate === 'number' ? e.reportedDate : new Date(e.reportedDate).getTime() / 1000) : 0;
    const reportIdx = history.findIndex(h => h.time >= reportDateSec);
    const reaction = (reportIdx !== -1 && reportIdx < history.length - 1) ? history[reportIdx + 1].close - history[reportIdx].close : null;
    return {
      date: e.date, fiscalQuarter: e.fiscalQuarter || e.date, revenue: safeNum(f.revenue), netIncome: safeNum(f.earnings),
      epsActual: safeNum(e.actual), epsEstimate: safeNum(e.estimate), epsSurprise: e.actual !== null && e.estimate !== null ? Number((e.actual - e.estimate).toFixed(4)) : null,
      epsSurprisePercent: safeNum(e.surprisePct), reportedDate: safeDate(e.reportedDate),
      priceReaction: reaction, priceReactionPct: reaction && history[reportIdx] ? Number(((reaction / history[reportIdx].close) * 100).toFixed(2)) : null,
    };
  }).reverse();
}

function calculateAlpha(history: any[], bench: any[], ticker: string): BenchmarkPerformance | null {
  if (history.length < 252 || bench.length < 252) return null;
  const aRet = (history[history.length - 1].close - history[history.length - 252].close) / history[history.length - 252].close;
  const bRet = (bench[bench.length - 1].close - bench[bench.length - 252].close) / bench[bench.length - 252].close;
  return { assetReturn1Y: aRet, benchmarkReturn1Y: bRet, alpha1Y: aRet - bRet, benchmarkTicker: ticker };
}


