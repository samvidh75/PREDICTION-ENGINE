-- 009_create_financial_snapshots_v2.sql
-- V5 Data Truth Layer Migration
--
-- Ensures financial_snapshots table has all required columns for the
-- StockStory V5 multi-engine scoring system (Quality, Growth, Value,
-- Momentum, Risk, Sector engines).
--
-- Also creates data_quality_registry for tracking data freshness and
-- completeness of financial fields per symbol.
--
-- SQLite-compatible syntax: IF NOT EXISTS, REAL type for decimals,
-- no UUID, no JSONB, no TIMESTAMPTZ.

-- Table 1: financial_snapshots (re-create with V5 columns if missing)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  symbol TEXT NOT NULL,
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
  PRIMARY KEY (symbol, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_fs_symbol ON financial_snapshots (symbol);
CREATE INDEX IF NOT EXISTS idx_fs_snapshot_date ON financial_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_fs_symbol_date ON financial_snapshots (symbol, snapshot_date DESC);

-- Table 2: data_quality_registry
-- Tracks per-symbol, per-field data freshness and completeness.
-- Used by the dashboard and compliance agent to flag stale data.
CREATE TABLE IF NOT EXISTS data_quality_registry (
  symbol TEXT NOT NULL,
  field TEXT NOT NULL,
  freshness_date TEXT,
  completeness_pct REAL NOT NULL DEFAULT 0
    CHECK (completeness_pct >= 0 AND completeness_pct <= 100),
  confidence_score REAL NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source TEXT,
  PRIMARY KEY (symbol, field)
);

CREATE INDEX IF NOT EXISTS idx_dqr_symbol ON data_quality_registry (symbol);
CREATE INDEX IF NOT EXISTS idx_dqr_field ON data_quality_registry (field);
CREATE INDEX IF NOT EXISTS idx_dqr_freshness ON data_quality_registry (freshness_date DESC);