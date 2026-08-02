-- Prediction outcomes table for forward-return tracking.
-- Tracks realised returns against prediction_registry entries.
-- Populated by scripts/outcomes/materialize-prediction-outcomes.ts

CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  horizon_days INTEGER NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL,
  price_at_prediction DOUBLE PRECISION,
  realised_price DOUBLE PRECISION,
  realised_return_pct DOUBLE PRECISION,
  realised_at TIMESTAMPTZ,
  direction_result VARCHAR(20),
  score_bucket VARCHAR(10),
  confidence_bucket VARCHAR(10),
  classification_at_prediction VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_symbol ON prediction_outcomes(symbol);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_prediction_id ON prediction_outcomes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_direction ON prediction_outcomes(direction_result);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_score_bucket ON prediction_outcomes(score_bucket);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_horizon ON prediction_outcomes(horizon_days);
