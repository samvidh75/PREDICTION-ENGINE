CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  dataset_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS rejected_market_records (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  symbol TEXT,
  trading_date TEXT,
  raw_payload TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prediction_input_lineage (
  id INTEGER PRIMARY KEY,
  prediction_run_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  metric TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  as_of TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  freshness_days INTEGER NOT NULL,
  availability TEXT NOT NULL,
  is_fallback INTEGER NOT NULL DEFAULT 0,
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS scoring_runs (
  id TEXT PRIMARY KEY,
  run_date TEXT NOT NULL,
  model_version TEXT NOT NULL,
  universe TEXT NOT NULL,
  status TEXT NOT NULL,
  symbols_requested INTEGER NOT NULL,
  symbols_scored INTEGER NOT NULL,
  symbols_partial INTEGER NOT NULL,
  symbols_unavailable INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_completeness_metrics (
  id INTEGER PRIMARY KEY,
  run_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  dataset_type TEXT NOT NULL,
  completeness_score REAL NOT NULL,
  available_fields TEXT NOT NULL,
  missing_fields TEXT NOT NULL,
  as_of TEXT NOT NULL,
  created_at TEXT NOT NULL
);

