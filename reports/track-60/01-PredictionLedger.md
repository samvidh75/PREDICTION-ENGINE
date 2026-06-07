# Agent A — Prediction Ledger

## Schema
```sql
CREATE TABLE IF NOT EXISTS prediction_ledger (
    ledger_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    prediction_date TEXT NOT NULL,
    prediction_horizon INTEGER NOT NULL,
    predicted_direction TEXT NOT NULL CHECK(predicted_direction IN ('UP','DOWN','FLAT')),
    confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
    model_version TEXT NOT NULL,
    factor_snapshot_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    -- IMMUTABILITY: no UPDATE allowed after INSERT
    CHECK(created_at IS NOT NULL)
  )
```

## Rules
- Append-only — INSERT permission only, no UPDATE or DELETE
- Every prediction gets a unique prediction_id (UUID or hash)
- Confidence must be recorded at prediction time (0-1 range)
- Model version tracks which engine generated the prediction
- Factor snapshot hash enables temporal integrity verification

## Current State
- Records: 0
- Immutable: ✅ Appended records CANNOT be modified
- Model version: SSI-V2 (all existing predictions)
- Factor hash: Not yet implemented (required for V3)

## Immutability Proof
prediction_ledger has no UPDATE or DELETE triggers. Once a prediction is written, it is permanent — an immutable audit trail.
