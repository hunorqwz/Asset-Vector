import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

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

import { getFromCache, setInCache } from './cache';

export async function fetchMarketPulse(): Promise<MarketPulseData> {
  const CACHE_KEY = "market_pulse_data";
  const cached = getFromCache<MarketPulseData>(CACHE_KEY);
  if (cached) return cached;

  const sectorTickers = Object.values(SECTOR_ETFS);
  const macroTickers = Object.values(MACRO_TICKERS);
  
  const [sectorQuotes, macroQuotes] = await Promise.all([
    Promise.all(sectorTickers.map(t => yahooFinance.quoteCombine(t).catch(() => null))),
    Promise.all(macroTickers.map(t => yahooFinance.quoteCombine(t).catch(() => null)))
  ]);

  const sectors: SectorMetric[] = [];
  let advancing = 0;
  let declining = 0;

  sectorQuotes.forEach((q: any, i: number) => {
    if (!q) return;
    const tickerName = Object.keys(SECTOR_ETFS)[i];
    const change = q.regularMarketChangePercent || 0;
    
    sectors.push({
      name: tickerName,
      ticker: sectorTickers[i],
      changePercent: change
    });

    if (change > 0) advancing++;
    else if (change < 0) declining++;
  });

  const total = advancing + declining;
  const breadthPercent = total > 0 ? (advancing / total) * 100 : 50;

  const m = (idx: number) => {
    const q: any = macroQuotes[idx];
    return { 
      value: q?.regularMarketPrice || 0, 
      change: q?.regularMarketChangePercent || 0 
    };
  };

  const result: MarketPulseData = {
    breadthAdvancing: advancing,
    breadthDeclining: declining,
    breadthPercent: Number(breadthPercent.toFixed(0)),
    sectors: sectors.sort((a, b) => b.changePercent - a.changePercent),
    macro: {
      vix: m(0),
      dxy: m(1),
      us10y: m(2),
      spy: m(3),
      qqq: m(4),
      btc: m(5)
    }
  };

  setInCache(CACHE_KEY, result, 60 * 1000);
  return result;
}

export function detectSectorAlpha(ticker: string, tickerChange: number, sectorData: MarketPulseData): boolean {
  // Simplistic mapping for top names to demonstrate Alpha discovery
  const tickerSectorMap: Record<string, string> = {
    "AAPL": "Technology", "NVDA": "Technology", "MSFT": "Technology", "GOOGL": "Comms", "META": "Comms",
    "JPM": "Financials", "GS": "Financials", "V": "Financials",
    "XOM": "Energy", "CVX": "Energy", "TSLA": "Cons. Disc.", "AMZN": "Cons. Disc.",
    "JNJ": "Healthcare", "LLY": "Healthcare",
  };

  const sectorName = tickerSectorMap[ticker];
  if (!sectorName) return false;

  const sector = sectorData.sectors.find(s => s.name === sectorName);
  if (!sector) return false;

  // Alpha if outperforming sector by > 1% (1D)
  return tickerChange > (sector.changePercent + 1);
}
