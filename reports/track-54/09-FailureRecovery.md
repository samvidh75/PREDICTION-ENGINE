# AGENT I — Failure Recovery

## Failure Detection

### Pipeline Health Registry
```sql
CREATE TABLE IF NOT EXISTS pipeline_health (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  symbols_processed INTEGER,
  symbols_failed INTEGER,
  errors TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Failure Scenarios
| Scenario | Detection | Recovery |
|----------|-----------|----------|
| API failure (missing prices) | Phase 1 returns 0 new rows | Skip symbols with missing data, continue |
| Factor compute failure | Phase 1 partial | Recompute from raw data |
| Prediction gen failure | Phase 2 returns errors[] | Skip failed symbols, generate for rest |
| Validation failure | Phase 3 can't find price data | Leave as 'pending', try next day |
| DB connection failure | ConnectionError | Exponential backoff, retry 3x |
| Partial run (crash mid-pipeline) | pipeline_health shows incomplete phases | Pipeline is idempotent — safe to re-run |

### Monitoring
- pipeline_health table tracks every run
- Slack/email alerts if errors.length > 0 for 3 consecutive runs
- Health dashboard shows pipeline status (last run, success rate)

### Success
- ✅ All failure modes identified
- ✅ Recovery paths defined
- ✅ Idempotent design prevents data corruption
- ✅ Monitoring table defined
