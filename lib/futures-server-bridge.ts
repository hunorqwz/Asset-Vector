export interface FuturesSSEClient {
  id: string;
  tickers: Set<string>;
  send: (data: any) => void;
}

class FuturesServerBridge {
  private clients: Map<string, FuturesSSEClient> = new Map();

  public registerClient(client: FuturesSSEClient) {
    this.clients.set(client.id, client);
    console.log(`[Futures Bridge] Client ${client.id} registered. Total: ${this.clients.size}`);
  }

  public unregisterClient(id: string) {
    this.clients.delete(id);
    console.log(`[Futures Bridge] Client ${id} unregistered. Total: ${this.clients.size}`);
  }

  /**
   * Broadcasts a real-time tick (trade or quote) to matching clients.
   */
  public broadcastTick(ticker: string, tick: any) {
    const uppercaseTicker = ticker.toUpperCase();
    this.clients.forEach((client) => {
      if (client.tickers.has("*") || client.tickers.has(uppercaseTicker)) {
        client.send({ type: "tick", ticker: uppercaseTicker, ...tick });
      }
    });
  }

  /**
   * Broadcasts an alert trigger immediately to all active clients.
   */
  public broadcastAlert(alert: any) {
    this.clients.forEach((client) => {
      client.send({ type: "alert", alert });
    });
  }
}

const globalForBridge = global as unknown as { futuresBridge: FuturesServerBridge };
export const futuresBridge = globalForBridge.futuresBridge || new FuturesServerBridge();

if (process.env.NODE_ENV !== "production") {
  globalForBridge.futuresBridge = futuresBridge;
}
