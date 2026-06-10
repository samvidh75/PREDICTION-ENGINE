-- 012_align_financial_snapshots_v5.sql
-- Additive migration to align financial_snapshots table for V5 engines.

DROP TABLE IF EXISTS financial_snapshots;
CREATE TABLE IF NOT EXISTS financial_snapshots (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  snapshot_date TEXT NOT NULL DEFAULT (date('now')),
  pe_ratio REAL,
  pb_ratio REAL,
  roe REAL,
  roce REAL,
  debt_to_equity REAL,
  operating_margin REAL,
  net_margin REAL,
  market_cap REAL,
  revenue_growth REAL,
  profit_growth REAL,
  fcf_yield REAL,
  ev_ebitda REAL,
  current_ratio REAL,
  eps REAL,
  dividend_yield REAL,
  beta REAL,
  free_float REAL,
  roa REAL,
  roic REAL,
  eps_growth REAL,
  fcf_growth REAL,
  gross_margin REAL,
  PRIMARY KEY (symbol, period_end)
);

CREATE INDEX IF NOT EXISTS idx_fs_symbol ON financial_snapshots (symbol);
CREATE INDEX IF NOT EXISTS idx_fs_period_end ON financial_snapshots (period_end DESC);
CREATE INDEX IF NOT EXISTS idx_fs_snapshot_date ON financial_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_fs_symbol_date ON financial_snapshots (symbol, snapshot_date DESC);
