-- TRACK-84 Phase 4: pipeline_health table for pipeline run tracking
-- Each row represents a single pipeline run phase or full run summary.

CREATE TABLE IF NOT EXISTS pipeline_health (
  id UUID PRIMARY KEY,
  run_id VARCHAR(100) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running','success','partial','failure')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  symbols_attempted INTEGER DEFAULT 0,
  symbols_succeeded INTEGER DEFAULT 0,
  error_classes TEXT[] DEFAULT '{}',
  provider_statuses JSONB DEFAULT '{}',
  rows_written JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_health_run_id ON pipeline_health(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_started_at ON pipeline_health(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_status ON pipeline_health(status);
