# AGENT D — Evidence Dashboard

## evidence_registry Table
```sql
CREATE TABLE IF NOT EXISTS evidence_registry (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL UNIQUE,
  predictions_created INTEGER DEFAULT 0,
  predictions_validated INTEGER DEFAULT 0,
  predictions_pending INTEGER DEFAULT 0,
  hit_rate_30d REAL,
  hit_rate_90d REAL,
  hit_rate_365d REAL,
  sharpe_30d REAL,
  confidence_accuracy REAL,
  coverage_pct REAL,
  errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Daily Dashboard Metrics
| Metric | Source | Purpose |
|--------|--------|---------|
| predictions_created | PredictionFactory output | Shows engine is running |
| predictions_validated | OutcomeValidator output | Shows evidence accumulation |
| hit_rate_30d/90d/365d | prediction_registry | Core performance metric |
| sharpe_30d | prediction_registry | Risk-adjusted performance |
| confidence_accuracy | Calibration comparison | Model integrity check |
| errors_count | Pipeline failures | System health |

### Dashboard API
GET /api/evidence/dashboard — returns latest snapshot + 30-day trend

### Purpose
**Know whether SSI is improving or degrading.** The evidence dashboard is the single source of truth for platform performance.
