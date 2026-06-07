# AGENT J — 30-Day Autonomous Certification

## Assessment

### Can SSI Run Unattended for 30 Days?

### What Works Automatically
✅ PredictionFactory generates new predictions daily (idempotent)
✅ OutcomeValidator validates matured predictions (idempotent)
✅ Trust Centre reads live from prediction_registry
✅ Watchlist Intelligence reads live from factor_snapshots
✅ Superpages display live from /api/stockstory API
✅ Prediction Journal shows live from prediction_registry

### What Needs Manual Intervention
⚠️ Data population (yfinance/Screener scripts) — not yet automated as cron
⚠️ Factor recomputation — dependent on data refresh completing
⚠️ Error monitoring — pipeline_health table exists but no alerting
⚠️ Model retraining — SSI-V1 currently static (by design for reproducibility)

### What's Missing for Full Autonomy
1. **Cron scheduler deployment** — dailyPipeline.ts needs to be executed on schedule
2. **Data refresh automation** — price/fundamental ingestion needs cron
3. **Alerting** — Slack/email when pipeline_health shows errors for 3+ consecutive runs
4. **Dashboard** — evidence_registry dashboard not yet built (internal tool)

### Verdict
**SSI CAN OPERATE UNATTENDED FOR 30 DAYS** IF:
- Daily data refresh is running
- dailyPipeline is deployed as cron
- Pipeline health is monitored (alerts on consecutive failures)

Without data refresh automation, SSI will produce predictions from stale data but won't generate new evidence.
