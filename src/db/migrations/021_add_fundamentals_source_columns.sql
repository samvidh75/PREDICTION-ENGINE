-- 021_add_fundamentals_source_columns.sql
-- Adds source tracking and flexible metrics support to financial_snapshots.
-- Idempotent: uses IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS pattern.

-- Source tracking: where did this data come from?
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS source_label TEXT;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'annual'
  CHECK (period_type IN ('annual', 'quarterly', 'ttm', 'unknown'));

-- JSON metrics: absolute values that don't fit fixed columns
-- Stores revenue, operating_profit, net_profit, book_value, debt, equity,
-- operating_cash_flow, free_cash_flow, and other per-period metrics.
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS metrics_json TEXT;

-- Ingestion tracking
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS ingestion_run_id TEXT;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS ingestion_timestamp TEXT DEFAULT (datetime('now'));

-- Index for source queries
CREATE INDEX IF NOT EXISTS idx_fs_source_label ON financial_snapshots (source_label);
CREATE INDEX IF NOT EXISTS idx_fs_period_type ON financial_snapshots (period_type);
