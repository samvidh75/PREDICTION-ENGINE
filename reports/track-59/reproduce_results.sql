
-- ============================================================
-- SSI V3 REPRODUCIBILITY QUERIES
-- Run these against stockstory.db to verify all published claims
-- ============================================================

-- 1. VERIFY: 69.8% 365d directional accuracy
SELECT '365d_Hit_Rate' as metric,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as correct_direction,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as hit_rate_pct
FROM alpha_research_registry
WHERE prediction_horizon = 365 AND actual_return IS NOT NULL;

-- 2. VERIFY: 55.0% 30d hit rate  
SELECT '30d_Hit_Rate' as metric,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as correct_direction,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as hit_rate_pct
FROM alpha_research_registry
WHERE prediction_horizon = 30 AND actual_return IS NOT NULL;

-- 3. VERIFY: Cheap Quality (PE<15, ROE>15) 30d hit rate
SELECT 'Cheap_Quality' as strategy,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN a.hit=1 OR a.hit='true' THEN 1 ELSE 0 END) as correct_direction,
  ROUND(CAST(SUM(CASE WHEN a.hit=1 OR a.hit='true' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as hit_rate_pct
FROM alpha_research_registry a
JOIN quality_registry q ON a.symbol = q.symbol
WHERE a.prediction_horizon = 30 AND a.actual_return IS NOT NULL
  AND q.pe_ratio < 15 AND q.roe > 15;

-- 4. VERIFY: Quality factor correlation at 365d
-- (Approximate via top vs bottom decile hit rate spread)
SELECT 'Quality_365d_Spread' as metric,
  AVG(CASE WHEN ranked = 1 THEN actual_return ELSE NULL END) as top_decile_avg_return,
  AVG(CASE WHEN ranked = 10 THEN actual_return ELSE NULL END) as bottom_decile_avg_return
FROM (
  SELECT actual_return,
    NTILE(10) OVER (ORDER BY quality_factor DESC) as ranked
  FROM alpha_research_registry
  WHERE prediction_horizon = 365 AND actual_return IS NOT NULL AND quality_factor IS NOT NULL
);

-- 5. VERIFY: Prediction registry size
SELECT 'Registry_Stats' as metric,
  COUNT(*) as total_validated_predictions,
  MIN(prediction_date) as earliest_date,
  MAX(prediction_date) as latest_date,
  COUNT(DISTINCT symbol) as unique_symbols
FROM alpha_research_registry WHERE actual_return IS NOT NULL;

-- 6. VERIFY: Walk-forward 365d by year
SELECT substr(prediction_date, 1, 4) as year,
  COUNT(*) as n,
  SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) as hits,
  ROUND(CAST(SUM(CASE WHEN hit=1 OR hit='true' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as hit_rate_pct
FROM alpha_research_registry
WHERE prediction_horizon = 365 AND actual_return IS NOT NULL
GROUP BY substr(prediction_date, 1, 4)
ORDER BY year;

-- 7. VERIFY: Quality V5 top stocks
SELECT symbol, pe_ratio, roe, roce, dividend_yield,
  ROUND(CASE WHEN pe_ratio>0 THEN MIN(1.0,15.0/pe_ratio) ELSE 0 END * 0.35 + MIN(1.0,(roe||0)/20)*0.30 + MIN(1.0,(roce||0)/25)*0.20 + MIN(1.0,(dividend_yield||0)/4)*0.15, 4) as qv5_score
FROM quality_registry
WHERE pe_ratio IS NOT NULL AND roe IS NOT NULL AND roce IS NOT NULL
ORDER BY qv5_score DESC LIMIT 5;
