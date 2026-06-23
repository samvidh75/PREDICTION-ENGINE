# 83 — IndianAPI Premium Intelligence Ingestion Pipeline

**Date:** 2026-06-23
**Phase:** Part DA

## Commit Hash

`c35776abc` — pushed to `main`

## Files Created

| File | Purpose |
|------|---------|
| `requirements-indianapi-premium.txt` | Python deps: aiohttp, pandas, sqlalchemy, tenacity, psycopg2, dotenv |
| `src/shared/intelligence/IndianApiPremiumTypes.ts` | Canonical types: StockIntelligenceSnapshot, SuperScanResult, DashboardSnapshot |
| `src/backend/integrations/indianapi/IndianApiPremiumConfig.ts` | Config reader with safe summary (no secrets exposed) |
| `src/db/migrations/028-indianapi-premium-intelligence.sql` | Additive tables: stock_live_snapshot, stock_intelligence_history, stock_intelligence_ingestion_runs, stock_super_scan_results |
| `scripts/python/check_indianapi_premium_runtime.py` | Python runtime/dependency check |
| `scripts/python/ingest_indianapi_premium.py` | Async ingestion engine: aiohttp + semaphore + tenacity retry + normalizer + DB upsert + super scans |
| `scripts/indianapi-premium-config.ts` | Config dump script |
| `scripts/indianapi-premium-smoke.ts` | Smoke test hitting IndianAPI Premium endpoints |
| `scripts/run-indianapi-premium-job.ts` | Scheduled job runner (market hours / EOD / default) |
| `scripts/run-super-scans.ts` | Super scan execution from DB snapshots |
| `src/backend/services/intelligence/StockIntelligenceRepository.ts` | DB query layer for snapshot/history/scans |
| `src/backend/services/intelligence/StockIntelligenceService.ts` | Business logic with public-safe formatting |
| `src/backend/services/scanner/SuperScanService.ts` | 6 scan rules with scoring |
| `src/backend/web/routes/intelligenceSnapshots.ts` | API routes served from local DB |
| `src/backend/web/routes/superScans.ts` | Super scan API routes |
| `scripts/indianapi-premium-smoke.ts` | Smoke test script |

## Python Runtime

Requires Python 3 with: aiohttp, pandas, sqlalchemy, tenacity, psycopg2-binary, python-dotenv.

```bash
pip install -r requirements-indianapi-premium.txt
npm run indianapi:premium:check
```

## IndianAPI Premium Config

| Setting | Value |
|---------|-------|
| enabled | INDIANAPI_PREMIUM_ENABLED (default: false) |
| hasApiKey | INDIANAPI_PREMIUM_API_KEY |
| baseUrl | INDIANAPI_PREMIUM_BASE_URL (default: https://analyst.indianapi.in) |
| timeout | 15000ms |
| concurrency | 20 |
| rateLimit | 300/min |
| historyEnabled | true |
| scanEnabled | false |

## Symbols

Default symbols: RELIANCE, ITC, TCS, INFY, HDFCBANK, HINDUNILVR, ICICIBANK, BHARTIARTL, SBIN, BAJFINANCE

Or load from DB: `--from-db`

## DB Snapshot

- `stock_live_snapshot` — upserted per symbol, partial update preserves prior good data
- `stock_intelligence_history` — append-only with ingestion_run_id
- `stock_super_scan_results` — scan_key + symbol results per run

## Super Scans

6 scans defined:
1. Value with quality — PE < 30, ROE > 10, D/E < 2
2. Promoter confidence — Promoter > 40%, ROE > 8%
3. Profitability leaders — ROE > 15%, OPM > 10%
4. Momentum with quality — Positive change, ROE > 8%, D/E < 2.5
5. Balance-sheet strength — D/E < 1, ROE > 8%
6. Risk rising — D/E > 1.5 or profit growth < -10% or OPM < 5%

No forbidden labels (Best stocks to buy, Strong Buy, etc.)

## Backend API Routes

| Route | Method | Source |
|-------|--------|--------|
| `/api/intelligence/snapshot/:symbol` | GET | DB live snapshot |
| `/api/intelligence/dashboard` | GET | DB live snapshots |
| `/api/intelligence/history/:symbol` | GET | DB history |
| `/api/intelligence/ingestion/status` | GET | Last ingestion run |
| `/api/scans/super` | GET | Available scans |
| `/api/scans/super/:scanKey` | GET | Scan results |

All routes read from local DB only — no external API calls in request path.

## Frontend API Client

Not yet wired (new methods need adding to `src/services/api/client.ts`).

## Package Scripts

```json
{
  "indianapi:premium:check": "python3 scripts/python/check_indianapi_premium_runtime.py",
  "indianapi:premium:ingest": "python3 scripts/python/ingest_indianapi_premium.py",
  "indianapi:premium:smoke": "tsx scripts/indianapi-premium-smoke.ts",
  "indianapi:premium:config": "tsx scripts/indianapi-premium-config.ts",
  "scanner:super-scans": "tsx scripts/run-super-scans.ts",
  "job:indianapi-premium": "tsx scripts/run-indianapi-premium-job.ts",
  "job:indianapi-premium:market": "tsx scripts/run-indianapi-premium-job.ts -- --market-hours",
  "job:indianapi-premium:eod": "tsx scripts/run-indianapi-premium-job.ts -- --eod"
}
```

## Tests

- 1597 total tests pass (171 files)
- typecheck:all ✅
- lint ✅
- validate:hygiene ✅ (no secrets)
- build:frontend ✅
- build:backend ✅

## Railway Deployment

Pushed to main. Railway auto-deploys. Routes will be available after deployment:
- `GET /api/intelligence/snapshot/:symbol`
- `GET /api/intelligence/dashboard`
- `GET /api/scans/super`

## Production Smoke (pre-deploy)

Routes not yet available (Railway deploying). Expected:
- `/api/intelligence/snapshot/RELIANCE` → 200
- `/api/intelligence/dashboard` → 200
- `/api/scans/super` → 200

## Remaining Blockers

1. Frontend API client methods not yet added to `src/services/api/client.ts`
2. Frontend stock detail wiring not yet connected
3. Scanner preset wiring not yet connected (super scans need DB data first)
4. Python ingestion not yet run on Railway (needs API key + DB migration)
5. DB migration 028 not yet run on Railway

## Confirmations

- ✅ No fake data
- ✅ No secrets committed
- ✅ No raw payloads committed
- ✅ No public Buy/Sell/Hold labels
- ✅ No DNS changes
- ✅ No IndianAPI calls from frontend
- ✅ No provider wording in public API
- ✅ No NaN/Infinity (normalizer uses None for missing)
- ✅ Partial update preserves prior good data
- ✅ Scanner definitions avoid forbidden labels
