-- 034_analyst_desk_tables.sql
-- Additive migration for autonomous analyst desk persistence.

CREATE TABLE IF NOT EXISTS analyst_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  user_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}',
  output_id TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS research_workflows (
  id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  input_hash TEXT,
  confidence_score NUMERIC,
  publish_decision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyst_outputs (
  id TEXT PRIMARY KEY,
  output_type TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC,
  review_status TEXT DEFAULT 'auto_published',
  input_hash TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyst_memos (
  id TEXT PRIMARY KEY,
  memo_type TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  review_status TEXT DEFAULT 'auto_published',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_review_queue (
  id TEXT PRIMARY KEY,
  output_id TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  triggers JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending_review',
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_audit_trails (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  workflow_id TEXT NOT NULL,
  symbol TEXT,
  sector TEXT,
  input_hash TEXT NOT NULL,
  evidence_ids JSONB NOT NULL DEFAULT '[]',
  engine_versions JSONB NOT NULL DEFAULT '[]',
  output_validation_result TEXT,
  confidence_score NUMERIC,
  review_status TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_question_answers (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  question_type TEXT,
  symbol TEXT,
  answer JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filing_briefs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  filing_type TEXT,
  materiality TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earnings_notes (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_label TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sector_briefs (
  id TEXT PRIMARY KEY,
  sector TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_review_briefs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  user_id TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyst_tasks_symbol ON analyst_tasks(symbol);
CREATE INDEX IF NOT EXISTS idx_analyst_tasks_status ON analyst_tasks(status);
CREATE INDEX IF NOT EXISTS idx_analyst_tasks_task_type ON analyst_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_analyst_outputs_symbol ON analyst_outputs(symbol);
CREATE INDEX IF NOT EXISTS idx_analyst_outputs_generated_at ON analyst_outputs(generated_at);
CREATE INDEX IF NOT EXISTS idx_research_review_status ON research_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_research_audit_input_hash ON research_audit_trails(input_hash);
CREATE INDEX IF NOT EXISTS idx_sector_briefs_sector ON sector_briefs(sector);
CREATE INDEX IF NOT EXISTS idx_earnings_notes_symbol ON earnings_notes(symbol);
