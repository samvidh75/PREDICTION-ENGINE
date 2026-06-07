# Agent B — Outcome Registry V2

## Schema
```sql
CREATE TABLE IF NOT EXISTS outcome_registry_v2 (
    outcome_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL REFERENCES prediction_ledger(prediction_id),
    symbol TEXT NOT NULL,
    prediction_date TEXT NOT NULL,
    prediction_horizon INTEGER NOT NULL,
    outcome_date TEXT NOT NULL,
    price_at_prediction REAL,
    price_at_outcome REAL,
    actual_return REAL NOT NULL,
    benchmark_return REAL,
    alpha REAL GENERATED ALWAYS AS (actual_return - COALESCE(benchmark_return, 0)),
    hit INTEGER NOT NULL CHECK(hit IN (0,1)),
    validated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(prediction_id, outcome_date)
  )
```

## Rules
- Only source of realised returns
- No duplicate outcomes per prediction
- Horizon-specific validation window
- Benchmark returns stored alongside
- alpha = actual_return - benchmark_return (computed column)

## Current State
- Records: 0
- Unique constraint: ✅ No duplicate outcomes per prediction
- Benchmark returns: Not yet populated (requires NIFTY 50 benchmark data)
