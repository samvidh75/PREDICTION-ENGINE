-- Migration 047: System Performance Telemetry Logging
CREATE TABLE IF NOT EXISTS system_perf_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uptime_seconds BIGINT NOT NULL,
    heap_used_mb NUMERIC(10, 2) NOT NULL,
    rss_mb NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index maps to maximize rapid retrieval loops inside /api/ops/telemetry queries
CREATE INDEX IF NOT EXISTS idx_perf_logs_timestamp ON system_perf_logs(recorded_at DESC);
