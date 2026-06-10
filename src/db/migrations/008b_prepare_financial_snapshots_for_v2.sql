-- 008b_prepare_financial_snapshots_for_v2.sql
-- Add missing columns to financial_snapshots non-destructively before 009 runs

ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS snapshot_date TEXT DEFAULT (date('now'));
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS pb_ratio REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roe REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roce REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS debt_to_equity REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS operating_margin REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS net_margin REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS revenue_growth REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS profit_growth REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS fcf_yield REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS ev_ebitda REAL;
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS current_ratio REAL;
