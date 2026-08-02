-- Migration 050: Live quotes, EOD fundamentals, and company registry tables

-- Live quote cache (optional, for redundancy)
CREATE TABLE IF NOT EXISTS quote_cache (
  symbol VARCHAR(20) PRIMARY KEY,
  price DECIMAL(10, 2),
  bid DECIMAL(10, 2),
  ask DECIMAL(10, 2),
  volume BIGINT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- EOD fundamentals
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  pe DECIMAL(8, 2),
  pb DECIMAL(8, 2),
  roe DECIMAL(8, 2),
  roic DECIMAL(8, 2),
  debt_to_equity DECIMAL(8, 2),
  revenue_cagr_3y DECIMAL(8, 2),
  profit_cagr_3y DECIMAL(8, 2),
  operating_margin DECIMAL(8, 2),
  ev_ebitda DECIMAL(8, 2),
  dividend_yield DECIMAL(8, 2),
  market_cap BIGINT,
  book_value DECIMAL(10, 2),
  eps DECIMAL(10, 2),
  bvps DECIMAL(10, 2),
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Company registry
CREATE TABLE IF NOT EXISTS company_registry (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  listed_date DATE,
  isin VARCHAR(20),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_symbol ON stock_fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_company_registry_symbol ON company_registry(symbol);
CREATE INDEX IF NOT EXISTS idx_company_registry_sector ON company_registry(sector);
