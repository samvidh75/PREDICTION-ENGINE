-- src/db/migrations/006_add_roa_column.sql
-- TRACK-12: Add ROA column to financial_snapshots for QualityEngine activation

ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS roa NUMERIC(8,4);
