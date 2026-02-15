# ASSET VECTOR | SURGICAL WEALTH

High-precision, professional-grade market intelligence dashboard.
Built with **Next.js 16**, **Tailwind 4.0**, and **Neon Serverless Postgres**.

## 🚀 The Intelligence Engine
Asset Vector uses a multi-layered approach to signal generation:
1.  **Data Ingestion**: Institutional-grade feeds (Simulated GBM in Dev).
2.  **Signal Processing**: 1D Kalman Filter to separate Market Noise from True Price Action.
3.  **AI Inference**: Temporal Fusion Transformer (TFT) running via ONNX Runtime (Skeleton Implemented).

## 🛠️ Tech Stack
-   **Framework**: Next.js 16 (App Router + Server Actions)
-   **Styling**: Tailwind CSS 4.0 ("Noir" Theme: `#050505`)
-   **Math**: Custom TypeScript Kalman Filter (`lib/kalman.ts`)
-   **Database**: Neon (Schema in `db/schema.sql`)

## ⚡ Quick Start
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000)

## 📐 Architecture
-   `app/page.tsx`: Mission Control Dashboard (Bento Grid).
-   `app/actions.ts`: Server Actions for fetching market signals.
-   `lib/kalman.ts`: Mathematical core for signal smoothing.
-   `lib/market-data.ts`: Data pipeline and volatility simulation.
-   `lib/inference.ts`: ONNX Runtime integration point.

## ⚠️ "Zero-Cost" Dev Mode Limits
Currently running in **Hybrid Mode**:
- **BTC-USD**: Fetches live data via Yahoo Finance (First request success).
- **Other Tickers**: Fallback to Simulated GBM due to strict rate limits on the free tier library without an API key.

To switch to **Production Mode**:
1.  Get an API Key from **Twelve Data** or **Alpaca**.
2.  Update `fetchMarketData` in `lib/market-data.ts` to use the official SDK.
3.  Deploy to **Vercel**:
    - Build Command: `next build`
    - Environment Variables: `DATABASE_URL` (Neon Postgres)
