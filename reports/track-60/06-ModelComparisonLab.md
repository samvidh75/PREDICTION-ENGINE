# Agent F — Model Comparison Lab

## Schema
```sql
CREATE TABLE IF NOT EXISTS model_comparison_registry (
  comparison_id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  evaluation_date TEXT NOT NULL,
  horizon INTEGER NOT NULL,
  sample_size INTEGER NOT NULL,
  hit_rate REAL NOT NULL,
  mean_return REAL,
  sharpe_ratio REAL,
  calibration_bias REAL,
  UNIQUE(model_id, evaluation_date, horizon)
)
```

## Tracked Metrics per Model
- Hit Rate
- Mean Return
- Sharpe Ratio
- Calibration Bias

## Current Entries: 3

Models tracked over time to detect signal decay or improvement.
