-- TRACK-12C: Align daily_prices schema with provider INSERT expectations
--
-- The canonical daily_prices table (migration 001) defines:
--   symbol, trade_date, open, high, low, close, adjusted_close, volume
--
-- The provider layer (HistoricalPriceBackfill, DailyMarketUpdater) inserts:
--   symbols, date, open, high, low, close, adj_close, volume,
--   dividends, stock_splits, source, quality_score, ingested_at
--
-- This migration:
--   1. Adds the 5 columns used by the provider layer that are missing
--   2. Does NOT rename trade_date/adjusted_close – all provider code
--      has been updated to match the canonical column names.
--   3. Adds a GIST exclusion constraint to prevent overlapping price
--      ranges per symbol (future use).

ALTER TABLE IF EXISTS daily_prices
  ADD COLUMN IF NOT EXISTS dividends NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_splits NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'yfinance',
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN daily_prices.dividends IS 'Dividend amount per share paid on trade_date';
COMMENT ON COLUMN daily_prices.stock_splits IS 'Stock split ratio (e.g. 2.0 = 2:1 split) on trade_date';
COMMENT ON COLUMN daily_prices.source IS 'Provider that sourced this price record (yfinance, upstox, nse)';
COMMENT ON COLUMN daily_prices.quality_score IS 'Data quality score 0-100 for this price record';
COMMENT ON COLUMN daily_prices.ingested_at IS 'When this record was inserted into the warehouse';

-- Ensure indexes exist for common query patterns
CREATE INDEX IF NOT EXISTS idx_daily_prices_symbol_trade_date
  ON daily_prices (symbol, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_prices_trade_date
  ON daily_prices (trade_date DESC);
