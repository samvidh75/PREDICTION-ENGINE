-- Migration 039: Asymmetric Ingestion Cache Architecture
-- Caches free web-scraped historical candles and fundamental ratios in Neon PostgreSQL.

CREATE TABLE IF NOT EXISTS asset_historical_candles (
    ticker VARCHAR(20) NOT NULL,
    timestamp BIGINT NOT NULL,
    open NUMERIC(12, 2),
    high NUMERIC(12, 2),
    low NUMERIC(12, 2),
    close NUMERIC(12, 2),
    volume BIGINT,
    PRIMARY KEY (ticker, timestamp)
);

CREATE TABLE IF NOT EXISTS asset_fundamental_ratios (
    ticker VARCHAR(20) PRIMARY KEY,
    market_cap_cr NUMERIC(15, 2),
    pe_ratio NUMERIC(10, 2),
    debt_to_equity NUMERIC(5, 2),
    promoter_pledged_pct NUMERIC(5, 2),
    auditor_remarks TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candles_ticker_time ON asset_historical_candles(ticker, timestamp DESC);
