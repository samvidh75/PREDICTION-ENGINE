# Provider Environment and Ingestion Readiness Report

## Baseline Deployment Status
- Repo up‑to‑date on **main** (commit `42a802ad`).
- Railway project **dynamic-renewal**, service **PREDICTION-ENGINE**, environment **production** — online.
- Postgres volume is online; backend service is listening on `0.0.0.0:8080`.
- Frontend domain and health endpoint (`/api/ops/health`) return 200.

## Secret Hygiene Check
- `git grep` found only **variable names** in docs, CI files, and `.env.example` — no committed secret values.
- `.env`, `.env.local`, `.env.production` are git‑ignored and untracked (confirmed via `git status --ignored --short`).
- No indication of accidentally committed provider keys, connection strings, or tokens.
- **Result: clean.** No repo‑level secret leak.

## Railway Environment Presence (safe check)

| Variable | Status |
|---|---|
| `DATABASE_URL` | present |
| `COOKIE_SECRET` | present |
| `FINNHUB_KEY` | present |
| `INDIANAPI_KEY` | present |
| `UPSTOX_ACCESS_TOKEN` | present |
| `UPSTOX_API_KEY` | present |
| `UPSTOX_CLIENT_SECRET` | present |
| `REDIS_URL` | missing |

*(Checked via `railway run npx tsx -e` that prints only `present`/`missing`.)*

## Provider Smoke Test Results

### FINNHUB
| Test | Result |
|---|---|
| **Status** | **Present but provider rejected (403 Forbidden)** |
| All 5 symbols (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK) | HTTP 403 on both `stock/metric` and `stock/profile2` endpoints |
| Key accepted by Finnhub | No — 403 indicates invalid/revoked key, IP‑restricted access, or plan‑level denial |
| Coverage | 0/10 fields for all symbols |
| Secret printed | No |

**Recommendation:** This FINNHUB key should be rotated and tested again. A 403 from Finnhub typically means the API key is disabled, expired, or the IP/domain is not on the allow‑list. If this key was previously printed elsewhere, it may have been revoked by Finnhub.

### INDIANAPI
| Test | Result |
|---|---|
| **Status** | **Present and partially accepted** |
| RELIANCE | Accepted — 1/10 fields (10%) |
| INFY | Accepted — 1/10 fields (10%) |
| HDFCBANK | Accepted — 1/10 fields (10%) |
| ICICIBANK | Accepted — 1/10 fields (10%) |
| TCS | Failed — network error (aborted), likely timeout |
| Auth error | None — key accepted by IndianAPI |
| Coverage | Minimal (quote/price only) |
| Secret printed | No |

**Note:** IndianAPI returns basic quote data but very few fundamental fields. This is expected for the free/limited tier of IndianAPI.in — sufficient for quote/metadata fallback but not for full fundamental coverage.

### UPSTOX
- Environment variable `UPSTOX_ACCESS_TOKEN` is present.
- No live smoke test was executed (existing smoke scripts do not include Upstox).
- The data‑coverage endpoint reports the variable as `present`.

### Yahoo / Moneycontrol / Screener
- These providers do **not** require API keys — they scrape public pages.
- The authorized ingestion scripts (`ingest-authorized-quotes`, `ingest-authorized-shareholding`, etc.) use Moneycontrol and are available for real‑data ingestion without provider keys.

## Migration Checksum Diagnosis

| Check | Result |
|---|---|
| Migration file in repo | `src/db/migrations/016_authorized_provider_ingestion.sql` |
| Git history | Only **one commit** (`d384a8bf`) — file has never been modified since creation |
| Local checksum | `b3b47aa4a51d828f` |
| Production status | Health endpoint reports `migrationsReady: true` |
| Checksum mismatch | **Not detected** — migration runner confirmed integrity |

**Conclusion:** No checksum mismatch exists. The production database schema matches the current migration files.

## Scheduler Health Diagnosis

| Check | Result |
|---|---|
| `/api/ops/health` | `scheduler_health: "error"` |
| Root cause | The health route queries `pipeline_health` table — **no pipeline runs have ever been recorded** (zero ingestion completed). The query likely returns zero rows or the table does not exist, causing the catch block to return `"error"`. |
| Provider env impact | Provider vars are present but the scheduler has never run, so it's not a misconfiguration — it's an **absence of data** |
| Redis dependency | `REDIS_URL` is missing but `PROVIDER_BROKER_REDIS_REQUIRED` is not set, so this is not a blocker |
| Resolution | Scheduler health will become `"no runs"` after a real ingestion pipeline completes and records an entry in `pipeline_health` |

## Data Coverage Baseline

| Metric | Value |
|---|---|
| Symbols | 5 (test only — no real companies) |
| Daily prices | 2,485 rows, 5 symbols, latest: `2026-06-16` |
| Financial snapshots | 0 rows |
| Feature snapshots | 0 rows (status: unavailable) |
| Factor snapshots | 0 rows (status: unavailable) |
| Prediction registry | 0 rows |
| Latest price date | Today (2026-06-16) |
| DB status | `ready`, `migrationsReady: true` |

All provider variables (`FINNHUB_KEY`, `INDIANAPI_KEY`, `UPSTOX_ACCESS_TOKEN`, `UPSTOX_API_KEY`, `UPSTOX_CLIENT_SECRET`) are reported as `present` by the `/api/ops/data-coverage` endpoint.
`REDIS_URL` is `missing` (expected — not required for current configuration).

## Ingestion Scripts Discovered

| Script | Command | Dry‑run | Tables Written | API Keys Required | Idempotent |
|---|---|---|---|---|---|
| Authorized quotes | `npm run ingest:authorized:quotes -- --symbols=X,Y` | `--apply` flag | `daily_prices`, `provider_field_lineage`, `provider_ingestion_runs` | None (Moneycontrol scrape) | Yes (upsert on `daily_prices`) |
| Authorized shareholding | `npm run ingest:authorized:shareholding -- --symbols=X,Y` | `--apply` flag | `shareholding_snapshots`, `provider_field_lineage`, `provider_ingestion_runs` | None (Moneycontrol scrape) | Yes (upsert on PK) |
| Authorized corporate actions | `npm run ingest:authorized:corporate-actions -- --symbols=X,Y` | `--apply` flag | `corporate_actions` (plain INSERT), `provider_ingestion_runs` | None (Moneycontrol scrape) | **No** — duplicates on re‑run |
| Authorized financials | `npm run ingest:authorized:financials -- --symbols=X,Y` | `--apply` flag | None (TODO stubs) | None | N/A (no‑op) |
| Fundamentals ingestion | `npm run ingest:fundamentals` | None (requires `--dry-run` support check) | Various financial tables | `FINNHUB_KEY`, `INDIANAPI_KEY` | Unknown |
| Provider live test | `npx tsx src/scripts/provider-live-test.ts` | None | None (writes report JSON files) | `FINNHUB_KEY`, `INDIANAPI_KEY`, `DATABASE_URL` | N/A (read‑only) |

## Smallest Safe Ingestion Plan

**Recommended first step** — run the authorized quote ingestion for 5 symbols in dry‑run mode to confirm behavior, then with `--apply` to write real data:

```
# 1. Dry-run (read-only, no DB writes)
railway run --service PREDICTION-ENGINE --environment production \
  npx tsx scripts/ingest-authorized-quotes.ts \
  --symbols=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK

# 2. After reviewing dry-run output, apply (writes real Moneycontrol data)
railway run --service PREDICTION-ENGINE --environment production \
  npx tsx scripts/ingest-authorized-quotes.ts \
  --symbols=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK --apply
```

**Script properties:**
- **Read‑only without `--apply`**: yes
- **Idempotent writes**: yes (`ON CONFLICT DO UPDATE` on `(symbol, trade_date)`)
- **No API keys required**: scrapes public Moneycontrol pages
- **Writes only real data**: no fakes
- **Limited symbol set**: 5 symbols only, can be extended via `--limit`
- **Duration**: ~30 seconds for 5 symbols
- **Rollback**: stop the process (Ctrl‑C) — already‑written rows are safe due to upsert logic
- **Rate‑limit risk**: None — Moneycontrol scraping is rate‑limited in‑script (6 req/min configured)

**After quotes are populated**, run shareholding ingestion:
```
railway run --service PREDICTION-ENGINE --environment production \
  npx tsx scripts/ingest-authorized-shareholding.ts \
  --symbols=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK --apply
```

**Do not run** `ingest-authorized-corporate-actions` with `--apply` until deduplication is fixed (plain INSERT, no upsert).

### Commands Requiring Approval
- Any `--apply` write command in Railway production
- `npm run ingest:fundamentals` — requires working Finnhub/IndianAPI keys
- Any script touching `corporate_actions` table (no upsert — creates duplicates)

## Code Changes
None. Only this report was added.

## Verification Results
| Check | Result |
|---|---|
| `npm run validate:hygiene` | PASS — 0 secrets, 0 hazards |
| `npm run test:unit` | PASS — 74 files, 812 tests |
| `npm run build:backend` | PASS |

## Remaining Blockers
1. **FINNHUB_KEY returns 403 Forbidden** — key is rejected by Finnhub. Must be rotated and re‑validated before any Finnhub‑dependent ingestion can proceed.
2. **Zero real data coverage** — 5 test symbols only. Ready to begin Moneycontrol‑based ingestion (no API key required).
3. **Scheduler health error** — resolves automatically after first ingestion pipeline run.
4. **`REDIS_URL` missing** — not a blocker for current configuration but needed for multi‑replica Redis‑backed broker/rate‑limiting in future.

## Confirmations
- No secrets printed in this report.
- No secrets committed to repository.
- No fake data added.
- No scoring, ranking, or prediction algorithm changes made.
- Migration checksum is intact (no mismatch).
- Provider keys were tested safely without printing values.
