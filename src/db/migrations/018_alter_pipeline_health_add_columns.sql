-- Forward-only migration: ensure pipeline_health table has all columns from migration 017.
-- This is idempotent and safe to run if columns already exist.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'symbols_failed') THEN
    ALTER TABLE pipeline_health ADD COLUMN symbols_failed INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'error_classes') THEN
    ALTER TABLE pipeline_health ADD COLUMN error_classes TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'provider_statuses') THEN
    ALTER TABLE pipeline_health ADD COLUMN provider_statuses JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'rows_written') THEN
    ALTER TABLE pipeline_health ADD COLUMN rows_written JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'metadata') THEN
    ALTER TABLE pipeline_health ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_health' AND column_name = 'created_at') THEN
    ALTER TABLE pipeline_health ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END
$$;
