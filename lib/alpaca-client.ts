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
