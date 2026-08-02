-- 027_create_market_data_tables.sql
-- Additive migration: structured market data cache tables for IndianAPI full payloads.
-- No destructive changes. No existing table modifications.

-- Market live price snapshots: real-time/near-real-time price data
CREATE TABLE IF NOT EXISTS market_live_price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  exchange VARCHAR(10),
  price DOUBLE PRECISION,
  previous_close DOUBLE PRECISION,
  open DOUBLE PRECISION,
  high DOUBLE PRECISION,
  low DOUBLE PRECISION,
  change DOUBLE PRECISION,
  change_percent DOUBLE PRECISION,
  volume BIGINT,
  avg_volume BIGINT,
  week_52_high DOUBLE PRECISION,
  week_52_low DOUBLE PRECISION,
  market_cap DOUBLE PRECISION,
  traded_value DOUBLE PRECISION,
  last_traded_at TIMESTAMPTZ,
  halted BOOLEAN DEFAULT FALSE,
  delisted BOOLEAN DEFAULT FALSE,
  data_state VARCHAR(20) DEFAULT 'partial',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_version VARCHAR(20) DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_live_price_snapshots_symbol ON market_live_price_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_market_live_price_snapshots_fetched ON market_live_price_snapshots(fetched_at DESC);

-- Company profile overviews: sector, industry, ISIN, listing data
CREATE TABLE IF NOT EXISTS company_profile_overviews (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  short_name VARCHAR(100),
  nse_ticker VARCHAR(20),
  bse_code VARCHAR(20),
  isin VARCHAR(20),
  sector VARCHAR(100),
  industry VARCHAR(100),
  description TEXT,
  website VARCHAR(500),
  market_cap DOUBLE PRECISION,
  listing_date DATE,
  face_value DOUBLE PRECISION,
  exchange VARCHAR(10),
  data_state VARCHAR(20) DEFAULT 'partial',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_version VARCHAR(20) DEFAULT 'v1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_profile_overviews_symbol ON company_profile_overviews(symbol);
CREATE INDEX IF NOT EXISTS idx_company_profile_overviews_sector ON company_profile_overviews(sector);

-- Company fundamental snapshots: PE, PB, ROE, ROCE, margins, growth
CREATE TABLE IF NOT EXISTS company_fundamental_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  pe_ratio DOUBLE PRECISION,
  pb_ratio DOUBLE PRECISION,
  roce DOUBLE PRECISION,
  roe DOUBLE PRECISION,
  debt_to_equity DOUBLE PRECISION,
  dividend_yield DOUBLE PRECISION,
  eps DOUBLE PRECISION,
  book_value DOUBLE PRECISION,
  sales_growth DOUBLE PRECISION,
  profit_growth DOUBLE PRECISION,
  operating_margin DOUBLE PRECISION,
  net_margin DOUBLE PRECISION,
  current_ratio DOUBLE PRECISION,
  interest_coverage DOUBLE PRECISION,
  data_state VARCHAR(20) DEFAULT 'partial',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_version VARCHAR(20) DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_fundamental_snapshots_symbol ON company_fundamental_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_company_fundamental_snapshots_fetched ON company_fundamental_snapshots(fetched_at DESC);

-- Company financial statement tables: quarterly/annual P&L, balance sheet, cash flow
CREATE TABLE IF NOT EXISTS company_financial_statement_tables (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  periods JSONB,
  rows_json JSONB,
  currency VARCHAR(10) DEFAULT 'INR',
  data_state VARCHAR(20) DEFAULT 'partial',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_version VARCHAR(20) DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_financial_statement_tables_symbol ON company_financial_statement_tables(symbol);
CREATE INDEX IF NOT EXISTS idx_company_financial_statement_tables_period ON company_financial_statement_tables(period_type);

-- Company shareholding snapshots: promoter, FII, DII, public breakdown
CREATE TABLE IF NOT EXISTS company_shareholding_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  period VARCHAR(50),
  promoter_pct DOUBLE PRECISION,
  fii_pct DOUBLE PRECISION,
  dii_pct DOUBLE PRECISION,
  public_pct DOUBLE PRECISION,
  others_pct DOUBLE PRECISION,
  data_state VARCHAR(20) DEFAULT 'partial',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_shareholding_snapshots_symbol ON company_shareholding_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_company_shareholding_snapshots_period ON company_shareholding_snapshots(period);

-- Company corporate actions: dividends, splits, bonuses
CREATE TABLE IF NOT EXISTS company_corporate_actions (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  action_type VARCHAR(20) NOT NULL,
  ex_date DATE,
  record_date DATE,
  description TEXT,
  value DOUBLE PRECISION,
  data_state VARCHAR(20) DEFAULT 'available',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_corporate_actions_symbol ON company_corporate_actions(symbol);
CREATE INDEX IF NOT EXISTS idx_company_corporate_actions_ex_date ON company_corporate_actions(ex_date DESC);

-- Market data cache events: audit trail
CREATE TABLE IF NOT EXISTS market_data_cache_events (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  layer VARCHAR(30) NOT NULL,
  cache_status VARCHAR(20) NOT NULL,
  cache_ttl_seconds INTEGER,
  provider_status VARCHAR(20),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_data_cache_events_symbol ON market_data_cache_events(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_events_layer ON market_data_cache_events(layer);
