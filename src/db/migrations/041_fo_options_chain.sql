-- Migration 041: Multi-Asset Options Chain & Derivatives Core
-- Stores F&O open interest, implied volatility, and derived market indicators.
-- Data sourced from free public NSE exchange endpoints.

CREATE TABLE IF NOT EXISTS asset_options_chain (
    id VARCHAR(64) PRIMARY KEY,
    underlying_ticker VARCHAR(20) NOT NULL,
    expiry_date DATE NOT NULL,
    strike_price NUMERIC(12, 2) NOT NULL,
    option_type VARCHAR(5) NOT NULL CHECK(option_type IN ('CE', 'PE')),
    open_interest BIGINT DEFAULT 0,
    change_in_oi BIGINT DEFAULT 0,
    implied_volatility NUMERIC(8, 2),
    last_traded_price NUMERIC(12, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS derivative_market_indicators (
    ticker VARCHAR(20) PRIMARY KEY,
    pcr_ratio NUMERIC(6, 2),
    max_pain_strike NUMERIC(12, 2),
    oi_trend_status VARCHAR(40),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_options_lookup ON asset_options_chain(underlying_ticker, expiry_date, option_type);
CREATE INDEX IF NOT EXISTS idx_options_oi ON asset_options_chain(underlying_ticker, open_interest DESC);
