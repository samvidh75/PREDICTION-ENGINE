-- src/db/migrations/001_create_warehouse_tables.sql

-- Symbols table (source of truth for Master Symbol Universe)
CREATE TABLE IF NOT EXISTS symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    exchange VARCHAR(10) NOT NULL,
    isin CHAR(12),
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    listing_status VARCHAR(12) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily price candles
CREATE TABLE IF NOT EXISTS daily_prices (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    open NUMERIC(12,4),
    high NUMERIC(12,4),
    low NUMERIC(12,4),
    close NUMERIC(12,4),
    adjusted_close NUMERIC(12,4),
    volume BIGINT,
    PRIMARY KEY (symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices(trade_date);

-- Financial snapshots (quarterly / annual fundamentals)
CREATE TABLE IF NOT EXISTS financial_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    period_end DATE NOT NULL,
    market_cap NUMERIC(20,2),
    pe_ratio NUMERIC(8,2),
    eps NUMERIC(10,4),
    dividend_yield NUMERIC(5,2),
    beta NUMERIC(5,3),
    free_float NUMERIC(15,2),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, period_end)
);

-- News articles linked to symbols
CREATE TABLE IF NOT EXISTS news_articles (
    article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) REFERENCES symbols(symbol) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMP NOT NULL,
    source VARCHAR(100),
    summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_symbol ON news_articles(symbol);

-- Provider request log for cost tracking and reconciliation
CREATE TABLE IF NOT EXISTS provider_logs (
    log_id BIGSERIAL PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL,
    symbol VARCHAR(20),
    request_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Backfill job tracking tables
CREATE TABLE IF NOT EXISTS backfill_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(12) NOT NULL CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backfill_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES backfill_jobs(job_id) ON DELETE CASCADE,
    chunk_start DATE NOT NULL,
    chunk_end DATE NOT NULL,
    attempts INT DEFAULT 0,
    last_error TEXT,
    status VARCHAR(12) NOT NULL CHECK (status IN ('PENDING','SUCCESS','FAILED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
