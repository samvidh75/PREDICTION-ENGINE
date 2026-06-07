-- src/db/migrations/005_add_stockstory_financial_columns.sql
-- Add financial columns to financial_snapshots table to fully support all 7 engines in the StockStory Engine

ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roe NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roic NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS gross_margin NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS operating_margin NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS current_ratio NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS revenue_growth NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS profit_growth NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS eps_growth NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS fcf_growth NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS pb_ratio NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS ev_ebitda NUMERIC(8,4);
ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS fcf_yield NUMERIC(8,4);
