import YahooFinance from 'yahoo-finance2';
import { getFromCache, setInCache, CACHE_TTL } from './cache';
import { fetchHistoryWithInterval } from './market-data';

const yahooFinance = new YahooFinance();

// ─────────────────────────────────────────────────────
// TYPES — Every data point the UI can show
// ─────────────────────────────────────────────────────

export interface StockProfile {
  name: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  employees: number | null;
  country: string;
  city: string;
  exchange: string;
  currency: string;
  quoteType: string; // "EQUITY", "CRYPTOCURRENCY", "ETF", etc.
}

export interface PriceData {
  current: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  volume: number;
  averageVolume: number;
  averageVolume10Day: number;
  marketCap: number;
  // Derived
  dayChange: number;
  dayChangePercent: number;
  fiftyTwoWeekChangePercent: number;
  distanceFrom52wHigh: number;  // percentage below 52w high
  distanceFrom52wLow: number;   // percentage above 52w low
}

export interface ValuationMetrics {
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseValue: number | null;
  enterpriseToRevenue: number | null;
  enterpriseToEbitda: number | null;
  bookValue: number | null;
}

export interface ProfitabilityMetrics {
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
}

export interface FinancialHealth {
  totalCash: number | null;
  totalCashPerShare: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  totalRevenue: number | null;
  revenuePerShare: number | null;
  ebitda: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  grossProfits: number | null;
}

export interface DividendData {
  dividendRate: number | null;
  dividendYield: number | null;
  exDividendDate: string | null;
  payoutRatio: number | null;
  fiveYearAvgDividendYield: number | null;
  lastDividendValue: number | null;
  lastDividendDate: string | null;
  hasDividend: boolean;
}

export interface AnalystData {
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  targetHigh: number | null;
  numberOfAnalysts: number;
  recommendationKey: string | null;   // "buy", "hold", "sell", etc.
  recommendationMean: number | null;  // 1.0 = Strong Buy → 5.0 = Sell
}

export interface KeyStatistics {
  beta: number | null;
  sharesOutstanding: number | null;
  floatShares: number | null;
  sharesShort: number | null;
  shortRatio: number | null;
  shortPercentOfFloat: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  earningsQuarterlyGrowth: number | null;
  mostRecentQuarter: string | null;
  lastSplitFactor: string | null;
  lastSplitDate: string | null;
}

export interface EarningsQuarter {
  date: string;
  actual: number | null;
  estimate: number | null;
  surprise: number | null;      // actual - estimate
  surprisePercent: number | null;
}

export interface StockDetails {
  ticker: string;
  fetchedAt: number;
  profile: StockProfile;
  price: PriceData;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  financialHealth: FinancialHealth;
  dividends: DividendData;
  analyst: AnalystData;
  keyStats: KeyStatistics;
  earningsHistory: EarningsQuarter[];
  quarterlyReports: QuarterlyReport[];
  topHolders: Holder[];
  news: NewsArticle[];
  insiderTransactions: InsiderTransaction[];
  etfHoldings: ETFHolding[];
  sectorExposure: SectorExposure[];
  alphaIntelligence: BenchmarkPerformance | null;
  analystTrend: AnalystTrendEntry[];
  riskMetrics: RiskMetrics | null;
  upcomingCatalysts: UpcomingCatalysts | null;
  secFilings: SECListing[];
  peerBenchmark: PeerMetrics | null;
  isCrypto: boolean;
  isETF: boolean;
}

export interface PeerMetrics {
  ticker: string;
  name: string;
  price: number;
  forwardPE: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
}

export interface SECListing {
  date: string;
  type: string;
  title: string;
  url: string;
}

export interface UpcomingCatalysts {
  earningsDate: string | null;
  isEarningsEstimate: boolean;
  revenueAverage: number | null;
  earningsAverage: number | null;
  exDividendDate: string | null;
  dividendDate: string | null;
}

export interface RiskMetrics {
  maxDrawdown1Y: number;
  realizedVolatility1Y: number;
}

export interface AnalystTrendEntry {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface SectorExposure {
  sector: string;
  weight: number;
}

export interface BenchmarkPerformance {
  assetReturn1Y: number;
  benchmarkReturn1Y: number;
  alpha1Y: number;
  benchmarkTicker: string;
}

export interface ETFHolding {
  symbol: string;
  name: string;
  pct: number | null;
}

export interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
}

export interface InsiderTransaction {
  filerName: string;
  filerRelation: string;
  transactionText: string;
  shares: number | null;
  value: number | null;
  startDate: string | null;
}

export interface Holder {
  name: string;
  pctHeld: number | null;
  value: number | null;
  pctChange: number | null;
}

export interface QuarterlyReport {
  date: string;
  fiscalQuarter: string;
  revenue: number | null;
  netIncome: number | null;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  reportedDate: string | null;
  priceReaction: number | null;
  priceReactionPct: number | null;
}


// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function safeNum(val: unknown): number | null {
  if (val === undefined || val === null || val === '' || Number.isNaN(val)) return null;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

function safeStr(val: unknown, fallback: string = ''): string {
  if (val === undefined || val === null) return fallback;
  return String(val);
}

function safeDateStr(val: unknown): string | null {
  if (!val) return null;
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function pct(val: number | null): number | null {
  if (val === null) return null;
  return Number((val * 100).toFixed(2));
}


// ─────────────────────────────────────────────────────
// MAIN FETCHER
// ─────────────────────────────────────────────────────

export async function fetchStockDetails(ticker: string): Promise<StockDetails> {
  const cacheKey = `stock_details:${ticker}`;
  const cached = getFromCache<StockDetails>(cacheKey);
  if (cached) return cached;

  const sym = decodeURIComponent(ticker);
  const isCrypto = sym.includes('-USD') || sym.includes('-BTC');

  // Choose modules based on asset type
  const modules: string[] = [
    'price',
    'summaryDetail',
    'financialData',
    'defaultKeyStatistics',
    'earningsHistory',
    'earnings',
    'institutionOwnership',
    'insiderTransactions',
    'topHoldings',
    'recommendationTrend',
    'calendarEvents',
    'secFilings',
  ];

  // Crypto and some assets don't have these modules
  if (!isCrypto) {
    modules.push('assetProfile');
  }

  // Fetch modules + 2Y history + news + benchmark (SPY) + competitors in parallel
  const [result, priceHistory, searchRes, benchmarkHistory, peerData] = await (async () => {
    try {
      const benchmark = isCrypto ? 'BTC-USD' : 'SPY';
      const res = await Promise.all([
        yahooFinance.quoteSummary(sym, { modules: modules as any }, { validateResult: false }),
        fetchHistoryWithInterval(sym, '1d', 2 * 365 * 86400).catch(() => []),
        yahooFinance.search(sym, { newsCount: 5 }, { validateResult: false }),
        fetchHistoryWithInterval(benchmark, '1d', 1 * 365 * 86400).catch(() => []),
        yahooFinance.recommendationsBySymbol(sym).then(async (rec: any) => {
          const peers = rec?.recommendedSymbols?.map((x: any) => x.symbol) || [];
          if (peers.length > 0) {
            const peer = peers[0];
            try {
              const pSum = await yahooFinance.quoteSummary(peer, { modules: ['price', 'defaultKeyStatistics', 'financialData'] }, { validateResult: false });
              return { symbol: peer, summary: pSum };
            } catch { return null; }
          }
          return null;
        }).catch(() => null)
      ]);
      return [res[0] as Record<string, any>, res[1] as any[], res[2] as any, res[3] as any[], res[4] as any];
    } catch {
      return [null, [] as any[], null, [] as any[], null];
    }
  })();

  if (!result || !priceHistory) return buildFallbackDetails(sym, isCrypto);
  console.log(`[StockDetails] ✓ ${sym} — fetched ${Object.keys(result).length} modules + ${priceHistory.length} price points`);

  const priceData = result.price || {};
  const summary = result.summaryDetail || {};
  const financial = result.financialData || {};
  const keyStats = result.defaultKeyStatistics || {};
  const profileData = result.assetProfile || {};
  const earningsHist = result.earningsHistory?.history || [];
  const earningsChart = result.earnings?.earningsChart?.quarterly || [];
  const financialsChart = result.earnings?.financialsChart?.quarterly || [];
  const holdersList = result.institutionOwnership?.ownershipList || [];
  const insiderTx = result.insiderTransactions?.transactions || [];
  const newsList = searchRes?.news || [];
  const fundHoldings = result.topHoldings?.holdings || [];
  const sectorWeights = result.topHoldings?.sectorWeightings || [];
  const aTrend = result.recommendationTrend?.trend || [];
  const calEvents = result.calendarEvents || null;
  const rawFilings = result.secFilings?.filings || [];

  // Determine asset type from price module
  const qt = safeStr(priceData.quoteType, 'EQUITY');
  const isETF = qt === 'ETF';

  // Build current price info
  const currentPrice = safeNum(priceData.regularMarketPrice) ?? safeNum(summary.previousClose) ?? 0;
  const previousClose = safeNum(summary.previousClose ?? summary.regularMarketPreviousClose) ?? currentPrice;
  const dayChange = currentPrice - previousClose;
  const dayChangePercent = previousClose !== 0 ? (dayChange / previousClose) * 100 : 0;

  const high52 = safeNum(summary.fiftyTwoWeekHigh) ?? currentPrice;
  const low52 = safeNum(summary.fiftyTwoWeekLow) ?? currentPrice;

  const details: StockDetails = {
    ticker: sym,
    fetchedAt: Date.now(),
    isCrypto,
    isETF,

    profile: {
      name: safeStr(priceData.longName || priceData.shortName, sym),
      sector: safeStr(profileData.sector, isCrypto ? 'Cryptocurrency' : 'Unknown'),
      industry: safeStr(profileData.industry, isCrypto ? 'Digital Assets' : 'Unknown'),
      description: safeStr(profileData.longBusinessSummary, ''),
      website: safeStr(profileData.website, ''),
      employees: safeNum(profileData.fullTimeEmployees),
      country: safeStr(profileData.country, ''),
      city: safeStr(profileData.city, ''),
      exchange: safeStr(priceData.exchangeName || priceData.exchange, ''),
      currency: safeStr(priceData.currency || summary.currency, 'USD'),
      quoteType: qt,
    },

    price: {
      current: currentPrice,
      previousClose,
      open: safeNum(summary.open ?? summary.regularMarketOpen) ?? currentPrice,
      dayHigh: safeNum(summary.dayHigh ?? summary.regularMarketDayHigh) ?? currentPrice,
      dayLow: safeNum(summary.dayLow ?? summary.regularMarketDayLow) ?? currentPrice,
      fiftyTwoWeekHigh: high52,
      fiftyTwoWeekLow: low52,
      fiftyDayAverage: safeNum(summary.fiftyDayAverage) ?? currentPrice,
      twoHundredDayAverage: safeNum(summary.twoHundredDayAverage) ?? currentPrice,
      volume: safeNum(summary.volume ?? summary.regularMarketVolume) ?? 0,
      averageVolume: safeNum(summary.averageVolume) ?? 0,
      averageVolume10Day: safeNum(summary.averageDailyVolume10Day ?? summary.averageVolume10days) ?? 0,
      marketCap: safeNum(summary.marketCap ?? priceData.marketCap) ?? 0,
      dayChange: Number(dayChange.toFixed(2)),
      dayChangePercent: Number(dayChangePercent.toFixed(2)),
      fiftyTwoWeekChangePercent: safeNum(keyStats['52WeekChange']) !== null 
        ? Number(((safeNum(keyStats['52WeekChange']) ?? 0) * 100).toFixed(2)) 
        : 0,
      distanceFrom52wHigh: high52 !== 0 ? Number((((currentPrice - high52) / high52) * 100).toFixed(2)) : 0,
      distanceFrom52wLow: low52 !== 0 ? Number((((currentPrice - low52) / low52) * 100).toFixed(2)) : 0,
    },

    valuation: {
      trailingPE: safeNum(summary.trailingPE),
      forwardPE: safeNum(summary.forwardPE ?? keyStats.forwardPE),
      pegRatio: safeNum(keyStats.pegRatio),
      priceToBook: safeNum(keyStats.priceToBook),
      priceToSales: safeNum(keyStats.priceToSales ?? (
        safeNum(summary.marketCap) && safeNum(financial.totalRevenue)
          ? (safeNum(summary.marketCap)! / safeNum(financial.totalRevenue)!)
          : null
      )),
      enterpriseValue: safeNum(keyStats.enterpriseValue),
      enterpriseToRevenue: safeNum(keyStats.enterpriseToRevenue),
      enterpriseToEbitda: safeNum(keyStats.enterpriseToEbitda),
      bookValue: safeNum(keyStats.bookValue),
    },

    profitability: {
      grossMargins: pct(safeNum(financial.grossMargins)),
      operatingMargins: pct(safeNum(financial.operatingMargins)),
      profitMargins: pct(safeNum(financial.profitMargins ?? keyStats.profitMargins)),
      returnOnAssets: pct(safeNum(financial.returnOnAssets)),
      returnOnEquity: pct(safeNum(financial.returnOnEquity)),
      revenueGrowth: pct(safeNum(financial.revenueGrowth)),
      earningsGrowth: pct(safeNum(financial.earningsGrowth)),
    },

    financialHealth: {
      totalCash: safeNum(financial.totalCash),
      totalCashPerShare: safeNum(financial.totalCashPerShare),
      totalDebt: safeNum(financial.totalDebt),
      debtToEquity: safeNum(financial.debtToEquity),
      currentRatio: safeNum(financial.currentRatio),
      quickRatio: safeNum(financial.quickRatio),
      totalRevenue: safeNum(financial.totalRevenue),
      revenuePerShare: safeNum(financial.revenuePerShare),
      ebitda: safeNum(financial.ebitda),
      freeCashflow: safeNum(financial.freeCashflow),
      operatingCashflow: safeNum(financial.operatingCashflow),
      grossProfits: safeNum(financial.grossProfits),
    },

    dividends: {
      dividendRate: safeNum(summary.dividendRate),
      dividendYield: safeNum(summary.dividendYield) !== null ? Number(((safeNum(summary.dividendYield)!) * 100).toFixed(2)) : null,
      exDividendDate: safeDateStr(summary.exDividendDate),
      payoutRatio: pct(safeNum(summary.payoutRatio)),
      fiveYearAvgDividendYield: safeNum(summary.fiveYearAvgDividendYield),
      lastDividendValue: safeNum(keyStats.lastDividendValue),
      lastDividendDate: safeDateStr(keyStats.lastDividendDate),
      hasDividend: (safeNum(summary.dividendYield) ?? 0) > 0,
    },

    analyst: {
      targetLow: safeNum(financial.targetLowPrice),
      targetMean: safeNum(financial.targetMeanPrice),
      targetMedian: safeNum(financial.targetMedianPrice),
      targetHigh: safeNum(financial.targetHighPrice),
      numberOfAnalysts: safeNum(financial.numberOfAnalystOpinions) ?? 0,
      recommendationKey: safeStr(financial.recommendationKey, null as any),
      recommendationMean: safeNum(financial.recommendationMean),
    },

    keyStats: {
      beta: safeNum(summary.beta),
      sharesOutstanding: safeNum(keyStats.sharesOutstanding),
      floatShares: safeNum(keyStats.floatShares),
      sharesShort: safeNum(keyStats.sharesShort),
      shortRatio: safeNum(keyStats.shortRatio),
      shortPercentOfFloat: pct(safeNum(keyStats.shortPercentOfFloat)),
      heldPercentInsiders: pct(safeNum(keyStats.heldPercentInsiders)),
      heldPercentInstitutions: pct(safeNum(keyStats.heldPercentInstitutions)),
      trailingEps: safeNum(keyStats.trailingEps),
      forwardEps: safeNum(keyStats.forwardEps),
      earningsQuarterlyGrowth: pct(safeNum(keyStats.earningsQuarterlyGrowth)),
      mostRecentQuarter: safeDateStr(keyStats.mostRecentQuarter),
      lastSplitFactor: safeStr(keyStats.lastSplitFactor, null as any),
      lastSplitDate: safeDateStr(keyStats.lastSplitDate),
    },

    earningsHistory: parseEarningsHistory(earningsHist),
    quarterlyReports: mergeQuarterlyData(earningsChart, financialsChart, priceHistory),
    topHolders: parseHolders(holdersList),
    news: parseNews(newsList),
    insiderTransactions: parseInsiders(insiderTx),
    etfHoldings: parseETFHoldings(fundHoldings),
    sectorExposure: parseSectorExposures(sectorWeights),
    alphaIntelligence: calculateAlpha(priceHistory, benchmarkHistory, isCrypto ? 'BTC' : 'SP500'),
    analystTrend: parseAnalystTrend(aTrend),
    riskMetrics: calculateRisk(priceHistory),
    upcomingCatalysts: parseCatalysts(calEvents),
    secFilings: parseFilings(rawFilings),
    peerBenchmark: parsePeer(peerData),
  };

  setInCache(cacheKey, details, CACHE_TTL.MARKET_DATA);
  return details;
}


// ─────────────────────────────────────────────────────
// EARNINGS PARSER
// ─────────────────────────────────────────────────────

function parseEarningsHistory(raw: any[]): EarningsQuarter[] {
  if (!raw || !Array.isArray(raw)) return [];
  
  return raw.map(q => {
    const actual = safeNum(q.epsActual);
    const estimate = safeNum(q.epsEstimate);
    const surprise = actual !== null && estimate !== null ? Number((actual - estimate).toFixed(4)) : null;
    const surprisePct = safeNum(q.surprisePercent);

    return {
      date: safeDateStr(q.quarter) ?? 'Unknown',
      actual,
      estimate,
      surprise,
      surprisePercent: surprisePct !== null ? Number((surprisePct * 100).toFixed(2)) : null,
    };
  }).reverse(); // Most recent first
}


// ─────────────────────────────────────────────────────
// FALLBACK (when API fails)
// ─────────────────────────────────────────────────────

function buildFallbackDetails(ticker: string, isCrypto: boolean): StockDetails {
  return {
    ticker,
    fetchedAt: Date.now(),
    isCrypto,
    isETF: false,
    profile: {
      name: ticker,
      sector: isCrypto ? 'Cryptocurrency' : 'Unknown',
      industry: isCrypto ? 'Digital Assets' : 'Unknown',
      description: '',
      website: '',
      employees: null,
      country: '',
      city: '',
      exchange: '',
      currency: 'USD',
      quoteType: isCrypto ? 'CRYPTOCURRENCY' : 'EQUITY',
    },
    price: {
      current: 0, previousClose: 0, open: 0, dayHigh: 0, dayLow: 0,
      fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0, fiftyDayAverage: 0,
      twoHundredDayAverage: 0, volume: 0, averageVolume: 0,
      averageVolume10Day: 0, marketCap: 0, dayChange: 0,
      dayChangePercent: 0, fiftyTwoWeekChangePercent: 0,
      distanceFrom52wHigh: 0, distanceFrom52wLow: 0,
    },
    valuation: {
      trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null,
      priceToSales: null, enterpriseValue: null, enterpriseToRevenue: null,
      enterpriseToEbitda: null, bookValue: null,
    },
    profitability: {
      grossMargins: null, operatingMargins: null, profitMargins: null,
      returnOnAssets: null, returnOnEquity: null, revenueGrowth: null,
      earningsGrowth: null,
    },
    financialHealth: {
      totalCash: null, totalCashPerShare: null, totalDebt: null,
      debtToEquity: null, currentRatio: null, quickRatio: null,
      totalRevenue: null, revenuePerShare: null, ebitda: null,
      freeCashflow: null, operatingCashflow: null, grossProfits: null,
    },
    dividends: {
      dividendRate: null, dividendYield: null, exDividendDate: null,
      payoutRatio: null, fiveYearAvgDividendYield: null,
      lastDividendValue: null, lastDividendDate: null, hasDividend: false,
    },
    analyst: {
      targetLow: null, targetMean: null, targetMedian: null, targetHigh: null,
      numberOfAnalysts: 0, recommendationKey: null, recommendationMean: null,
    },
    keyStats: {
      beta: null, sharesOutstanding: null, floatShares: null,
      sharesShort: null, shortRatio: null, shortPercentOfFloat: null,
      heldPercentInsiders: null, heldPercentInstitutions: null,
      trailingEps: null, forwardEps: null, earningsQuarterlyGrowth: null,
      mostRecentQuarter: null, lastSplitFactor: null, lastSplitDate: null,
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
  };
}

// ─────────────────────────────────────────────────────
// PARSE HOLDERS
// ─────────────────────────────────────────────────────

function parseHolders(list: any[]): Holder[] {
  if (!list) return [];
  return list.slice(0, 5).map(h => ({
    name: safeStr(h.organization, 'Unknown'),
    pctHeld: safeNum(h.pctHeld),
    value: safeNum(h.value),
    pctChange: safeNum(h.pctChange),
  }));
}

// ─────────────────────────────────────────────────────
// PARSE NEWS & INSIDERS
// ─────────────────────────────────────────────────────

function parseNews(list: any[]): NewsArticle[] {
  if (!list) return [];
  return list.map(n => ({
    title: safeStr(n.title),
    publisher: safeStr(n.publisher),
    link: safeStr(n.link),
    providerPublishTime: typeof n.providerPublishTime === 'number' ? n.providerPublishTime : Date.now() / 1000,
  }));
}

function parseInsiders(list: any[]): InsiderTransaction[] {
  if (!list) return [];
  return list.slice(0, 5).map(i => ({
    filerName: safeStr(i.filerName),
    filerRelation: safeStr(i.filerRelation),
    transactionText: safeStr(i.transactionText),
    shares: safeNum(i.shares),
    value: safeNum(i.value),
    startDate: safeStr(i.startDate),
  }));
}

function parseAnalystTrend(list: any[]): AnalystTrendEntry[] {
  if (!list || !Array.isArray(list)) return [];
  return list.map(t => ({
    period: safeStr(t.period, '0m'),
    strongBuy: safeNum(t.strongBuy) || 0,
    buy: safeNum(t.buy) || 0,
    hold: safeNum(t.hold) || 0,
    sell: safeNum(t.sell) || 0,
    strongSell: safeNum(t.strongSell) || 0,
  }));
}

function parseCatalysts(cal: any): UpcomingCatalysts | null {
  if (!cal) return null;
  const eDateStr = cal.earnings?.earningsDate?.[0];
  const eDate = eDateStr ? new Date(eDateStr).toISOString().split('T')[0] : null;

  const exDivDateStr = typeof cal.exDividendDate === 'string' || cal.exDividendDate instanceof Date ? cal.exDividendDate : null;
  const exDivDate = exDivDateStr ? new Date(exDivDateStr).toISOString().split('T')[0] : null;

  const divDateStr = typeof cal.dividendDate === 'string' || cal.dividendDate instanceof Date ? cal.dividendDate : null;
  const divDate = divDateStr ? new Date(divDateStr).toISOString().split('T')[0] : null;

  return {
    earningsDate: eDate,
    isEarningsEstimate: !!cal.earnings?.isEarningsDateEstimate,
    revenueAverage: safeNum(cal.earnings?.revenueAverage),
    earningsAverage: safeNum(cal.earnings?.earningsAverage),
    exDividendDate: exDivDate,
    dividendDate: divDate,
  };
}

function parseFilings(list: any[]): SECListing[] {
  if (!list || !Array.isArray(list)) return [];
  return list.map(f => ({
    date: safeStr(f.date),
    type: safeStr(f.type),
    title: safeStr(f.title),
    url: safeStr(f.edgarUrl || f.url),
  })).filter(f => f.date && f.type);
}

function parsePeer(peerData: any): PeerMetrics | null {
  if (!peerData || !peerData.summary) return null;
  const pSum = peerData.summary;
  const price = pSum.price || {};
  const fd = pSum.financialData || {};
  const ks = pSum.defaultKeyStatistics || {};

  return {
    ticker: peerData.symbol,
    name: safeStr(price.longName || price.shortName, peerData.symbol),
    price: safeNum(price.regularMarketPrice) || 0,
    forwardPE: safeNum(ks.forwardPE) || safeNum(price.forwardPE),
    profitMargin: safeNum(fd.profitMargins),
    revenueGrowth: safeNum(fd.revenueGrowth),
  };
}

function parseETFHoldings(list: any[]): ETFHolding[] {
  if (!list) return [];
  return list.map(h => ({
    symbol: safeStr(h.symbol, '—'),
    name: safeStr(h.holdingName, 'Unknown'),
    pct: safeNum(h.holdingPercent),
  }));
}

function parseSectorExposures(list: any[]): SectorExposure[] {
  if (!list) return [];
  return list.map(item => {
    const sector = Object.keys(item)[0];
    const weight = safeNum(item[sector]);
    return {
      sector: formatSectorName(sector),
      weight: weight ?? 0
    };
  }).filter(s => s.weight > 0);
}

function formatSectorName(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function calculateAlpha(history: any[], benchmark: any[], benchLabel: string): BenchmarkPerformance | null {
  if (history.length < 250 || benchmark.length < 250) return null;
  
  const assetNow = history[history.length - 1].close;
  const assetThen = history[history.length - 250].close;
  const assetRet = (assetNow - assetThen) / assetThen;

  const benchNow = benchmark[benchmark.length - 1].close;
  const benchThen = benchmark[benchmark.length - 250].close;
  const benchRet = (benchNow - benchThen) / benchThen;

  return {
    assetReturn1Y: assetRet,
    benchmarkReturn1Y: benchRet,
    alpha1Y: assetRet - benchRet,
    benchmarkTicker: benchLabel
  };
}

function calculateRisk(history: any[]): RiskMetrics | null {
  if (history.length < 50) return null;
  
  const windowSize = Math.min(history.length, 252);
  const recentHistory = history.slice(-windowSize);
  
  let maxPx = 0;
  let maxDD = 0;
  
  const returns: number[] = [];

  for (let i = 0; i < recentHistory.length; i++) {
    const px = recentHistory[i].close;
    if (i > 0) {
      const prevPx = recentHistory[i-1].close;
      returns.push((px - prevPx) / prevPx);
    }
    if (px > maxPx) maxPx = px;
    const dd = (px - maxPx) / maxPx;
    if (dd < maxDD) maxDD = dd;
  }

  // Volatility
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1);
  const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

  return {
    maxDrawdown1Y: maxDD * 100,
    realizedVolatility1Y: volatility * 100
  };
}

// ─────────────────────────────────────────────────────
// MERGE QUARTERLY DATA
// ─────────────────────────────────────────────────────

function mergeQuarterlyData(earnings: any[], financials: any[], history: any[] = []): QuarterlyReport[] {
  if (!earnings || !financials) return [];

  // Create a map of financials by date
  const finMap = new Map();
  financials.forEach(f => finMap.set(f.date, f));

  return earnings.map(e => {
    const f = finMap.get(e.date) || {};
    const reportTimestamp = e.reportedDate || 0;
    
    // Calculate price reaction (Day of vs Next Day)
    let reaction = null;
    let reactionPct = null;

    if (history.length > 0 && reportTimestamp > 0) {
      // Find the index of the report date
      const reportIdx = history.findIndex(h => h.time >= reportTimestamp);
      if (reportIdx !== -1 && reportIdx < history.length - 1) {
        const prePrice = history[reportIdx].close;
        const postPrice = history[reportIdx + 1].close;
        reaction = postPrice - prePrice;
        reactionPct = Number(((reaction / prePrice) * 100).toFixed(2));
      }
    }
    
    return {
      date: e.date,
      fiscalQuarter: e.fiscalQuarter || e.date,
      revenue: safeNum(f.revenue),
      netIncome: safeNum(f.earnings),
      epsActual: safeNum(e.actual),
      epsEstimate: safeNum(e.estimate),
      epsSurprise: e.actual !== null && e.estimate !== null ? Number((e.actual - e.estimate).toFixed(4)) : null,
      epsSurprisePercent: safeNum(e.surprisePct),
      reportedDate: e.reportedDate ? new Date(e.reportedDate * 1000).toISOString().split('T')[0] : null,
      priceReaction: reaction,
      priceReactionPct: reactionPct,
    };
  }).reverse();
}
