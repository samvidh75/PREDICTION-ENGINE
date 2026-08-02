-- Forward-only migration: add pipeline_health columns (idempotent via EXCEPTION blocks).
-- This re-attempts column addition in case migration 018's IF NOT EXISTS checks did not
-- execute as expected in the target PostgreSQL environment.

DO $$
BEGIN
  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS symbols_failed INTEGER DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS error_classes TEXT[] DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS provider_statuses JSONB DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS rows_written JSONB DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;
END
$$;
