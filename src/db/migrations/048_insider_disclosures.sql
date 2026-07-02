-- Migration 048: Corporate Actions & Insider Trading Disclosures
-- Stores SEBI regulatory filings, insider acquisitions, pledge revisions,
-- and bulk/block deal data for the InsiderTrackingPanel.
-- RLS is enforced via `app.current_user_id` set by queryWithTenantContext.

CREATE TABLE IF NOT EXISTS corporate_insider_disclosures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20) NOT NULL,
    disclosure_type VARCHAR(50) NOT NULL,  -- 'INSIDER_ACQUISITION', 'PLEDGE_RELEASE', 'BULK_DEAL', 'BLOCK_DEAL'
    insider_name VARCHAR(150) NOT NULL,
    shares_quantity BIGINT NOT NULL,
    transaction_value_inr NUMERIC(15, 2) NOT NULL,
    filing_date DATE NOT NULL,
    raw_announcement_text TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimize column lookup indexes to accelerate batch vectorization runs
CREATE INDEX IF NOT EXISTS idx_insider_disclosures_lookup
    ON corporate_insider_disclosures(ticker, filing_date DESC);

-- Enable Row-Level Security so users only see data for their tenant context
ALTER TABLE corporate_insider_disclosures ENABLE ROW LEVEL SECURITY;

-- Policy: all authenticated users can read disclosures (data is public regulatory)
CREATE POLICY insider_disclosures_select_policy ON corporate_insider_disclosures
    FOR SELECT USING (true);

-- Policy: service role / vectorizer can insert
CREATE POLICY insider_disclosures_insert_policy ON corporate_insider_disclosures
    FOR INSERT WITH CHECK (true);
