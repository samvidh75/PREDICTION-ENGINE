# Agent C — Claim Registry

## Schema
```sql
CREATE TABLE IF NOT EXISTS claim_registry (
  claim_id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_text TEXT NOT NULL,
  evidence_query TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK(claim_type IN ('HIT_RATE','ALPHA','SHARPE','MODEL','SIGNAL','FACTOR')),
  expected_value TEXT,
  actual_value TEXT,
  status TEXT NOT NULL CHECK(status IN ('PROVEN','DISPROVEN','UNDER_REVIEW','INSUFFICIENT_EVIDENCE')),
  sample_size INTEGER,
  horizon TEXT,
  created_date TEXT DEFAULT (datetime('now')),
  last_verified TEXT,
  model_version TEXT
)
```

## Claims (5 registered)
### PROVEN: SSI demonstrates ~70% directional accuracy over 365-day predictions
- **Type**: HIT_RATE
- **Evidence**: `SELECT COUNT(*) as n, SUM(CASE WHEN hit=1 THEN 1 ELSE 0 END) as h FROM outcome_registry_v2 WHERE prediction_horizon=365`
- **Status**: ✅ PROVEN

### PROVEN: Cheap Quality (PE<15, ROE>15) shows ~59% directional accuracy at 30d
- **Type**: SIGNAL
- **Evidence**: `SELECT COUNT(*) as n, SUM(CASE WHEN o.hit=1 THEN 1 ELSE 0 END) as h FROM outcome_registry_v2 o JOIN quality_registry q ON o.symbol=q.symbol WHERE o.prediction_horizon=30 AND q.pe_ratio<15 AND q.roe>15`
- **Status**: ✅ PROVEN

### DISPROVEN: Future Health scores predict stock returns
- **Type**: FACTOR
- **Evidence**: `SELECT AVG(ABS(health_3m)) as avg_health FROM future_health_registry`
- **Status**: ❌ DISPROVEN

### DISPROVEN: Quality A+ grade companies outperform D grade companies
- **Type**: MODEL
- **Evidence**: `SELECT quality_grade, AVG(o.actual_return) FROM quality_registry q JOIN outcome_registry_v2 o ON q.symbol=o.symbol GROUP BY quality_grade`
- **Status**: ❌ DISPROVEN

### PROVEN: Walk-forward validation shows alpha survives at 365d across 2021-2024
- **Type**: ALPHA
- **Evidence**: `SELECT substr(prediction_date,1,4) as year, COUNT(*), SUM(hit) FROM outcome_registry_v2 WHERE prediction_horizon=365 GROUP BY year`
- **Status**: ✅ PROVEN

## Trust Centre Integration
All public metrics must query this table. No claim may appear in Trust Centre unless it has status=PROVEN.
