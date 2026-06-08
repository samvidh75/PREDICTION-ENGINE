-- TRACK-P0: align active snapshot tables with runtime writers.
-- Non-destructive: add missing columns used by current FeatureEngine, FactorEngine,
-- and StockStory prediction routes. Legacy snapshot_date columns, if present, are
-- intentionally left in place for manual review rather than dropped here.

ALTER TABLE IF EXISTS feature_snapshots
  ADD COLUMN IF NOT EXISTS trade_date DATE,
  ADD COLUMN IF NOT EXISTS rsi NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS macd NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS macd_signal NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS macd_histogram NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS adx NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS atr NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS bollinger_width NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS momentum NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS volatility NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS relative_strength NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS moving_average_distance NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS trend_strength NUMERIC(12, 4);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_snapshots' AND column_name = 'snapshot_date'
  ) THEN
    UPDATE feature_snapshots SET trade_date = snapshot_date WHERE trade_date IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS factor_snapshots
  ADD COLUMN IF NOT EXISTS trade_date DATE,
  ADD COLUMN IF NOT EXISTS quality_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS value_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS growth_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS momentum_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS risk_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS sector_strength_factor NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS factor_score NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS explanations JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'factor_snapshots' AND column_name = 'snapshot_date'
  ) THEN
    UPDATE factor_snapshots SET trade_date = snapshot_date WHERE trade_date IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS prediction_registry
  ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_trade_date ON feature_snapshots(trade_date);
CREATE INDEX IF NOT EXISTS idx_factor_snapshots_trade_date ON factor_snapshots(trade_date);
