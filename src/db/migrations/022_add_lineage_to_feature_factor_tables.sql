-- 022_add_lineage_to_feature_factor_tables.sql
-- Adds source/lineage tracking columns to feature_snapshots and factor_snapshots.
-- Idempotent: uses ALTER TABLE ADD COLUMN IF NOT EXISTS pattern.

-- Feature snapshots lineage
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_provider TEXT;
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_domain TEXT;
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_as_of_date DATE;
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_ingested_at TIMESTAMP DEFAULT NOW();
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_lineage_id TEXT;
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_quality TEXT DEFAULT 'lineage_unavailable'
  CHECK (source_quality IN ('verified', 'inferred', 'lineage_unavailable', 'manual'));
ALTER TABLE feature_snapshots ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Factor snapshots lineage
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_provider TEXT;
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_domain TEXT;
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_as_of_date DATE;
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_ingested_at TIMESTAMP DEFAULT NOW();
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_lineage_id TEXT;
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_quality TEXT DEFAULT 'lineage_unavailable'
  CHECK (source_quality IN ('verified', 'inferred', 'lineage_unavailable', 'manual'));
ALTER TABLE factor_snapshots ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Indexes for lineage queries
CREATE INDEX IF NOT EXISTS idx_feature_snapshots_source_provider ON feature_snapshots (source_provider);
CREATE INDEX IF NOT EXISTS idx_factor_snapshots_source_provider ON factor_snapshots (source_provider);
