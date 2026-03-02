/**
 * Institutional Execution Engine: Alpaca REST API Client
 * Built using high-performance fetch for low-latency Next.js Server Actions.
 */

const API_KEY = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
const SECRET_KEY = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;
const BASE_URL = "https://paper-api.alpaca.markets/v2";

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

async function alpacaFetch(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY || !SECRET_KEY) {
    throw new Error("Alpaca API keys are missing. Integration inactive.");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "APCA-API-KEY-ID": API_KEY,
      "APCA-API-SECRET-KEY": SECRET_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
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
  const res = await fetch(`${DATA_URL}/stocks/${symbol}/quotes/latest`, {
    headers: {
      "APCA-API-KEY-ID": API_KEY!,
      "APCA-API-SECRET-KEY": SECRET_KEY!,
    }
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.quote; // { ap: ask_price, as: ask_size, bp: bid_price, bs: bid_size, t: timestamp }
}
