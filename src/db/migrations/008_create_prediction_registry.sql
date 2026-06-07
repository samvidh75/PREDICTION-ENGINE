-- 008_create_prediction_registry.sql
-- TRACK-32 Phase 1: Prediction Registry Infrastructure
--
-- Immutable prediction records. Append-only. No UPDATE operations.
-- Predictions are frozen before outcomes occur — no retroactive edits.
--
-- Key invariants:
--   - created_at is set once and never changed
--   - All engine scores are captured at prediction time
--   - validation_status starts as 'pending', transitions to 'validated'
--   - future_return, benchmark_return, alpha are NULL until validated
--   - No UPDATE allowed via application logic (enforced by application, not DB trigger)

CREATE TABLE IF NOT EXISTS prediction_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,

  -- Prediction metadata
  prediction_date DATE NOT NULL,
  ranking_score DECIMAL(5,2) NOT NULL CHECK (ranking_score >= 0 AND ranking_score <= 100),
  classification VARCHAR(20) NOT NULL
    CHECK (classification IN ('Exceptional', 'Excellent', 'Good', 'Fair', 'Weak', 'Critical')),
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_level VARCHAR(20) NOT NULL
    CHECK (confidence_level IN ('Very High', 'High', 'Medium', 'Low')),

  -- Engine scores captured at prediction time (0-100)
  quality_score DECIMAL(5,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  growth_score DECIMAL(5,2) NOT NULL CHECK (growth_score >= 0 AND growth_score <= 100),
  value_score DECIMAL(5,2) NOT NULL CHECK (value_score >= 0 AND value_score <= 100),
  momentum_score DECIMAL(5,2) NOT NULL CHECK (momentum_score >= 0 AND momentum_score <= 100),
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  sector_score DECIMAL(5,2) NOT NULL CHECK (sector_score >= 0 AND sector_score <= 100),

  -- Market context at prediction time
  price_at_prediction DECIMAL(15,2),
  benchmark_level DECIMAL(10,2),         -- NIFTY 50 level

  -- Forward validation fields
  prediction_horizon INT NOT NULL DEFAULT 30
    CHECK (prediction_horizon IN (7, 30, 90, 180, 365)),
  validation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'in_progress', 'validated', 'expired')),
  validated_at TIMESTAMPTZ,              -- NULL until validation runs

  -- Outcome data (NULL until validated — populated after horizon passes)
  future_return DECIMAL(10,4),           -- % return over horizon
  benchmark_return DECIMAL(10,4),        -- % benchmark return over horizon
  alpha DECIMAL(10,4),                   -- future_return - benchmark_return

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) NOT NULL DEFAULT 'DailyPredictionCapture'
    CHECK (created_by IN ('DailyPredictionCapture', 'ManualSnapshot')),

  -- Application-level immutability guard: record is frozen after creation
  -- (enforced by PredictionRegistry which never issues UPDATE queries)
  CONSTRAINT prediction_registry_unique UNIQUE (symbol, prediction_date, prediction_horizon)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pr_symbol ON prediction_registry (symbol);
CREATE INDEX IF NOT EXISTS idx_pr_prediction_date ON prediction_registry (prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_pr_validation_status ON prediction_registry (validation_status);
CREATE INDEX IF NOT EXISTS idx_pr_classification ON prediction_registry (classification);
CREATE INDEX IF NOT EXISTS idx_pr_confidence_level ON prediction_registry (confidence_level);
CREATE INDEX IF NOT EXISTS idx_pr_horizon_status ON prediction_registry (prediction_horizon, validation_status);
CREATE INDEX IF NOT EXISTS idx_pr_symbol_date ON prediction_registry (symbol, prediction_date DESC);

-- Daily prediction snapshots table (Phase 2)
CREATE TABLE IF NOT EXISTS daily_prediction_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,

  -- Slice counts
  n_symbols_ranked INT NOT NULL,
  benchmark_level DECIMAL(10,2),

  -- Metadata
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Slices are stored as JSONB for flexibility
  -- Each slice contains the top/bottom symbols with full score data
  top10 JSONB NOT NULL DEFAULT '[]'::JSONB,
  top25 JSONB NOT NULL DEFAULT '[]'::JSONB,
  top50 JSONB NOT NULL DEFAULT '[]'::JSONB,
  bottom10 JSONB NOT NULL DEFAULT '[]'::JSONB,
  bottom25 JSONB NOT NULL DEFAULT '[]'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_dps_date ON daily_prediction_snapshots (snapshot_date DESC);

-- Benchmark tracking table (Phase 8)
CREATE TABLE IF NOT EXISTS benchmark_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observed_date DATE NOT NULL UNIQUE,
  nifty50 DECIMAL(10,2),
  nifty100 DECIMAL(10,2),
  nifty500 DECIMAL(10,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bo_date ON benchmark_observations (observed_date DESC);

-- Engine attribution results table (Phase 6)
CREATE TABLE IF NOT EXISTS engine_attribution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at DATE NOT NULL,

  engine VARCHAR(50) NOT NULL,
  information_coefficient DECIMAL(8,6),
  rank_correlation DECIMAL(8,6),         -- Spearman
  forward_return_correlation DECIMAL(8,6), -- Pearson
  n_predictions INT NOT NULL,
  interpretation TEXT,

  UNIQUE (computed_at, engine)
);

-- Statistical validation results table (Phase 9)
CREATE TABLE IF NOT EXISTS statistical_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at DATE NOT NULL,

  test_name VARCHAR(100) NOT NULL,
  t_statistic DECIMAL(10,4),
  p_value DECIMAL(10,6),
  confidence_interval_lower DECIMAL(10,4),
  confidence_interval_upper DECIMAL(10,4),
  information_ratio DECIMAL(8,4),
  is_significant BOOLEAN NOT NULL DEFAULT FALSE,
  sample_size INT NOT NULL,

  UNIQUE (computed_at, test_name)
);
