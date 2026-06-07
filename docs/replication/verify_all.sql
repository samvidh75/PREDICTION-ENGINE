
-- SSI REPLICATION VERIFICATION — Run against stockstory.db
-- File: docs/replication/verify_all.sql

SELECT '=== SSI REPLICATION VERIFICATION ===' as info;
SELECT datetime('now') as verification_timestamp;

-- 1. 365d Hit Rate
SELECT '365d_Hit_Rate' as metric,
  COUNT(*) as n, 
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)*100,1) as hit_rate_pct
FROM alpha_research_registry WHERE prediction_horizon=365 AND actual_return IS NOT NULL;

-- 2. 30d Hit Rate  
SELECT '30d_Hit_Rate' as metric,
  COUNT(*) as n,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL)/COUNT(*)*100,1) as hit_rate_pct
FROM alpha_research_registry WHERE prediction_horizon=30 AND actual_return IS NOT NULL;

-- 3. Date Range
SELECT 'Registry_Date_Range' as info, MIN(prediction_date) as earliest, MAX(prediction_date) as latest
FROM alpha_research_registry WHERE actual_return IS NOT NULL;

-- 4. Unique Universe
SELECT 'Universe_Size' as info, COUNT(DISTINCT symbol) as symbols FROM alpha_research_registry WHERE actual_return IS NOT NULL;

-- 5. Model Versions
SELECT 'Model_Ledger' as info, model_version, COUNT(*) as predictions FROM prediction_ledger GROUP BY model_version;
