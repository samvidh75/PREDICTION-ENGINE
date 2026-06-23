-- 028: IndianAPI Premium Intelligence Tables
-- Additive migration — does not modify existing tables.

-- Live snapshot table (one row per symbol, upserted on each ingestion run)
CREATE TABLE IF NOT EXISTS stock_live_snapshot (
  symbol            TEXT PRIMARY KEY,
  company_name      TEXT,
  as_of             TIMESTAMPTZ,
  price             DOUBLE PRECISION,
  change_percent    DOUBLE PRECISION,
  pe_ratio          DOUBLE PRECISION,
  pb_ratio          DOUBLE PRECISION,
  market_cap        DOUBLE PRECISION,
  roe               DOUBLE PRECISION,
  roce              DOUBLE PRECISION,
  debt_to_equity    DOUBLE PRECISION,
  revenue_growth    DOUBLE PRECISION,
  profit_growth     DOUBLE PRECISION,
  operating_margin  DOUBLE PRECISION,
  net_margin        DOUBLE PRECISION,
  promoter_holding  DOUBLE PRECISION,
  fii_holding       DOUBLE PRECISION,
  dii_holding       DOUBLE PRECISION,
  analyst_view      TEXT DEFAULT 'not_available',
  analyst_view_raw  TEXT,
  external_target_price DOUBLE PRECISION,
  external_upside_percent DOUBLE PRECISION,
  latest_headline   TEXT,
  latest_headline_url TEXT,
  source_state      TEXT DEFAULT 'missing',
  completeness_score INTEGER DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_snapshot_source_state ON stock_live_snapshot (source_state);
CREATE INDEX IF NOT EXISTS idx_live_snapshot_completeness ON stock_live_snapshot (completeness_score DESC);
CREATE INDEX IF NOT EXISTS idx_live_snapshot_updated ON stock_live_snapshot (updated_at DESC);

-- History table (append-only, one row per symbol per ingestion run)
CREATE TABLE IF NOT EXISTS stock_intelligence_history (
  id                BIGSERIAL PRIMARY KEY,
  symbol            TEXT NOT NULL,
  snapshot_date     DATE NOT NULL,
  company_name      TEXT,
  as_of             TIMESTAMPTZ,
  price             DOUBLE PRECISION,
  change_percent    DOUBLE PRECISION,
  pe_ratio          DOUBLE PRECISION,
  pb_ratio          DOUBLE PRECISION,
  market_cap        DOUBLE PRECISION,
  roe               DOUBLE PRECISION,
  roce              DOUBLE PRECISION,
  debt_to_equity    DOUBLE PRECISION,
  revenue_growth    DOUBLE PRECISION,
  profit_growth     DOUBLE PRECISION,
  operating_margin  DOUBLE PRECISION,
  net_margin        DOUBLE PRECISION,
  promoter_holding  DOUBLE PRECISION,
  fii_holding       DOUBLE PRECISION,
  dii_holding       DOUBLE PRECISION,
  analyst_view      TEXT DEFAULT 'not_available',
  analyst_view_raw  TEXT,
  external_target_price DOUBLE PRECISION,
  external_upside_percent DOUBLE PRECISION,
  latest_headline   TEXT,
  latest_headline_url TEXT,
  source_state      TEXT DEFAULT 'missing',
  completeness_score INTEGER DEFAULT 0,
  ingestion_run_id  BIGINT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_history_symbol ON stock_intelligence_history (symbol);
CREATE INDEX IF NOT EXISTS idx_intel_history_snapshot_date ON stock_intelligence_history (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_intel_history_symbol_date ON stock_intelligence_history (symbol, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_intel_history_run ON stock_intelligence_history (ingestion_run_id);

-- Ingestion runs tracking
CREATE TABLE IF NOT EXISTS stock_intelligence_ingestion_runs (
  id                BIGSERIAL PRIMARY KEY,
  status            TEXT DEFAULT 'running',
  symbols_requested INTEGER DEFAULT 0,
  symbols_succeeded INTEGER DEFAULT 0,
  symbols_failed    INTEGER DEFAULT 0,
  error_message     TEXT,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status ON stock_intelligence_ingestion_runs (status);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started ON stock_intelligence_ingestion_runs (started_at DESC);

-- Super scan results
CREATE TABLE IF NOT EXISTS stock_super_scan_results (
  id                BIGSERIAL PRIMARY KEY,
  scan_key          TEXT NOT NULL,
  scan_label        TEXT NOT NULL,
  symbol            TEXT NOT NULL,
  rank              INTEGER DEFAULT 0,
  score             INTEGER DEFAULT 0,
  reason            TEXT,
  data_quality      TEXT DEFAULT 'partial',
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  ingestion_run_id  BIGINT
);

CREATE INDEX IF NOT EXISTS idx_super_scan_key ON stock_super_scan_results (scan_key);
CREATE INDEX IF NOT EXISTS idx_super_scan_generated ON stock_super_scan_results (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_super_scan_key_rank ON stock_super_scan_results (scan_key, rank);
