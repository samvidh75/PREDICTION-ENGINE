-- SSI TRACK-60 REPRODUCIBILITY — Run against stockstory.db
-- Command: sqlite3 data/stockstory.db < scripts/reproduce_all.sql

SELECT '=== SSI TRACK-60 REPRODUCTION ===' as info;
SELECT datetime('now') as timestamp;

-- 1. Data Coverage
SELECT 'SOURCE: Data Coverage' as source;
SELECT 'daily_prices' as tbl, COUNT(*) as rows, MIN(trade_date) as from, MAX(trade_date) as to FROM daily_prices
UNION ALL
SELECT 'financial_snapshots', COUNT(*), MIN(period_end), MAX(period_end) FROM financial_snapshots
UNION ALL
SELECT 'factor_snapshots', COUNT(*), MIN(trade_date), MAX(trade_date) FROM factor_snapshots
UNION ALL
SELECT 'feature_snapshots', COUNT(*), MIN(trade_date), MAX(trade_date) FROM feature_snapshots
UNION ALL
SELECT 'prediction_registry', COUNT(*), MIN(prediction_date), MAX(prediction_date) FROM prediction_registry
UNION ALL
SELECT 'quality_registry', COUNT(*), MIN(data_date), MAX(data_date) FROM quality_registry;

-- 2. Universe Size
SELECT 'SOURCE: Universe' as source;
SELECT COUNT(DISTINCT symbol) as unique_symbols FROM quality_registry;

-- 3. Hit Rates by Horizon
SELECT 'SOURCE: Hit Rates' as source;
SELECT prediction_horizon, 
  COUNT(*) as n,
  SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as hits,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)*100,1) as hit_rate_pct
FROM alpha_research_registry WHERE actual_return IS NOT NULL
GROUP BY prediction_horizon ORDER BY prediction_horizon;

-- 4. Walk-Forward 365d by Year
SELECT 'SOURCE: Walk-Forward 365d' as source;
SELECT substr(prediction_date,1,4) as year,
  COUNT(*) as n,
  SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as hits,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)*100,1) as hit_rate_pct
FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL
GROUP BY year ORDER BY year;

-- 5. Cheap Quality (PE<15, ROE>15) — 30d
SELECT 'SOURCE: Cheap Quality 30d' as source;
SELECT COUNT(*) as n,
  SUM(CASE WHEN a.hit=1 OR a.hit='true' THEN 1 ELSE 0 END) as hits,
  ROUND(CAST(SUM(CASE WHEN a.hit=1 OR a.hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)*100,1) as hit_rate_pct
FROM alpha_research_registry a JOIN quality_registry q ON a.symbol=q.symbol
WHERE a.prediction_horizon=30 AND a.actual_return IS NOT NULL AND q.pe_ratio<15 AND q.roe>15;

-- 6. Model Versions
SELECT 'SOURCE: Model Versions' as source;
SELECT created_by, COUNT(*) as predictions FROM prediction_registry GROUP BY created_by;

-- 7. Leakage Audit
SELECT 'SOURCE: Leakage Audit' as source;
SELECT name as table_name FROM sqlite_master WHERE type='table'
AND (sql LIKE '%actual_return%' OR sql LIKE '%future_return%' OR sql LIKE '%validated_return%')
AND name NOT IN ('alpha_research_registry','prediction_registry','outcome_registry_v2','prediction_ledger');

-- 8. Temporal Integrity
SELECT 'SOURCE: Temporal Integrity' as source;
SELECT COUNT(*) as look_ahead_violations
FROM prediction_registry p JOIN quality_registry q ON p.symbol=q.symbol
WHERE q.data_date > p.prediction_date;

-- 9. Confidence Intervals (365d)
SELECT 'SOURCE: 365d CI' as source;
SELECT COUNT(*) as n,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*),4) as hit_rate,
  ROUND(1.96*SQRT((CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*))*(1-(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)))/COUNT(*)),4) as ci_margin
FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL;

-- 10. Sharpe Ratio Estimate (365d)
SELECT 'SOURCE: Sharpe Estimate' as source;
SELECT ROUND(AVG(actual_return)/NULLIF(SQRT(AVG(actual_return*actual_return)-AVG(actual_return)*AVG(actual_return)),0)*SQRT(252.0/365),3) as sharpe_approx
FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL;

SELECT '=== REPRODUCTION COMPLETE ===' as status;
