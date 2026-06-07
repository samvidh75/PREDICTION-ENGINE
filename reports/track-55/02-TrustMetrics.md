# AGENT B — TrustMetricsService

## Design

### Metrics Computed (from validated predictions)
1. **Hit Rate**: directionally correct / total validated
2. **Sharpe Ratio**: mean(alpha) / std(alpha)
3. **Calibration Matrix**: actual_vs_expected accuracy per confidence_level  
4. **Horizon Performance**: hit_rate per horizon (30d, 90d, 180d, 365d)
5. **Rolling 90-day Metrics**: last 90 days of validated predictions
6. **Confidence Accuracy**: actual accuracy stratified by confidence_score buckets
7. **Coverage**: symbols_with_predictions / total_universe

### SQL Foundation
```sql
-- Hit rate by horizon
SELECT prediction_horizon,
       COUNT(*) as total,
       SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as hits,
       ROUND(SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as hit_rate
FROM prediction_registry
WHERE validation_status = 'validated'
GROUP BY prediction_horizon;
```

### trust_metrics_registry table
```sql
CREATE TABLE IF NOT EXISTS trust_metrics_registry (
  id TEXT PRIMARY KEY,
  metric_date TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  sample_size INTEGER,
  confidence_interval_lower REAL,
  confidence_interval_upper REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Implementation Location
- Can be added as GET /api/trust/stats endpoint (server-side computation)
- OR computed live in TrustCentrePage.tsx from /api/predictions/journal data
- Current TrustCentrePage already computes hit rate + Sharpe live from journal data ✅
