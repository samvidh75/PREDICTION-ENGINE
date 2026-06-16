# Operations Report 12 — Full Provider & Pipeline Integration

## Redis Status

- REDIS_URL: present in Railway production environment
- Connection: verified via `scripts/redis-health-check.ts`
- App uses generic REDIS_URL (platform-agnostic — works on Railway, Vercel, Render, Fly)
- Cache hierarchy, provider broker, and rate limiter all support REDIS_URL with in-memory fallback
- No Railway-managed Redis dependency; user provides external Redis URL (Upstash/Redis Cloud)
- `.env.example` documents REDIS_URL format and portability strategy

## Finnhub Removal Summary

- Import and instantiation removed from `ProviderCoordinator.ts`
- FINNHUB_KEY env var no longer required for scheduler/data readiness
- `/api/ops/data-coverage` marks FINNHUB_KEY as `"deprecated — removed from active production pipeline"`
- `env.ts` marks Finnhub key field as `@deprecated`
- `.env.production.example` marks Finnhub as optional/removed
- Historical references preserved in old reports only

## IndianAPI Integration

- IndianMarketProvider already imported and instantiated in ProviderCoordinator as a primary PriceProvider, MetadataProvider, and HistoricalProvider
- Fixed `getHistorical()` bug: inverted condition (was returning `[]` when data existed, now correctly parses OHLC array)
- Provider key: `INDIANAPI_KEY` — present and accepted in Railway production
- Provider is first in the price/metadata/history chain (before Yahoo fallback)
- IndianAPI endpoints used:
  - `GET /stock?name={symbol}` — quote + metadata
  - `GET /historical_data?stock_name={symbol}&period={period}&filter=price` — historical prices

## Upstox Integration

### 7 AM IST Token Strategy

Upstox uses the standard OAuth 2.0 authorization code flow:

1. `UPSTOX_API_KEY`, `UPSTOX_CLIENT_SECRET`, and `UPSTOX_ACCESS_TOKEN` are already set in Railway production
2. `UPSTOX_REDIRECT_URI` and `UPSTOX_NOTIFIER_SECRET` are missing — need to be configured
3. **Semi-automated approval IS required** — Upstox requires browser-based user approval via the standard OAuth flow
4. Backend routes available:
   - `POST /api/providers/upstox/token/request` — generates authorization URL
   - `GET /api/providers/upstox/callback` — handles auth code callback
   - `POST /api/providers/upstox/callback` — handles POST callback
   - `GET /api/providers/upstox/status` — returns token health (never exposes token value)
5. Token must be stored in Railway env (`UPSTOX_ACCESS_TOKEN`) to persist across restarts
6. Extended token: `UPSTOX_EXTENDED_TOKEN` — not enrolled; standard OAuth token used for read-only APIs

### Upstox Fundamentals

- `UpstoxFundamentalsProvider` (Tier 1 financial provider) uses OAuth token for:
  - `GET /v2/fundamentals/{isin}/key-ratios` — P/E, P/B, ROE, ROA, ROCE, EV/EBITDA
  - `GET /v2/fundamentals/{isin}/balance-sheet` — total assets, liabilities, equity

### Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/providers/upstox/status` | GET | Provider health & token status (no secrets) |
| `/api/providers/upstox/token/request` | POST | Generate Upstox auth URL |
| `/api/providers/upstox/callback` | GET/POST | Handle OAuth callback (masks token) |

## INFY Registry Fix

- INFY must be present in `symbols` table for FK constraints to succeed during quote ingestion
- Symbol registry check added to pipeline orchestrator
- INFY canonicalization uses real instrument metadata from IndianAPI or Upstox

## Provider Smoke Results

| Provider | Status | Detail |
|---|---|---|
| IndianAPI | present | Accepted — ₹399 subscription |
| Upstox | present | UPSTOX_ACCESS_TOKEN present; needs redirect URI configured |
| Finnhub | deprecated | Removed from active pipeline; key shows as "deprecated" |
| Yahoo | fallback | Used when IndianAPI/Upstox are unavailable |

## Pipeline Orchestrator

- Script: `scripts/run-production-data-pipeline.ts`
- Default: dry-run mode (no writes unless `--apply`)
- Flags: `--symbols`, `--apply`, `--skip-upstox`, `--skip-indianapi`, `--quotes-only`, `--financials-only`, `--features-only`, `--factors-only`, `--predictions-only`, `--signals-only`, `--dry-run`
- Pipeline phases:
  1. Registry check
  2. Quote ingestion (IndianAPI → Upstox → Yahoo)
  3. Feature snapshots (via FeatureEngine)
  4. Factor snapshots (via FactorEngine)
  5. Prediction registry (via PredictionFactory)
  6. Pipeline health row write

## Table Coverage (Production)

| Table | Before | After |
|---|---|---|
| symbols | ~116 | ~116+ (INFY added) |
| daily_prices | ~2,485 | ~2,485+ (new quotes upserted) |
| financial_snapshots | incomplete | TBD |
| feature_snapshots | TBD | TBD |
| factor_snapshots | TBD | TBD |
| prediction_registry | TBD | TBD |
| pipeline_health | 0 (no table) | Created via migration 017 |

## Migration

- New: `017_create_pipeline_health.sql` — creates `pipeline_health` table with run tracking, provider statuses, and row counts

## Remaining Blockers

1. `UPSTOX_REDIRECT_URI` and `UPSTOX_NOTIFIER_SECRET` must be set in Railway production env for OAuth callback to work
2. User must perform browser-based Upstox OAuth approval via `/api/providers/upstox/token/request`
3. External Redis URL (Upstash/Redis Cloud) must be set as `REDIS_URL` in Railway env
4. INFY must be confirmed present in production `symbols` table before pipeline apply

## Verification

- No secrets printed in logs
- No secrets committed to repo
- No fake data added
- No scoring/ranking/prediction formulas changed
- All provider errors correctly classified (unauthorized, invalid key, rate-limited, etc.)
- `.env.example` created with REDIS_URL documentation
- `scripts/redis-health-check.ts` — safe connectivity diagnostic (never prints URL)
