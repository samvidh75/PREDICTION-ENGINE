CREATE TABLE IF NOT EXISTS stock_page_snapshots (
  symbol TEXT PRIMARY KEY,
  snapshot_json JSONB NOT NULL,
  freshness_state TEXT NOT NULL DEFAULT 'partial',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quote_updated_at TIMESTAMPTZ,
  healthometer_updated_at TIMESTAMPTZ,
  financials_updated_at TIMESTAMPTZ,
  news_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_page_snapshots_updated_at ON stock_page_snapshots (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_page_snapshots_freshness ON stock_page_snapshots (freshness_state);
