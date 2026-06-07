-- src/db/migrations/002_create_feature_factor_tables.sql

-- Feature Snapshots table
CREATE TABLE IF NOT EXISTS feature_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    rsi NUMERIC(12, 4),
    macd NUMERIC(12, 4),
    macd_signal NUMERIC(12, 4),
    macd_histogram NUMERIC(12, 4),
    adx NUMERIC(12, 4),
    atr NUMERIC(12, 4),
    bollinger_width NUMERIC(12, 4),
    momentum NUMERIC(12, 4),
    volatility NUMERIC(12, 4),
    relative_strength NUMERIC(12, 4),
    moving_average_distance NUMERIC(12, 4),
    trend_strength NUMERIC(12, 4),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, trade_date)
);

-- Factor Snapshots table
CREATE TABLE IF NOT EXISTS factor_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    quality_factor NUMERIC(6, 2),
    value_factor NUMERIC(6, 2),
    growth_factor NUMERIC(6, 2),
    momentum_factor NUMERIC(6, 2),
    risk_factor NUMERIC(6, 2),
    sector_strength_factor NUMERIC(6, 2),
    factor_score NUMERIC(6, 2) NOT NULL,
    explanations JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_date ON feature_snapshots(trade_date);
CREATE INDEX IF NOT EXISTS idx_factor_snapshots_date ON factor_snapshots(trade_date);
