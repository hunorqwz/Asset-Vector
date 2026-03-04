
import { getFromCache, setInCache } from './cache';
import { RegimeDetector, MarketRegime } from './regime';
import { fetchHistoryWithInterval, fetchMultiLiveQuotes } from './market-data';

export interface SectorMetric {
  name: string;
  ticker: string;
  changePercent: number;
}

export interface MarketPulseData {
  breadthAdvancing: number;
  breadthDeclining: number;
  breadthPercent: number; // 0-100
  sectors: SectorMetric[];
  regime: {
    type: MarketRegime;
    score: number;
    predictability: number;
  };
  macro: {
    vix: { value: number; change: number };
    dxy: { value: number; change: number };
    us10y: { value: number; change: number };
    spy: { value: number; change: number };
    qqq: { value: number; change: number };
    btc: { value: number; change: number };
  };
}

const SECTOR_ETFS: Record<string, string> = {
  "Technology": "XLK",
  "Financials": "XLF",
  "Healthcare": "XLV",
  "Energy": "XLE",
  "Cons. Disc.": "XLY",
  "Cons. Staples": "XLP",
  "Industrials": "XLI",
  "Utilities": "XLU",
  "Materials": "XLB",
  "Real Estate": "XLRE",
  "Comms": "XLC",
};

const MACRO_TICKERS = {
  vix: "^VIX",
  dxy: "DX-Y.NYB",
  us10y: "^TNX",
  spy: "SPY",
  qqq: "QQQ",
  btc: "BTC-USD"
};

export async function fetchMarketPulse(): Promise<MarketPulseData> {
  const CACHE_KEY = "market_pulse_data_v2";
  const cached = getFromCache<MarketPulseData>(CACHE_KEY);
  if (cached) return cached;

  const sectorTickers = Object.values(SECTOR_ETFS);
  const macroTickersSet = Object.values(MACRO_TICKERS);
  
  const [quoteMap, spyHistory] = await Promise.all([
    fetchMultiLiveQuotes([...sectorTickers, ...macroTickersSet]),
    fetchHistoryWithInterval("SPY", "1d", 252 * 86400).catch(() => [])
  ]);

  const sectors: SectorMetric[] = [];
  let advancing = 0;
  let declining = 0;

  sectorTickers.forEach((ticker, i) => {
    const q = quoteMap[ticker];
    if (!q) return;
    const sectorLabel = Object.keys(SECTOR_ETFS)[i];
    
    sectors.push({
      name: sectorLabel,
      ticker: ticker,
      changePercent: q.changePercent
    });

    if (q.changePercent > 0) advancing++;
    else if (q.changePercent < 0) declining++;
  });

  const total = advancing + declining;
  const breadthPercent = total > 0 ? (advancing / total) * 100 : 50;

  const getMacro = (ticker: string) => {
    const q = quoteMap[ticker];
    return { 
      value: q?.price || 0, 
      change: q?.changePercent || 0 
    };
  };

  // Regime Detection
  const regimeInfo = RegimeDetector.detect(spyHistory.map((h: any) => h.close));

  const result: MarketPulseData = {
    breadthAdvancing: advancing,
    breadthDeclining: declining,
    breadthPercent: Number(breadthPercent.toFixed(0)),
    sectors: sectors.sort((a: any, b: any) => b.changePercent - a.changePercent),
    regime: {
      type: regimeInfo.regime,
      score: regimeInfo.score,
      predictability: regimeInfo.predictability
    },
    macro: {
      vix: getMacro(MACRO_TICKERS.vix),
      dxy: getMacro(MACRO_TICKERS.dxy),
      us10y: getMacro(MACRO_TICKERS.us10y),
      spy: getMacro(MACRO_TICKERS.spy),
      qqq: getMacro(MACRO_TICKERS.qqq),
      btc: getMacro(MACRO_TICKERS.btc)
    }
  };

  setInCache(CACHE_KEY, result, 120 * 1000); 
  return result;
}

export function detectSectorAlpha(ticker: string, tickerChange: number, sectorData: MarketPulseData, sectorOverride?: string): boolean {
  const tickerSectorMap: Record<string, string> = {
    "AAPL": "Technology", "NVDA": "Technology", "MSFT": "Technology", "GOOGL": "Comms", "META": "Comms",
    "JPM": "Financials", "GS": "Financials", "V": "Financials",
    "XOM": "Energy", "CVX": "Energy", "TSLA": "Cons. Disc.", "AMZN": "Cons. Disc.",
    "JNJ": "Healthcare", "LLY": "Healthcare",
  };

  const sectorName = sectorOverride || tickerSectorMap[ticker];
  if (!sectorName) return false;

  const sector = sectorData.sectors.find(s => s.name === sectorName);
  if (!sector) return false;

  return tickerChange > (sector.changePercent + 1);
}
