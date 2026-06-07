# AGENT I — Research Run Registry

## research_run_registry
```sql
CREATE TABLE IF NOT EXISTS research_run_registry (
  id TEXT PRIMARY KEY,
  run_date TEXT NOT NULL,
  model_version TEXT NOT NULL,
  dataset_version TEXT NOT NULL,
  run_type TEXT NOT NULL,
  metrics_json TEXT,
  conclusions TEXT,
  is_reproducible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Reproducibility Requirements
Every future report must have:
1. **model_version**: Which SSI version produced this
2. **dataset_version**: Snapshot of data at run time
3. **run_date**: When was this computed
4. **metrics_json**: All computed metrics in structured format
5. **conclusions**: Human-readable findings
6. **is_reproducible**: Can this be recreated?

### Example Entry
```json
{
  "id": "run-2026-06-07-001",
  "run_date": "2026-06-07",
  "model_version": "SSI-V1",
  "dataset_version": "2026-06-07-snapshot",
  "run_type": "daily_prediction_generation",
  "metrics_json": {"created": 150, "errors": 2},
  "conclusions": "149 predictions generated across 50 symbols for 30d horizon"
}
```

### Purpose
Every claim SSI makes should be traceable to a specific research run. No claims without evidence. No evidence without reproducibility.
