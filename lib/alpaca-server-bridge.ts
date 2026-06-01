import { RawTick } from "./streaming-prediction";

export interface SSEClient {
  id: string;
  tickers: Set<string>;
  send: (data: any) => void;
}

class AlpacaServerBridge {
  private ws: WebSocket | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private activeTickers: Set<string> = new Set();
  private isAuthenticated = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Throttling maps
  private pendingTicks: Map<string, any> = new Map();
  private throttleTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.warn("[Alpaca Server Bridge] Missing secure ALPACA_API_KEY or ALPACA_API_SECRET. Streaming disabled.");
      return;
    }

    const url = "wss://stream.data.alpaca.markets/v2/iex";
    console.log("[Alpaca Server Bridge] Connecting to Alpaca server-side...");

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("[Alpaca Server Bridge] Failed to initialize WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    const ws = this.ws;
    if (!ws) return;

    ws.onopen = () => {
      console.log("[Alpaca Server Bridge] WebSocket connected. Authenticating...");
      ws.send(
        JSON.stringify({
          action: "auth",
          key: apiKey,
          secret: apiSecret,
        })
      );
    };

    ws.onmessage = (event: any) => {
      try {
        const rawData = typeof event.data === "string" ? event.data : event.data.toString();
        const data = JSON.parse(rawData);
        if (!Array.isArray(data)) return;

        data.forEach((msg: any) => {
          if (msg.T === "success" && msg.msg === "authenticated") {
            console.log("[Alpaca Server Bridge] Successfully authenticated.");
            this.isAuthenticated = true;
            this.syncSubscriptions();
          } else if (msg.T === "error") {
            console.warn(`[Alpaca Server Bridge] Alpaca stream error: [${msg.code}] ${msg.msg}`);
            if (msg.code === 409 || msg.code === 403) {
              ws.close();
            }
          } else if (msg.T === "t" && msg.S) {
            this.handleTick({
              ticker: msg.S,
              price: msg.p,
              size: msg.s,
              timestamp: msg.t,
              exchange: msg.x,
            });
          }
        });
      } catch (err) {
        console.error("[Alpaca Server Bridge] Error parsing message:", err);
      }
    };

    ws.onerror = (err: any) => {
      console.error("[Alpaca Server Bridge] WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("[Alpaca Server Bridge] WebSocket closed.");
      this.isAuthenticated = false;
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
  }

  private handleTick(tick: { ticker: string; price: number; size: number; timestamp: string; exchange: string }) {
    const ticker = tick.ticker;

    if (this.throttleTimeouts.has(ticker)) {
      // Throttle window active. Stash the latest tick for trailing edge delivery.
      this.pendingTicks.set(ticker, tick);
      return;
    }

    // Deliver immediately
    this.broadcastTick(tick);

    // Set throttle timer (e.g. 400ms spacing between updates)
    const timeout = setTimeout(() => {
      this.throttleTimeouts.delete(ticker);
      const pending = this.pendingTicks.get(ticker);
      if (pending) {
        this.pendingTicks.delete(ticker);
        // Recursively trigger to either send immediately or register new throttle
        this.handleTick(pending);
      }
    }, 400);

    this.throttleTimeouts.set(ticker, timeout);
  }

  private broadcastTick(tick: { ticker: string; price: number; size: number; timestamp: string; exchange: string }) {
    this.clients.forEach((client) => {
      if (client.tickers.has(tick.ticker)) {
        client.send(tick);
      }
    });
  }

  private syncSubscriptions() {
    const ws = this.ws;
    if (!this.isAuthenticated || !ws) return;

    const tickersNeeded = new Set<string>();
    this.clients.forEach((c) => {
      c.tickers.forEach((t) => tickersNeeded.add(t));
    });

    const toSubscribe = Array.from(tickersNeeded).filter((t) => !this.activeTickers.has(t));
    const toUnsubscribe = Array.from(this.activeTickers).filter((t) => !tickersNeeded.has(t));

    if (toSubscribe.length > 0) {
      console.log("[Alpaca Server Bridge] Subscribing to:", toSubscribe);
      ws.send(JSON.stringify({ action: "subscribe", trades: toSubscribe }));
      toSubscribe.forEach((t) => this.activeTickers.add(t));
    }

    if (toUnsubscribe.length > 0) {
      console.log("[Alpaca Server Bridge] Unsubscribing from:", toUnsubscribe);
      ws.send(JSON.stringify({ action: "unsubscribe", trades: toUnsubscribe }));
      toUnsubscribe.forEach((t) => {
        this.activeTickers.delete(t);
        this.pendingTicks.delete(t);
        const timeout = this.throttleTimeouts.get(t);
        if (timeout) {
          clearTimeout(timeout);
          this.throttleTimeouts.delete(t);
        }
      });
    }
  }

  public registerClient(client: SSEClient) {
    this.clients.set(client.id, client);
    this.syncSubscriptions();
  }

  public unregisterClient(clientId: string) {
    this.clients.delete(clientId);
    this.syncSubscriptions();
  }
}

// Global singleton declaration for Next.js hot-reload safety
declare global {
  var globalAlpacaBridge: AlpacaServerBridge | undefined;
}

export const alpacaBridge = globalThis.globalAlpacaBridge || new AlpacaServerBridge();

if (process.env.NODE_ENV !== "production") {
  globalThis.globalAlpacaBridge = alpacaBridge;
}
