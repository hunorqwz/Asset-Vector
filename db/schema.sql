-- ASSET VECTOR // SURGICAL WEALTH SCHEMA
-- TARGET: NEON (Serverless Postgres)
-- VERSION: 0.1.0

-- 1. USERS & ACCESS CONTROL
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'institution')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 2. ASJET REGISTRY
CREATE TABLE assets (
  ticker VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  sector VARCHAR(50),
  exchange VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB -- Logo, description, etc.
);

-- 3. MARKET DATA (Optimized for Time-Series)
-- In production, we enable TimescaleDB extension if available, or use partitioning.
CREATE TABLE market_data_1h (
  ticker VARCHAR(10) REFERENCES assets(ticker),
  time TIMESTAMPTZ NOT NULL,
  open NUMERIC(18, 8) NOT NULL,
  high NUMERIC(18, 8) NOT NULL,
  low NUMERIC(18, 8) NOT NULL,
  close NUMERIC(18, 8) NOT NULL,
  volume NUMERIC(24, 8) NOT NULL,
  PRIMARY KEY (ticker, time)
);
CREATE INDEX idx_market_data_time ON market_data_1h(time DESC);

-- 4. INTELLIGENCE ENGINE OUTPUS (The Predictive Trinity)
CREATE TABLE signals (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(10) REFERENCES assets(ticker),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- The Trinity
  direction VARCHAR(10) CHECK (direction IN ('bull', 'bear', 'neutral')),
  target_price NUMERIC(18, 8),
  horizon_days INTEGER NOT NULL,
  
  -- Precision Metrics
  confidence_score NUMERIC(5, 2), -- 0.00 to 100.00
  signal_to_noise_ratio NUMERIC(10, 4),
  
  -- Explainability (XAI)
  shap_factors JSONB, -- e.g. {"RSI": +0.2, "Sentiment": -0.1}
  regime_context VARCHAR(50) -- 'Mean Reversion', 'Trend', 'Volatile'
);

-- 5. CACHE / PRE-COMPUTE (For Zero Latency)
-- Stores the latest "Hot" signal for immediate frontend fetch via Next.js
CREATE TABLE signal_cache (
  ticker VARCHAR(10) PRIMARY KEY REFERENCES assets(ticker),
  signal_id BIGINT REFERENCES signals(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
