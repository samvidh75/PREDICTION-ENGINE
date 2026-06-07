-- 007_create_master_registry.sql
-- TRACK-21 Phase 2 Task 6: master_security_registry table
--
-- Canonical source of truth for all securities tracked by StockStory.
-- Populated by RegistryUpdater.runUpdate() nightly.
-- Used by the population pipeline as the authoritative symbol list.

CREATE TABLE IF NOT EXISTS master_security_registry (
  id SERIAL PRIMARY KEY,

  -- Core identifiers
  symbol VARCHAR(20) NOT NULL UNIQUE,
  isin VARCHAR(12),
  company_name VARCHAR(255) NOT NULL,
  nse_symbol VARCHAR(20),
  bse_symbol VARCHAR(20),

  -- Classification
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap_category VARCHAR(20) DEFAULT 'Unknown'
    CHECK (market_cap_category IN ('Large Cap', 'Mid Cap', 'Small Cap', 'Unknown')),

  -- Exchange info
  exchange VARCHAR(10) DEFAULT 'NSE',
  series VARCHAR(10) DEFAULT 'EQ',

  -- Lifecycle status
  listing_status VARCHAR(20) DEFAULT 'Active'
    CHECK (listing_status IN ('Active', 'Delisted', 'Suspended', 'Merged')),

  -- Metadata
  face_value NUMERIC,
  listing_date DATE,
  data_sources TEXT[] DEFAULT '{}',
  last_verified DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_msr_sector ON master_security_registry (sector);
CREATE INDEX IF NOT EXISTS idx_msr_status ON master_security_registry (listing_status);
CREATE INDEX IF NOT EXISTS idx_msr_market_cap ON master_security_registry (market_cap_category);
CREATE INDEX IF NOT EXISTS idx_msr_isin ON master_security_registry (isin) WHERE isin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_msr_last_verified ON master_security_registry (last_verified);

-- Provider health metrics table (for ProviderHealthService persistence)
CREATE TABLE IF NOT EXISTS provider_health_metrics (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(100) NOT NULL,
  recorded_at DATE NOT NULL,

  total_calls INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,4) DEFAULT 0,

  avg_latency_ms NUMERIC(10,2) DEFAULT 0,
  p50_latency_ms NUMERIC(10,2) DEFAULT 0,
  p95_latency_ms NUMERIC(10,2) DEFAULT 0,

  field_completeness NUMERIC(5,4) DEFAULT 0,
  rate_limit_events INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,

  status VARCHAR(20) DEFAULT 'Healthy',
  circuit_breaker_state VARCHAR(20) DEFAULT 'Unknown',

  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,

  UNIQUE (provider_name, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_phm_provider_date ON provider_health_metrics (provider_name, recorded_at DESC);

-- Financial statements table
CREATE TABLE IF NOT EXISTS financial_statements (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('annual', 'quarterly', 'ttm')),

  -- Balance Sheet (INR, crores)
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  total_equity NUMERIC,
  current_assets NUMERIC,
  current_liabilities NUMERIC,
  cash_and_equivalents NUMERIC,
  short_term_debt NUMERIC,
  long_term_debt NUMERIC,
  total_debt NUMERIC,
  inventory NUMERIC,
  shares_outstanding NUMERIC,
  goodwill NUMERIC,

  -- Income Statement (INR, crores)
  revenue NUMERIC,
  cost_of_revenue NUMERIC,
  gross_profit NUMERIC,
  operating_income NUMERIC,
  net_income NUMERIC,
  eps NUMERIC,
  ebitda NUMERIC,
  interest_expense NUMERIC,
  income_tax_expense NUMERIC,
  pre_tax_income NUMERIC,

  -- Cash Flow (INR, crores)
  operating_cash_flow NUMERIC,
  capital_expenditure NUMERIC,
  free_cash_flow NUMERIC,
  dividends_paid NUMERIC,
  depreciation_amortization NUMERIC,

  -- Metadata
  source_provider VARCHAR(30) NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reporting_currency VARCHAR(3) DEFAULT 'INR',

  UNIQUE (symbol, period_end, period_type)
);

CREATE INDEX IF NOT EXISTS idx_fs_symbol ON financial_statements (symbol);
CREATE INDEX IF NOT EXISTS idx_fs_period ON financial_statements (symbol, period_type, period_end DESC);

-- Data anomalies table (for AnomalyDetectionEngine)
CREATE TABLE IF NOT EXISTS data_anomalies (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  run_date DATE NOT NULL,
  anomaly_type VARCHAR(50) NOT NULL,
  field VARCHAR(50),
  current_value NUMERIC,
  previous_value NUMERIC,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_symbol_date ON data_anomalies (symbol, run_date DESC);
