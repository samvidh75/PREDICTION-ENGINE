# Free Redis & Production Readiness

## Baseline commit
```
d5b716fc Add volume rounding tests, env example docs, and release readiness report
b2ec0d76 Fix AbortSignal.timeout compatibility in historical backfill
6fa85078 Use direct Yahoo chart fetch for historical backfill (bypass broker)
667f6dd9 Add historical price backfill support for INFY and other symbols
1a4eed77 Fix quote volume rounding: round to integer for bigint column compatibility
```

Latest deployed: `d5b716fc` (Railway deployment 0b10e23c)

## Upstash Free / External Redis strategy
- **Provider:** Upstash Redis Free (serverless, TLS-only)
- **Protocol:** Redis over TLS (`rediss://`)
- **Alternative REST API:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (also set)
- **URL format:** `rediss://default:<token>@<region>-<name>.upstash.io:6379`
- **Platform-agnostic:** Same `REDIS_URL` works on Railway, Vercel, Render, Fly.io, Docker

## REDIS_URL presence status
- **REDIS_URL=missing** (was auto-injected from internal Railway Redis which was deleted)
- Internal Railway "Redis" service removed from project
- User must set external `REDIS_URL` via Railway dashboard
- Service falls back to in-memory caches when Redis is absent (works correctly)

## Redis connectivity status
- **From `railway run`:** cannot test until external `REDIS_URL` is set
- **From deployed service:** falls back to in-memory (predictions_today=15, symbols_covered=5, db_health=connected)

## Railway env status
| Variable | Status |
|----------|--------|
| REDIS_URL | missing (needs manual dashboard add) |
| UPSTASH_REDIS_REST_URL | present |
| UPSTASH_REDIS_REST_TOKEN | present |
| INDIANAPI_KEY | present |
| UPSTOX_ACCESS_TOKEN | present |

## Vercel env instructions
- Vercel dashboard → prediction-engine → Settings → Environment Variables
- Add `REDIS_URL` with same Upstash connection string
- Apply to Production (and Preview if needed)
- Redeploy

## dotenv overwrite check
- `src/backend/config/env.ts` uses `dotenv.config()` **without** `override: true`
- Railway environment variables correctly take precedence over local `.env`
- No `VITE_REDIS_URL` found anywhere — Redis is backend-only
- No hardcoded Redis URLs in source

## Quote coverage
Before (previous session): 3/5  
After: 5/5 (volume rounding fix deployed)

## INFY historical/factor coverage
Before: 1 price row, 0 features, 0 factors, 0 predictions  
After: 499 price rows, ~473 features, ~473 factors, 3 predictions

## Five-symbol pipeline result
- Registry: 5/5
- Quotes: 5/5
- Financials: 5/5
- Features: 5 symbols covered
- Factors: 5 symbols covered
- Predictions: 5 symbols, 15 predictions (3 horizons each)
- Signals: 5
- Pipeline health: recorded (api_pipeline_run:success)

## Health/data-coverage before/after
| Metric | Before | After |
|--------|--------|-------|
| predictions_today | 12 | 15 |
| symbols_covered | 4 | 5 |
| pipeline_freshness | 0d ago | 0d ago |
| daily_prices rows | 2,488 | 2,987 |
| factor_snapshots symbols | 4 | 5 |
| prediction_registry symbols | 4 | 5 |
| prediction_registry rows | 24 | 27 |

## UI smoke result
- / : loads, 0 errors
- /rankings : loads, 0 errors
- /predictions : loads, 0 errors
- /trust : loads, 0 errors
- /company/INFY, /company/RELIANCE, /company/TCS, /company/HDFCBANK, /company/ICICIBANK : all load, 0 errors
- No NaN, undefined, null strings, or [object Object]

## Verification results
- TypeScript typecheck: all configs pass
- Lint: passes
- Unit tests: 6/6 pass
- Hygiene scan: 0 secrets detected
- No scoring/ranking/prediction formula changes

## Remaining blockers
1. **REDIS_URL not yet set** — must be added via Railway dashboard:
   - Open project → PREDICTION-ENGINE → Variables → New Variable
   - Name: `REDIS_URL`
   - Value: `rediss://default:<UPSTASH_REDIS_REST_TOKEN>@gentle-phoenix-101030.upstash.io:6379`
   - Redeploy
2. **Vercel REDIS_URL** — same value needed if backend replicas run on Vercel
3. The app works without Redis (in-memory fallback), but multi-replica deployments should set `REDIS_URL`

## Confirmation
- No secrets printed
- No secrets committed (`.env` not in git, `REDIS_URL` not in source)
- No fake data added
- No scoring/ranking/prediction formula changes
- Redis-only changes: docs, config helper, health check script, `.env.example` update
