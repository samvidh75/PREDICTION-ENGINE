-- 052_fix_benchmark_observations_columns.sql
--
-- benchmark_observations was created in 008_create_prediction_registry.sql
-- with columns nifty50/nifty100/nifty500 (Indian NSE index names, leftover
-- from the pre-PSE version of this product). BenchmarkTracker.ts was later
-- rewritten to reference kse100/kse30/kse_allshare (Karachi Stock Exchange,
-- Pakistan — also wrong) without a matching migration, so every query
-- against this table has been failing with "column does not exist" since
-- that rewrite. This migration brings the schema in line with the actual
-- PSE benchmark ('PSEI' ticker in daily_prices) the code now queries.

ALTER TABLE benchmark_observations RENAME COLUMN nifty50 TO psei;
ALTER TABLE benchmark_observations RENAME COLUMN nifty100 TO psei_top10;
ALTER TABLE benchmark_observations RENAME COLUMN nifty500 TO pse_all_shares;
