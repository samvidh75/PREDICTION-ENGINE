-- 012_align_financial_snapshots_v5.sql
-- Additive, non-destructive migration to align financial_snapshots table for V5 engines.

DO $$
BEGIN
  -- 1. Add period_end column if not exists (nullable first)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_snapshots' AND column_name = 'period_end') THEN
    ALTER TABLE financial_snapshots ADD COLUMN period_end TEXT;
  END IF;

  -- 2. Backfill existing rows: set period_end to snapshot_date if null
  UPDATE financial_snapshots SET period_end = CAST(snapshot_date AS DATE) WHERE period_end IS NULL;

  -- 2b. Detect duplicate (symbol, period_end) rows and fail loudly
  IF EXISTS (
    SELECT 1 FROM (
      SELECT symbol, period_end FROM financial_snapshots
      GROUP BY symbol, period_end
      HAVING COUNT(*) > 1
    ) dupes
  ) THEN
    RAISE EXCEPTION 'MIGRATION_COLLISION_DETECTED: Duplicate keys (symbol, period_end) exist in financial_snapshots before applying new Primary Key constraint';
  END IF;

  -- 3. Make period_end NOT NULL
  ALTER TABLE financial_snapshots ALTER COLUMN period_end SET NOT NULL;

  -- 4. Add other missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'eps') THEN
    ALTER TABLE financial_snapshots ADD COLUMN eps REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'dividend_yield') THEN
    ALTER TABLE financial_snapshots ADD COLUMN dividend_yield REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'beta') THEN
    ALTER TABLE financial_snapshots ADD COLUMN beta REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'free_float') THEN
    ALTER TABLE financial_snapshots ADD COLUMN free_float REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'roa') THEN
    ALTER TABLE financial_snapshots ADD COLUMN roa REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'roic') THEN
    ALTER TABLE financial_snapshots ADD COLUMN roic REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'eps_growth') THEN
    ALTER TABLE financial_snapshots ADD COLUMN eps_growth REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'fcf_growth') THEN
    ALTER TABLE financial_snapshots ADD COLUMN fcf_growth REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'gross_margin') THEN
    ALTER TABLE financial_snapshots ADD COLUMN gross_margin REAL;
  END IF;

  -- 5. Modify primary key: drop old key constraint if exists, then create new key constraint
  -- PostgreSQL default primary key constraint name is financial_snapshots_pkey
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'financial_snapshots' AND constraint_name = 'financial_snapshots_pkey' AND constraint_type = 'PRIMARY KEY') THEN
    ALTER TABLE financial_snapshots DROP CONSTRAINT financial_snapshots_pkey;
  END IF;

  ALTER TABLE financial_snapshots ADD CONSTRAINT financial_snapshots_pkey PRIMARY KEY (symbol, period_end);

END $$;

-- 6. Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_fs_symbol ON financial_snapshots (symbol);
CREATE INDEX IF NOT EXISTS idx_fs_period_end ON financial_snapshots (period_end DESC);
CREATE INDEX IF NOT EXISTS idx_fs_snapshot_date ON financial_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_fs_symbol_date ON financial_snapshots (symbol, snapshot_date DESC);
