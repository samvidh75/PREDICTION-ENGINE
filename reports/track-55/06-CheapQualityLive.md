# AGENT F — Cheap Quality Live Monitor

## Hypothesis
Does "PE < 15 AND ROE > 15" survive in production as a useful filter?

## Daily Tracking
```sql
-- Count candidates meeting criteria
SELECT COUNT(*) FROM financial_snapshots
WHERE pe_ratio < 15 AND roe > 0.15 AND period_end = (SELECT MAX(period_end) FROM financial_snapshots);
```

## Metrics to Track
1. **candidate_count**: symbols passing PE < 15 AND ROE > 15
2. **30d_hit_rate**: % of candidates whose alpha > 0 after 30 days
3. **90d_hit_rate**: % of candidates whose alpha > 0 after 90 days
4. **avg_return**: average alpha of candidates

## Storage
```sql
CREATE TABLE IF NOT EXISTS cheap_quality_monitor (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  candidate_count INTEGER,
  avg_return_30d REAL,
  hit_rate_30d REAL,
  avg_return_90d REAL,
  hit_rate_90d REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Purpose
Track whether simple fundamental screens survive in production as an alpha signal. If they do — valuable content for users. If they don't — avoid making false claims.
