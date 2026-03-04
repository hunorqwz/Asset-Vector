# ASSET VECTOR | SURGICAL WEALTH

High-precision, professional-grade market intelligence dashboard.
Built with **Next.js 16**, **Tailwind 4.0**, **Gemini 2.5 Flash-Lite**, and **Neon Serverless Postgres**.

## 🚀 The Intelligence Engine
Asset Vector uses a multi-layered approach to signal generation:
1.  **Data Ingestion**: Yahoo Finance (Primary) with Alpaca SIP Cross-Validation.
2.  **Signal Processing**: 1D Kalman Filter to separate Market Noise from True Price Action.
3.  **AI Inference & Analysis**: Google Gemini 2.5 Flash-Lite orchestrating narrative sentiment, earnings tone forensics, and strategic price pathway modeling.
4.  **Local Alpha Engine**: Multi-factor clustering for support/resistance, dark pool prints, and momentum structures.

## 🛠️ Tech Stack
-   **Framework**: Next.js 16 (App Router + Server Actions)
-   **Styling**: Tailwind CSS 4.0 ("Noir" Theme: `#050505`)
-   **AI Foundation**: `@google/generative-ai` (Gemini 2.5)
-   **Math**: Custom TypeScript Kalman Filter & Variance Engine (`lib/math.ts`)
-   **Database**: Neon Serverless Postgres with SPLR Caching pattern (Schema in `db/schema.ts`)

## ⚡ Quick Start
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Setup your environment variables (`.env`):
    - `DATABASE_URL` (Neon)
    - `GOOGLE_GENERATIVE_AI_API_KEY`
    - `ALPACA_API_KEY` & `ALPACA_API_SECRET`
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000)

## 📐 Architecture Highlights
-   **SPLR Cache Design**: Combines `systemKv` Postgres tables with in-memory `l1Cache` maps. Fetches are aggressively debounced preventing API throttling.
-   **Signal Generation**: `lib/market-data.ts` builds the core `MarketSignal` which is cached and rehydrated via `getPersistentSignal()`.
-   **Portfolio Risk**: `lib/portfolio-risk.ts` calculates Jensen's Alpha, Beta mapping, and VaR simultaneously on local data.
