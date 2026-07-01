-- Migration 043: Automated SLM Backtest Training Data-Feeder
-- Caches multi-year walk-forward backtest statistics for training injector.
-- Data consumed by slm_training_injector.py to compile Ollama Modelfile layers.

CREATE TABLE IF NOT EXISTS slm_strategy_backtest_metrics (
    ticker VARCHAR(20) PRIMARY KEY,
    strategy_name VARCHAR(50) NOT NULL DEFAULT 'default',
    total_signals_triggered INT NOT NULL DEFAULT 0,
    win_rate_pct NUMERIC(6, 2),
    cagr_pct NUMERIC(6, 2),
    max_drawdown_pct NUMERIC(6, 2),
    sharpe_ratio NUMERIC(5, 2),
    last_computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_slm_metrics_lookup ON slm_strategy_backtest_metrics(strategy_name, win_rate_pct DESC);
