/**
 * Institutional Execution Engine: Alpaca REST API Client
 * Built using high-performance fetch for low-latency Next.js Server Actions.
 */

const API_KEY = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_API_SECRET;
const BASE_URL = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets/v2";

export interface AlpacaAccount {
  id: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

async function alpacaFetch<T>(endpoint: string, options: RequestInit = {}, retries = 3, baseUrl = BASE_URL): Promise<T> {
  if (!API_KEY || !SECRET_KEY) {
    // console.warn("Alpaca API keys are missing. Integration inactive.");
    return Promise.reject(new Error("ALPACA_MISSING_KEYS"));
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "APCA-API-KEY-ID": API_KEY,
      "APCA-API-SECRET-KEY": SECRET_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 429 && retries > 0) {
       // Automatic Retry on Rate Limit (1s delay)
       await new Promise(r => setTimeout(r, 1000));
       return alpacaFetch(endpoint, options, retries - 1, baseUrl);
    }
    const errorBody = await response.text();
    throw new Error(`Alpaca API Error [${response.status}]: ${errorBody}`);
  }

  return response.json();
}


/**
 * Fetches current account status and buying power.
 */
export async function getAlpacaAccount(): Promise<AlpacaAccount> {
  return alpacaFetch("/account");
}

/**
 * Fetches all open positions.
 */
export async function getAlpacaPositions(): Promise<AlpacaPosition[]> {
  return alpacaFetch("/positions");
}

/**
 * Places a market or limit order.
 * institutional-grade execution defaults to MARKET for immediate liquidity access.
 */
export async function placeAlpacaOrder(
  symbol: string,
  qty: string,
  side: "buy" | "sell",
  type: "market" | "limit" = "market",
  time_in_force: string = "day",
  limitPrice?: string
) {
  const body: any = {
    symbol,
    qty,
    side,
    type,
    time_in_force,
  };

  if (type === "limit" && limitPrice) {
    body.limit_price = limitPrice;
  }

  return alpacaFetch("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Fetches current quotes (Bid/Ask) for instantaneous order book view.
 * Uses the Alpaca Data API v2.
 */
export async function getAlpacaQuote(symbol: string) {
  const DATA_URL = "https://data.alpaca.markets/v2";
  try {
    const data: any = await alpacaFetch(`/stocks/${symbol}/quotes/latest`, {}, 3, DATA_URL);
    return data.quote; // { ap: ask_price, as: ask_size, bp: bid_price, bs: bid_size, t: timestamp }
  } catch (err: any) {
    if (err.message !== "ALPACA_MISSING_KEYS") {
      console.error(`Failed to fetch Alpaca quote for ${symbol}:`, err);
    }
    return null;
  }
}

export interface AlpacaBar {
  time: number;   // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type AlpacaTimeframe = "1Min" | "5Min" | "15Min" | "1Hour" | "1Day";

/**
 * Fetches OHLCV bars from the Alpaca Data API v2.
 * 
 * Data feed tiers:
 *   - "iex"  — Free / Unlimited plan: ~35% of US equity tape (IEX only)
 *   - "sip"  — Algo Trader Plus ($99/mo): 100% US market tape (all exchanges)
 * 
 * Defaults to IEX so the free plan always works. Set ALPACA_FEED=sip in env
 * to unlock the full SIP feed when running on the paid plan.
 */
export async function fetchAlpacaBars(
  symbol: string,
  timeframe: AlpacaTimeframe,
  startIso: string,
  endIso?: string,
  limit: number = 1000
): Promise<AlpacaBar[]> {
  const DATA_URL = "https://data.alpaca.markets/v2";
  const feed = process.env.ALPACA_FEED || "iex"; // "iex" (free) or "sip" (paid)

  try {
    const params = new URLSearchParams({
      timeframe,
      start: startIso,
      limit: String(Math.min(limit, 10000)),
      feed,
      adjustment: "split", // Auto split-adjust bars
    });
    if (endIso) params.set("end", endIso);

    const bars: AlpacaBar[] = [];
    let nextPageToken: string | undefined;

    // Alpaca paginates at 10,000 bars. Loop to collect full range.
    do {
      if (nextPageToken) params.set("page_token", nextPageToken);

      const data: any = await alpacaFetch(
        `/stocks/${encodeURIComponent(symbol)}/bars?${params.toString()}`,
        {},
        3,
        DATA_URL
      );

      const rawBars: any[] = data.bars || [];
      for (const b of rawBars) {
        bars.push({
          time: Math.floor(new Date(b.t).getTime() / 1000),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v,
        });
      }

      nextPageToken = data.next_page_token || undefined;
    } while (nextPageToken && bars.length < limit);

    return bars;
  } catch (err: any) {
    if (err.message !== "ALPACA_MISSING_KEYS") {
      console.error(`[Alpaca Bars] Failed to fetch ${timeframe} bars for ${symbol}:`, err.message);
    }
    return [];
  }
}
