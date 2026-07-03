-- 049_create_macro_economic_snapshots.sql
-- Page-level snapshots for RBI DBIE / official macro data sources.

CREATE TABLE IF NOT EXISTS macro_economic_snapshots (
  id BIGSERIAL PRIMARY KEY,
  source_id VARCHAR(80) NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT,
  page_heading TEXT,
  table_count INTEGER DEFAULT 0,
  headings JSONB,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_macro_economic_snapshots_source ON macro_economic_snapshots(source_id);
CREATE INDEX IF NOT EXISTS idx_macro_economic_snapshots_fetched ON macro_economic_snapshots(fetched_at DESC);

CREATE TABLE IF NOT EXISTS macro_economic_series (
  id BIGSERIAL PRIMARY KEY,
  source_id VARCHAR(80) NOT NULL,
  series_name VARCHAR(200) NOT NULL,
  observation_date DATE,
  observation_label VARCHAR(120),
  value DOUBLE PRECISION,
  unit VARCHAR(40),
  category VARCHAR(80),
  source_url TEXT NOT NULL,
  raw_payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, series_name, observation_date, source_url)
);

CREATE INDEX IF NOT EXISTS idx_macro_economic_series_source ON macro_economic_series(source_id);
CREATE INDEX IF NOT EXISTS idx_macro_economic_series_name ON macro_economic_series(series_name);
CREATE INDEX IF NOT EXISTS idx_macro_economic_series_observation ON macro_economic_series(observation_date DESC);
