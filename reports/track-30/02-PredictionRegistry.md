# TRACK-30 Phase 2: Forward Prediction Registry

## Status: **INSUFFICIENT EVIDENCE**

The prediction_registry table does not exist in the current database schema.

### Required Schema
```sql
CREATE TABLE prediction_registry (
  symbol TEXT NOT NULL,
  ranking_date TEXT NOT NULL,
  ranking_score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  confidence TEXT,
  growth_score INTEGER,
  quality_score INTEGER,
  stability_score INTEGER,
  momentum_score INTEGER,
  valuation_score INTEGER,
  risk_score INTEGER,
  sector TEXT,
  market_cap REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (symbol, ranking_date)
);
```

### Current Baseline (would populate this table)
The 20 rankings computed in Phase 1 would be the first entries.

### Recommendation
✅ Create this table before TRACK-31.
✅ Insert today's baseline as the first forward-prediction cohort.
✅ Recompute rankings and measure 7/30/90-day forward returns against stored predictions.
