-- ============================================================
-- SCHEMA: LLM-related data tables for Lensory
-- ============================================================

CREATE TABLE IF NOT EXISTS llm_responses (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  response_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  token_count INT DEFAULT 0,
  cost_estimate DECIMAL(10, 6),
  routed_to VARCHAR(10),
  model_used VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_key ON llm_responses(cache_key);
CREATE INDEX IF NOT EXISTS idx_llm_type ON llm_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_llm_expires ON llm_responses(expires_at);

CREATE TABLE IF NOT EXISTS routing_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT now(),
  total_queries INT,
  routed_to_weak INT,
  routed_to_strong INT,
  total_cost DECIMAL(10, 6),
  cost_weak DECIMAL(10, 6),
  cost_strong DECIMAL(10, 6),
  avg_latency_weak_ms INT,
  avg_latency_strong_ms INT,
  quality_score_weak DECIMAL(3, 2),
  quality_score_strong DECIMAL(3, 2)
);

CREATE INDEX IF NOT EXISTS idx_routing_metrics_ts ON routing_metrics(timestamp);

CREATE TABLE IF NOT EXISTS llm_call_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  service VARCHAR(20),
  method VARCHAR(100),
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_estimate DECIMAL(10, 6),
  routed_to VARCHAR(10),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_user ON llm_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_service ON llm_call_logs(service);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON llm_call_logs(created_at);

CREATE TABLE IF NOT EXISTS thesis_cache (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  thesis TEXT NOT NULL,
  score INT,
  generated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thesis_symbol ON thesis_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_thesis_expires ON thesis_cache(expires_at);

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
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON multi_turn_sessions(expires_at);

CREATE TABLE IF NOT EXISTS comparison_cache (
  id SERIAL PRIMARY KEY,
  symbols_hash VARCHAR(100) UNIQUE NOT NULL,
  comparison JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comparison_hash ON comparison_cache(symbols_hash);
CREATE INDEX IF NOT EXISTS idx_comparison_expires ON comparison_cache(expires_at);
