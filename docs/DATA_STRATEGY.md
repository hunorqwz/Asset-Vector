# Data Architecture Strategy: Massive Scale Real-Time Polling

## Objective
Migrate from Yahoo Finance to a true institutional-grade real-time market data architecture that can support a massive user base (millions of users) for a low, fixed monthly cost.

## The Architecture
**1. Alpaca API ($99/month - Algo Trader Plus)**
*   **Purpose:** The sole source of real-time price ticks and volume data via WebSocket.
*   **Why:** Provides 10,000 requests per minute and unlimited WebSocket connections to the SIP feed (100% full US market coverage). The absolute cheapest way to get unfiltered, real-time tick data.

**2. Finnhub.io ($0/month - Free Tier)**
*   **Purpose:** Deep fundamentals, SEC filings, insider trading, AI sentiment data.
*   **Why:** Generous 60 RPM free tier for non-price fundamental data that powers the "Glass Box" intelligence layer.

## The Scaling Mechanism (How to support infinite users for $99)
Do **not** connect the client's browser directly to Alpaca or Finnhub.

1.  **Backend Aggregation:** Your backend server (e.g., Node.js / Go) establishes exactly **one** WebSocket connection to Alpaca.
2.  **Broadcast:** The backend broadcasts these live price ticks to all connected end-users via your own WebSocket server or Server-Sent Events (SSE).
3.  **Fundamental Caching:** The backend polls Finnhub a few times a day for fundamentals (SEC filings, sentiment) and strictly caches them in Redis/memory. Users fetch this from your cache, meaning Finnhub only ever receives a handful of requests a day.

## Client-Side Implementation (Lightweight Charts)
*   **Dom Stability:** Initialize `createChart` strictly once on mount. Do not trigger React re-renders for live data.
*   **Differential Hydration:** As the backend broadcasts ticks, pass only the delta to `chartSeries.update({ time, open, high, low, close })`. This modifies the final candle in real-time smoothly, with zero visual flashing or panning resets.
*   **Memory Management:** Ensure WebSocket listeners and polling loops are strictly bound to the component lifecycle and disconnected on unmount.
