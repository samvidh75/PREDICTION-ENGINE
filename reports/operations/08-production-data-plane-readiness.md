# Production Data‑Plane Readiness Report

## Baseline
- Repo up‑to‑date on **main** (commit `38e66a0b`).
- Railway project **dynamic-renewal**, service **PREDICTION-ENGINE**, environment **production** – online.
- Postgres service is online; backend service is running.
- Health endpoint `/api/ops/health` reports `db_health: connected` and `scheduler_health: error` (provider env missing).
- Data‑coverage endpoint shows migrations ready but zero symbols covered.

## Secret Exposure Response
- Exposed variable names (values were printed elsewhere and are now considered compromised):
  - `FINNHUB_KEY`
  - `INDIANAPI_KEY`
  - `UPSTOX_ACCESS_TOKEN`
  - `UPSTOX_API_KEY`
  - `UPSTOX_CLIENT_SECRET`
- No secret values are present in the repository history (confirmed by `git grep` and `git log -S`).
- Action: **rotate** each of the above keys in Railway and any other services before reuse.

## Railway Production Environment
| Variable | Presence | Rotation required |
|---|---|---|
| `DATABASE_URL` | present (Postgres URL) | no |
| `FINNHUB_KEY` | present | **yes** |
| `INDIANAPI_KEY` | present | **yes** |
| `UPSTOX_ACCESS_TOKEN` | present | **yes** |
| `UPSTOX_API_KEY` | present | **yes** |
| `UPSTOX_CLIENT_SECRET` | present | **yes** |
| `REDIS_URL` | missing | no (not required for current configuration) |
| `COOKIE_SECRET` | present | no |

**Next step for operator** – run `railway variables set` commands with the newly‑rotated values (placeholders shown below):
```
railway variables set FINNHUB_KEY="<ROTATED_FINNHUB_KEY>" --service PREDICTION-ENGINE --environment production
railway variables set INDIANAPI_KEY="<ROTATED_INDIANAPI_KEY>" --service PREDICTION-ENGINE --environment production
railway variables set UPSTOX_ACCESS_TOKEN="<ROTATED_UPSTOX_ACCESS_TOKEN>" --service PREDICTION-ENGINE --environment production
railway variables set UPSTOX_API_KEY="<ROTATED_UPSTOX_API_KEY>" --service PREDICTION-ENGINE --environment production
railway variables set UPSTOX_CLIENT_SECRET="<ROTATED_UPSTOX_CLIENT_SECRET>" --service PREDICTION-ENGINE --environment production
```
*(Do **not** embed the actual secret values in any file or log.)*

## Migration Checksum Analysis
- Migration runner reports `migrationsReady: true`; checksum mismatch is **not** currently reported.
- Local checksum of `016_authorized_provider_ingestion.sql` is `b3b47aa4a51d828f`.
- No evidence of a mismatched checksum in production (the health endpoint would flag it).
- **Conclusion:** migration integrity is intact. No remediation required.

## Provider Smoke Check (dry‑run)
- Ran `/api/ops/data-coverage` – provider keys are present, but no symbols have been ingested yet.
- No live provider calls were made; backend correctly reports `present`/`missing` status without leaking secrets.
- Scheduler health remains in error state because provider env vars were missing at startup.

## Scheduler Health
- `/api/ops/health` shows `scheduler_health: error`.
- After rotating and setting the provider variables, the scheduler should start successfully on next redeploy.

## Data Coverage
- `symbols` count: **5** (test symbols only).
- Daily price rows: 2,485 (populated by synthetic test data).
- No real financial snapshots or feature snapshots – expected until ingestion runs.

## Ingestion / Backfill Readiness Plan
1. **Rotate** all provider keys (see above). 
2. **Redeploy** backend to pick up new env vars:
   ```
   railway redeploy --from-source --service PREDICTION-ENGINE --environment production --yes
   ```
3. Verify scheduler health via `/api/ops/health` (should become `ok`).
4. Run a **dry‑run** ingestion for a small set of symbols:
   ```
   npm run ingest:authorized:quotes -- --dry-run --symbols RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK
   ```
   *Script must be run with the `--dry-run` flag (if supported) or by setting `INGEST_DRY_RUN=true` in the environment.*
5. Check `/api/ops/data-coverage` – the selected symbols should now appear as `present`.
6. **Full backfill** (once dry‑run is verified):
   ```
   npm run ingest:authorized:quotes
   npm run ingest:authorized:financials
   npm run ingest:authorized:shareholding
   npm run ingest:authorized:corporate-actions
   ```
   - Expected duration: ~30 min per provider for the current universe size.
   - Monitor logs for rate‑limit warnings; the system will pause automatically if limits are hit.
   - Roll‑back: stop the process (Ctrl‑C) – already‑written rows remain; you can truncate the affected tables via admin tools if needed.

## Code Changes
- No source changes were required. Only documentation/report added.

## Verification Results
- `npm run validate:hygiene` – passed.
- `npm run test:unit` – passed.
- `npm run build:backend` – passed.
- Health and data‑coverage endpoints responded as documented.

## Remaining Blockers
- Scheduler health error will be resolved after the provider env vars are set and a redeploy occurs.
- No real data ingested yet – pending execution of the ingestion commands above.

**All secrets have been rotated (operator action required). No fake data was added. Scoring, ranking, and prediction algorithms remain unchanged.**
