CREATE TABLE IF NOT EXISTS provider_authorization_registry (
  provider_name TEXT NOT NULL,
  authorization_record_id TEXT NOT NULL,
  authorization_scope TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  public_display_allowed INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT,
  expires_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider_name)
);

CREATE TABLE IF NOT EXISTS provider_ingestion_runs (
  id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL,
  dataset_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  symbols_requested INTEGER NOT NULL DEFAULT 0,
  symbols_succeeded INTEGER NOT NULL DEFAULT 0,
  symbols_partial INTEGER NOT NULL DEFAULT 0,
  symbols_failed INTEGER NOT NULL DEFAULT 0,
  rows_written INTEGER NOT NULL DEFAULT 0,
  schema_drift_count INTEGER NOT NULL DEFAULT 0,
  quota_rejections INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider_field_lineage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  field_name TEXT NOT NULL,
  source_url TEXT,
  source_as_of TEXT,
  retrieved_at TEXT NOT NULL,
  normalized_unit TEXT,
  parser_version TEXT,
  confidence_score REAL NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corporate_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('dividend', 'split', 'bonus', 'rights', 'buyback')),
  announcement_date TEXT,
  ex_date TEXT,
  record_date TEXT,
  value REAL,
  ratio_text TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  source_as_of TEXT,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shareholding_snapshots (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  promoter_holding REAL,
  institutional_holding REAL,
  public_holding REAL,
  pledged_promoter_holding REAL,
  source TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (symbol, period_end)
);

CREATE TABLE IF NOT EXISTS financial_statement_primitives (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  statement_basis TEXT NOT NULL DEFAULT 'consolidated' CHECK (statement_basis IN ('consolidated', 'standalone', 'unknown')),
  revenue REAL,
  gross_profit REAL,
  operating_profit REAL,
  net_profit REAL,
  total_assets REAL,
  total_debt REAL,
  equity REAL,
  cash_and_equivalents REAL,
  current_assets REAL,
  current_liabilities REAL,
  cash_flow_from_operations REAL,
  capital_expenditure REAL,
  free_cash_flow REAL,
  ebitda REAL,
  eps REAL,
  shares_outstanding REAL,
  free_float_shares REAL,
  dividend_per_share REAL,
  source TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (symbol, period_end, statement_basis)
);

CREATE INDEX IF NOT EXISTS idx_pir_provider_status ON provider_ingestion_runs (provider_name, status);
CREATE INDEX IF NOT EXISTS idx_pir_started ON provider_ingestion_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pfl_run ON provider_field_lineage (run_id);
CREATE INDEX IF NOT EXISTS idx_pfl_symbol_field ON provider_field_lineage (symbol, field_name);
CREATE INDEX IF NOT EXISTS idx_ca_symbol ON corporate_actions (symbol);
CREATE INDEX IF NOT EXISTS idx_ca_ex_date ON corporate_actions (ex_date);
CREATE INDEX IF NOT EXISTS idx_ca_type ON corporate_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_ss_symbol ON shareholding_snapshots (symbol);
CREATE INDEX IF NOT EXISTS idx_ss_period ON shareholding_snapshots (period_end DESC);
CREATE INDEX IF NOT EXISTS idx_fsp_symbol ON financial_statement_primitives (symbol);
CREATE INDEX IF NOT EXISTS idx_fsp_period ON financial_statement_primitives (period_end DESC);
