-- src/db/migrations/004_create_company_intelligence_tables.sql
-- Tables to power the Company Page intelligence sections:
-- Ownership, Valuation, Risks, Catalysts, Timeline

-- Shareholding patterns (quarterly)
CREATE TABLE IF NOT EXISTS shareholding_patterns (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    period_end DATE NOT NULL,
    promoter_pct NUMERIC(5,2),
    fii_pct NUMERIC(5,2),
    dii_pct NUMERIC(5,2),
    public_pct NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, period_end)
);
CREATE INDEX IF NOT EXISTS idx_shareholding_symbol ON shareholding_patterns(symbol);

-- Valuation metrics (periodic snapshots beyond basic PE)
CREATE TABLE IF NOT EXISTS valuation_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    period_end DATE NOT NULL,
    pe_ratio NUMERIC(8,2),
    sector_pe NUMERIC(8,2),
    pb_ratio NUMERIC(8,2),
    ev_ebitda NUMERIC(8,2),
    valuation_rating VARCHAR(12) CHECK (valuation_rating IN ('Undervalued', 'Fair Value', 'Overvalued', 'Unavailable')),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, period_end)
);
CREATE INDEX IF NOT EXISTS idx_valuation_symbol ON valuation_snapshots(symbol);

-- Corporate timeline events
CREATE TABLE IF NOT EXISTS corporate_timeline (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('Results', 'Dividend', 'Bonus', 'Split', 'Rights', 'M&A', 'Order Win', 'Capex Announcement', 'Management Change', 'Regulatory', 'Other')),
    event_title TEXT NOT NULL,
    event_detail TEXT,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_symbol ON corporate_timeline(symbol, event_date DESC);
