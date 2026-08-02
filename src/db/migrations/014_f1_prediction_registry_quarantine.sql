CREATE TABLE IF NOT EXISTS prediction_registry_quarantine (
  id TEXT PRIMARY KEY,
  prediction_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  prediction_date TEXT NOT NULL,
  prediction_horizon INTEGER NOT NULL,
  raw_payload TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  quarantined_at TEXT NOT NULL,
  UNIQUE (prediction_id, rejection_reason)
);

CREATE INDEX IF NOT EXISTS idx_prq_symbol_date
  ON prediction_registry_quarantine (symbol, prediction_date);

CREATE INDEX IF NOT EXISTS idx_prq_prediction_id
  ON prediction_registry_quarantine (prediction_id);
