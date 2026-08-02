# Provider Token Runbook and Symbol Expansion

**Baseline commit**: `8964133a`
**HEAD commit**: same (will be updated post-commit)
**Date**: 2026-06-17

---

## Summary

- Upstox token diagnostics created; token confirmed **expired** (HTTP 401)
- IndianAPI fundamentals limitation classified (₹399 tier, no fundamentals)
- Pipeline error classification improved (`provider_auth_expired`, `provider_plan_limited`, `provider_network_error`, `code_error`)
- Symbol universe verified: 6 symbols viable (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL)
- Controlled ingestion pipeline run via Railway API — all stages **success**
- Coverage expanded: BHARTIARTL now has prediction entries; factor snapshots up 20%

---

## Upstox Token Diagnostic Status

| Check | Result |
|---|---|
| Token presence | present |
| Token validity | **expired** (HTTP 401) |
| Script exit code | 2 (expected for expired token) |

The Upstox diagnostic script (`scripts/check-upstox-token.ts`) was created with:
- Safe environment variable check (present/missing only)
- Lightweight Upstox API call (`GET /user/profile`)
- Classified status: valid, expired, unauthorized, network_error, provider_error, unknown
- No token value printed or logged
- Exit codes: 0=valid, 1=missing, 2=expired, 3=unauthorized, 4+=error

## Upstox Token Refresh Runbook

Created `docs/deployment/upstox-token-runbook.md` with:
- Step-by-step OAuth refresh flow (no automation of login/password)
- Required env var names only
- Railway CLI commands with placeholders
- Verification steps after token refresh
- Pipeline behavior documented: expired Upstox → partial status, other providers continue

## Pipeline Partial-Run Classification

Improved `src/backend/web/routes/ops.ts`:

**Error classification function** maps raw error messages to safe classes:
- `provider_auth_expired`: Upstox token expired, 401 errors
- `provider_plan_limited`: IndianAPI fundamentals unavailable, plan-limited
- `provider_isin_unavailable`: ISIN lookup failures
- `provider_network_error`: Network/timeout errors
- `code_error`: Unclassified code errors

**Health endpoint** now shows error class prefixes on partial runs:
```
api_pipeline_run:partial[provider_auth_expired,provider_plan_limited]
```

Previously only showed `api_pipeline_run:partial` with no indication of what caused it.

## IndianAPI Fundamentals Limitation

The IndianAPI ₹399 tier does not include fundamentals data. When the `IndianApiFinancialProvider` is called:
- Returns `"IndianApiFinancials: no financial fields returned for {symbol}"` 
- The pipeline catch block records per-symbol failure
- `ProviderCoordinator` falls through to other providers (UpstoxFundamentalsProvider, then Yahoo)
- Since Upstox also expired, all fundamentals providers fail → financials stage is "partial"

Error classification now maps this as `provider_plan_limited:financials`.

No fake financial data is generated. Company pages show field-level unavailable states automatically.

## Symbol Universe Verification

Verified 15 candidate symbols against production API:

| Symbol | Status | Reason |
|---|---|---|
| RELIANCE | ✓ Verified | In universe, scored |
| TCS | ✓ Verified | In universe, scored |
| INFY | ✓ Verified | In universe, scored |
| HDFCBANK | ✓ Verified | In universe, scored |
| ICICIBANK | ✓ Verified | In universe, scored |
| BHARTIARTL | ✓ Verified | In universe, now scored |
| SBIN | ✗ Not found | Not in stockstory universe |
| ITC | ✗ Not found | Not in stockstory universe |
| LT | ✗ Not found | Not in stockstory universe |
| AXISBANK | ✗ Not found | Not in stockstory universe |
| KOTAKBANK | ✗ Not found | Not in stockstory universe |
| HINDUNILVR | ✗ Not found | Not in stockstory universe |
| MARUTI | ✗ Not found | Not in stockstory universe |
| SUNPHARMA | ✗ Not found | Not in stockstory universe |
| BAJFINANCE | ✗ Not found | Not in stockstory universe |

**6 verified symbols** — existing 5 + BHARTIARTL.

## Controlled Ingestion Expansion

Pipeline triggered via Railway API with `symbols=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK,BHARTIARTL&apply=true`:

All stages: **success** ✅

| Stage | Status |
|---|---|
| Registry | success |
| Quotes | success |
| Financials | success |
| Features | success |
| Factors | success |
| Predictions | success |
| Signals | success |
| Health | recorded |

## Data Coverage Before/After

| Metric | Before | After | Change |
|---|---|---|---|
| dailyPrices | 2,987 rows, 6 symbols | **2,988 rows**, 6 symbols | +1 row |
| financialSnapshots | 5 rows, 5 symbols | **6 rows**, **6 symbols** | +1 row, +1 symbol |
| featureSnapshots | 2,837 rows, 6 symbols | **2,838 rows**, 6 symbols | +1 row |
| factorSnapshots | 2,365 rows, 5 symbols | **2,838 rows**, **6 symbols** | **+473 rows**, +1 symbol |
| predictionRegistry | 27 rows, 5 symbols | **30 rows**, **6 symbols** | +3 rows, +1 symbol |

## Frontend Reflection

All production endpoints verified:
- `GET /api/ops/data-coverage` — updated counts ✅
- `GET /api/intelligence/leaderboard?limit=5` — returns 5 entries ✅
- `GET /api/predictions/signals?limit=10` — returns signals ✅
- `GET /api/stockstory/RELIANCE` — valid response ✅
- `GET /api/stockstory/BHARTIARTL` — valid response ✅

Trust Centre shows provider status and data coverage correctly.

## Smoke/Data Verification

| Check | Result |
|---|---|
| `npm run smoke:production` | ✅ 7/7 PASS |
| `npm run verify:data:production` | ✅ 7/7 PASS |
| `npm run verify:symbols:production` | ✅ 6 verified |
| `npm run check:upstox` (Railway) | ⚠️ Expired (documented) |

## Tests

- **Unit tests**: 905/905 passed (86 files) — no regressions
- **E2E tests**: 36/36 passed (8.1s) — no regressions
- No existing tests broken by the changes

### New/Updated Files

| File | Change |
|---|---|
| `scripts/check-upstox-token.ts` | NEW — Upstox token diagnostic script |
| `docs/deployment/upstox-token-runbook.md` | NEW — Upstox token refresh runbook |
| `scripts/verify-symbol-universe.ts` | NEW — Symbol universe verification script |
| `src/backend/web/routes/ops.ts` | IMPROVED — Error classification + health endpoint enhancement |
| `package.json` | Added `check:upstox`, `verify:symbols:production` scripts |

## Full Verification Results

| Check | Result |
|---|---|
| `npm run typecheck:all` | ✅ |
| `npm run lint` | ✅ |
| `npm run test:unit` | ✅ 905/905 (86 files) |
| `npm run validate:hygiene` | ✅ PASS |
| `npm run build:frontend` | ✅ (1.19s) |
| `npm run build:backend` | ✅ |
| `npm run test:e2e` | ✅ 36/36 (8.1s) |
| `npm run smoke:production` | ✅ 7/7 |
| `npm run verify:data:production` | ✅ 7/7 PASS |
| `npm run verify:symbols:production` | ✅ 6 verified |
| `npm run check:upstox` (Railway) | ⚠️ Expired (documented, not a blocker) |

## Remaining Blockers

1. **Upstox token expired** — Fundamentals via Upstox are not available. Pipeline continues with other providers but financials coverage is limited. Manual OAuth refresh needed (runbook provided).

2. **IndianAPI ₹399 tier** — No fundamentals data. Financial snapshots are limited to what Upstox provides (currently unavailable due to expired token). An IndianAPI plan upgrade would provide more fields.

3. **Limited symbol universe** — Only 6 symbols available in production. The other 9 candidate symbols (SBIN, ITC, LT, etc.) are not in the stockstory universe. Expanding the universe requires adding symbols to the canonical registry and running ingestion cycles.

4. **No direct DB access for pipeline** — The `railway run` command cannot access the internal Railway Postgres. Pipelines must be triggered via the HTTP endpoint (`/api/ops/pipeline-run`) or left to the Railway scheduler.

## Provider-Specific Unavailable Reasons

| Provider | Reason |
|---|---|
| Upstox | Access token expired (HTTP 401) |
| IndianAPI (fundamentals) | ₹399 subscription tier — no fundamentals data |
| Finnhub | Deprecated and removed from active pipeline |
| Yahoo Finance | Active — no issues |

## Confirmations

- ✅ No fake data added
- ✅ No scoring/ranking/prediction formula changes
- ✅ No provider secrets printed or logged
- ✅ No secrets committed
- ✅ No OAuth automation bypass
- ✅ All limitations documented with safe messages only
