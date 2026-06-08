-- 011_schema_alignment_p0.sql
-- TRACK-P0: Production Stabilization & Schema Unification
--
-- Aligns PostgreSQL schemas with the canonical contracts used by:
--   - FeatureEngine (feature_snapshots)
--   - FactorEngine (factor_snapshots)
--   - StockStory route (prediction_registry)
--
-- All migrations are idempotent (IF NOT EXISTS / IF EXISTS patterns).

-- ==========================================================================
-- 1. feature_snapshots: ensure canonical columns exist
-- ==========================================================================

-- Add columns that FeatureEngine writes but may not exist in older deployments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'rsi') THEN
    ALTER TABLE feature_snapshots ADD COLUMN rsi NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'macd') THEN
    ALTER TABLE feature_snapshots ADD COLUMN macd NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'macd_signal') THEN
    ALTER TABLE feature_snapshots ADD COLUMN macd_signal NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'macd_histogram') THEN
    ALTER TABLE feature_snapshots ADD COLUMN macd_histogram NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'adx') THEN
    ALTER TABLE feature_snapshots ADD COLUMN adx NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'atr') THEN
    ALTER TABLE feature_snapshots ADD COLUMN atr NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'bollinger_width') THEN
    ALTER TABLE feature_snapshots ADD COLUMN bollinger_width NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'momentum') THEN
    ALTER TABLE feature_snapshots ADD COLUMN momentum NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'volatility') THEN
    ALTER TABLE feature_snapshots ADD COLUMN volatility NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'relative_strength') THEN
    ALTER TABLE feature_snapshots ADD COLUMN relative_strength NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'moving_average_distance') THEN
    ALTER TABLE feature_snapshots ADD COLUMN moving_average_distance NUMERIC(12, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'trend_strength') THEN
    ALTER TABLE feature_snapshots ADD COLUMN trend_strength NUMERIC(12, 4);
  END IF;
END $$;

-- ==========================================================================
-- 2. factor_snapshots: ensure canonical columns exist
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'quality_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN quality_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'value_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN value_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'growth_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN growth_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'momentum_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN momentum_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'risk_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN risk_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'sector_strength_factor') THEN
    ALTER TABLE factor_snapshots ADD COLUMN sector_strength_factor NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'factor_score') THEN
    ALTER TABLE factor_snapshots ADD COLUMN factor_score NUMERIC(6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'explanations') THEN
    ALTER TABLE factor_snapshots ADD COLUMN explanations JSONB;
  END IF;
END $$;

-- ==========================================================================
-- 3. prediction_registry: ensure confidence_level exists
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prediction_registry' AND column_name = 'confidence_level') THEN
    ALTER TABLE prediction_registry ADD COLUMN confidence_level VARCHAR(20);

    -- Backfill existing rows with sensible defaults based on confidence_score
    UPDATE prediction_registry
    SET confidence_level = CASE
      WHEN confidence_score >= 85 THEN 'Very High'
      WHEN confidence_score >= 70 THEN 'High'
      WHEN confidence_score >= 50 THEN 'Medium'
      ELSE 'Low'
    END
    WHERE confidence_level IS NULL;

    -- After backfill, add the check constraint
    ALTER TABLE prediction_registry ADD CONSTRAINT chk_confidence_level
      CHECK (confidence_level IN ('Very High', 'High', 'Medium', 'Low'));
  END IF;
END $$;

-- ==========================================================================
-- 4. Ensure trade_date (not snapshot_date) is used for feature/factor tables
--    The canonical migration 002 already uses trade_date, but older deployments
--    may have snapshot_date. This migration handles the transition.
-- ==========================================================================

-- Mark: No destructive rename. If snapshot_date exists as a column alongside
-- trade_date, the application-layer FeatureEngine/FactorEngine always writes
-- to trade_date. Existing snapshot_date data is preserved for backward
-- compatibility but new writes go to the canonical columns.
