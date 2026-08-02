CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS stocks_created_at_idx ON stocks(created_at DESC);
CREATE INDEX IF NOT EXISTS stocks_symbol_idx ON stocks(symbol);

CREATE MATERIALIZED VIEW IF NOT EXISTS llm_metrics_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  AVG(latency_ms) as avg_latency,
  MAX(latency_ms) as max_latency,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls
FROM llm_call_logs
GROUP BY DATE(created_at);

CREATE INDEX IF NOT EXISTS llm_metrics_daily_date_idx ON llm_metrics_daily(date);
