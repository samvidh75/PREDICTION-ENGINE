-- Materialized view: rolling 1-year stats per symbol from the OHLCV fact table.
-- Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_averages;
-- Schedule: nightly after market close (see DataWarehouseRefreshJob).

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stock_averages AS
SELECT
  symbol,
  AVG(close_price)  AS avg_price_1y,
  MAX(high_price)   AS high_52w,
  MIN(low_price)    AS low_52w,
  AVG(volume)       AS avg_volume_1y,
  STDDEV_SAMP(close_price) AS price_stddev_1y,
  COUNT(*)          AS trading_days
FROM fact_ohlcv
WHERE quote_date > CURRENT_DATE - INTERVAL '1 year'
GROUP BY symbol;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stock_averages_symbol
  ON mv_stock_averages (symbol);
