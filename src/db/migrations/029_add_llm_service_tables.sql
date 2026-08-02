CREATE TABLE IF NOT EXISTS llm_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT now(),
  total_queries INT DEFAULT 0,
  avg_latency_ms INT DEFAULT 0,
  success_rate DECIMAL(5,4) DEFAULT 1.0000
);

CREATE INDEX IF NOT EXISTS idx_llm_metrics_ts ON llm_metrics(timestamp);

CREATE TABLE IF NOT EXISTS multi_turn_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INT,
  symbol VARCHAR(20),
  context JSONB,
  last_message_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_id ON multi_turn_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON multi_turn_sessions(user_id);
