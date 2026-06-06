CREATE TABLE IF NOT EXISTS income_statements (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('quarterly','annual','ttm')),
  fiscal_year INTEGER,
  revenue NUMERIC,
  gross_profit NUMERIC,
  operating_income NUMERIC,
  interest_expense NUMERIC,
  net_income NUMERIC,
  eps NUMERIC,
  source_provider TEXT NOT NULL,
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, period_end, period_type, source_provider)
);

CREATE TABLE IF NOT EXISTS balance_sheets (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('quarterly','annual','ttm')),
  fiscal_year INTEGER,
  total_assets NUMERIC,
  current_assets NUMERIC,
  current_liabilities NUMERIC,
  total_liabilities NUMERIC,
  total_equity NUMERIC,
  inventory NUMERIC,
  receivables NUMERIC,
  source_provider TEXT NOT NULL,
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, period_end, period_type, source_provider)
);

CREATE TABLE IF NOT EXISTS cash_flow_statements (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('quarterly','annual','ttm')),
  fiscal_year INTEGER,
  operating_cash_flow NUMERIC,
  capital_expenditure NUMERIC,
  free_cash_flow NUMERIC,
  source_provider TEXT NOT NULL,
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, period_end, period_type, source_provider)
);

CREATE TABLE IF NOT EXISTS derived_metrics_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('quarterly','annual','ttm')),
  eps_growth NUMERIC,
  fcf_growth NUMERIC,
  current_ratio NUMERIC,
  gross_margin NUMERIC,
  asset_turnover NUMERIC,
  interest_coverage NUMERIC,
  fcf_margin NUMERIC,
  working_capital_ratio NUMERIC,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, period_end, period_type)
);

CREATE TABLE IF NOT EXISTS population_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  symbol TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, stage, symbol)
);

CREATE TABLE IF NOT EXISTS population_failure_queue (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  symbol TEXT NOT NULL,
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_health_snapshots (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  success_count INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  error_rate NUMERIC NOT NULL,
  average_latency_ms NUMERIC NOT NULL,
  completeness_average NUMERIC NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_income_statements_symbol_period ON income_statements(symbol, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_balance_sheets_symbol_period ON balance_sheets(symbol, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_statements_symbol_period ON cash_flow_statements(symbol, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_derived_metrics_symbol_period ON derived_metrics_snapshots(symbol, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_failure_queue_retry ON population_failure_queue(next_retry_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_health_provider_time ON provider_health_snapshots(provider, captured_at DESC);
