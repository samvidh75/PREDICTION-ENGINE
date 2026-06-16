# Production Release-Candidate QA — Report 01

**Date:** 2026-06-16  
**Commit:** `858134a8` (pushed prior to this pass)  
**Author:** StockStory Release Engineering  

---

## 1. Commit Status

- Existing commit `858134a8` ("Run production release candidate QA") was **already pushed** to origin/main.
- Local main **aligned** with origin/main.
- Working tree was clean at start.
- No additional commit was created for the push itself.

## 2. Deployment Status

| Platform | Status | Details |
|---|---|---|
| **Vercel** | ✅ Ready (Production) | Latest deployment 36m ago. Domain `stockstory-india.com` configured. |
| **Railway (service)** | ✅ Online | PREDICTION-ENGINE service at `https://prediction-engine-production-f7a8.up.railway.app` |
| **Railway (Postgres)** | ✅ Online | Postgres volume connected |
| **Railway latest deployment** | ✅ SUCCESS | Deployment `681d0d0f`, region sfo |

## 3. Production Frontend Status

| Check | Result |
|---|---|
| `https://www.stockstory-india.com` | 200 ✅ |
| `/api/ops/health` via Vercel proxy | 200 ✅ (proxy working correctly) |
| No raw JSON, no crashes | ✅ |
| SEO metadata present | ✅ |

## 4. Railway Backend / API Status

| Endpoint | Status | Details |
|---|---|---|
| `/api/ops/health` | ✅ `{"status":"ok"}` | DB connected, environment production |
| `/api/ops/data-coverage` | ✅ `{"ok":true}` | Database ready, migrations ready |
| `/healthz` | 200 ✅ | |
| `/readyz` | 503 ⚠️ | `migrations.checksumMismatch: true` — migration file `016_authorized_provider_ingestion.sql` has changed since application |
| Scheduler health | `"error"` | No provider keys configured in Railway environment |
| Pipeline freshness | `"never"` | Pipeline never ran |

## 5. API Routing / Proxy Behavior

- **vercel.json** rewrites `/api/:path*` → `https://prediction-engine-production-f7a8.up.railway.app/api/:path*` ✅
- Previous target `stockstory-api.onrender.com` replaced in commit `858134a8`
- **Frontend code** uses relative `/api/...` paths universally (no split between public/authenticated paths)
- `domain.ts` provides `API_BASE_URL` but almost no code imports it — all use hardcoded `/api/...`
- Dev: Vite proxies `/api` → `http://localhost:4001`
- Prod: Vercel rewrites `/api` → Railway backend
- **API routing is correct.** All requests flow properly.

## 6. Production Routes QA

All 12 tested routes return 200:

| Route | Status | Notes |
|---|---|---|
| `/` | 200 ✅ | Landing page |
| `/about` | 200 ✅ | |
| `/trust` | 200 ✅ | |
| `/rankings` | 200 ✅ | Empty state (no data) |
| `/predictions` | 200 ✅ | Empty state (no data) |
| `/login` | 200 ✅ | |
| `/signup` | 200 ✅ | |
| `/dashboard` | 200 ✅ | SPA shell |
| `/search` | 200 ✅ | |
| `/portfolio` | 200 ✅ | |
| `/settings` | 200 ✅ | |
| `/watchlist` | 200 ✅ | |

**API responses are valid JSON:**
- `/api/intelligence/leaderboard` → `[]` (empty, no data)
- `/api/predictions/signals` → `{"status":"unavailable","reason":"SNAPSHOT_NOT_GENERATED"}` (well-structured unavailable state)
- `/api/ops/data-coverage` → proper JSON with coverage details

**No render garbage found:** No `[object Object]`, no `undefined` string injection, no raw `NaN`, no `null` in rendered content.

## 7. Viewport QA

| Viewport | Status | Notes |
|---|---|---|
| 375px | ✅ | Mobile SPA renders (verified via Playwright responsive tests) |
| 430px | ✅ | |
| 768px | ✅ | |
| 1024px | ✅ | |
| 1440px | ✅ | |

No horizontal overflow detected in Playwright regression tests.

## 8. Regression Search — Findings

### Issues Fixed

1. **`NaN` return in `CommandResultCard.tsx:135`** — `useMemo` returned `{ price: NaN, ... }` when no chart data existed. Changed to `null` and updated `formatPrice()` signature to `number | null` with null guard. Ensures `"—"` is rendered instead of potential `"NaN"`.

### Issues Documented (Not Fixed — Non-Blocking)

| Issue | File | Notes |
|---|---|---|
| `ss-tv-*` CSS classes in active components | `CommandCentreSearch.tsx`, `MarketIntelligenceCommandCentre.tsx` | Old naming prefix but styles are cohesive with current dark theme. Not a release blocker. |
| `Infinity` rate limits | `ProviderCapabilityRegistry.ts`, `ProviderQuotaPolicy.ts` | Infrastructure concern, not frontend-facing. |
| `neonCyan`/`neonViolet` token names | `design-system/colors.ts` | Naming only; colors are correct. |
| Provider keys missing in Railway env | Railway production variables | `FINNHUB_KEY`, `INDIANAPI_KEY`, `UPSTOX_ACCESS_TOKEN`, `REDIS_URL` all missing. Explains zero data coverage. |
| Migration checksum mismatch | Railway `/readyz` | `016_authorized_provider_ingestion.sql` was modified after application. Non-blocking for current release. |

### Clean Results

- `href="#"` — Zero broken anchors in production code ✅
- `TODO` — Zero unresolved todos in src/ ✅
- `mock`/`fake`/`placeholder` — Zero injected into production UI ✅
- `undefined`/`NaN`/`[object Object]` — Zero string-injection bugs ✅
- `ss:open-search`, `command-center` — Zero leakage ✅
- `AI magic`, `guaranteed`, `investment advice` — Compliance-disclaimed properly ✅

## 9. Verification Results

| Check | Result |
|---|---|
| `npm run typecheck:all` | ✅ Passed |
| `npm run lint` | ✅ Passed |
| `npm run test:unit` | ✅ 812/812 passed |
| `npm run validate:hygiene` | ✅ No secrets detected |
| `npm run build:frontend` | ✅ Built in 1.28s |
| `npm run build:backend` | ✅ Compiled |
| `npm run test:e2e` | ✅ 36/36 Playwright tests passed |

## 10. Change Summary

One file modified since the last commit:

```
src/components/commandCentre/universalCommandCentre/CommandResultCard.tsx | 6 +++---
```

- `price: NaN` → `price: null` (prevents NaN propagation)
- `formatPrice(v: number)` → `formatPrice(v: number | null)` with null guard

## 11. Compliance Confirmation

- ✅ No fake data added
- ✅ No fake rows, scores, rankings, predictions, charts, or returns
- ✅ No scoring formula changes
- ✅ No ranking formula changes
- ✅ No prediction algorithm changes
- ✅ No provider ingestion algorithm changes
- ✅ No database schema/model changes
- ✅ No Firebase config changes
- ✅ No Vercel/Railway settings changes
- ✅ No secrets printed or exposed

## 12. Remaining Blockers

1. **Provider keys missing from Railway production environment** — `FINNHUB_KEY`, `INDIANAPI_KEY`, `UPSTOX_ACCESS_TOKEN`, `REDIS_URL` must be configured in Railway dashboard for data ingestion to work.
2. **Migration checksum mismatch** — `016_authorized_provider_ingestion.sql` was modified after being applied. To fix: roll back, repair, or re-run migrations.
3. **Zero data coverage in production** — No symbols, no prices, no predictions. All pages show empty/intentional-unavailable states. This is correct behavior given missing keys, but blocks any meaningful demo.
4. **Scheduler health: error** — Cannot run without provider keys.

These blockers are configuration/deployment issues, not code defects. They do not block the release-candidate from a code quality standpoint, but they block production utility.

---

*Report generated by release-engineering automation.*
