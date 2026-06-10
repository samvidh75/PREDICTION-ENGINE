# P0-MEGA DEFECT INVENTORY

| Defect ID | File | Line | Risk | In Scope? | Repair Plan |
|-----------|------|------|------|-----------|-------------|
| D01-DUP-EXEC | `src/db/DatabaseAdapter.ts` | ~145, ~195 | HIGH — duplicate method, second shadows first | YES | Remove duplicate `executeScript`, keep single implementation |
| D02-BETTER-SQLITE3 | `src/db/SQLiteAdapter.ts` | 12 | HIGH — active native binding import | YES | Retain (it IS the canonical SQLite adapter), but remove silent retry |
| D03-SILENT-RETRY | `src/db/SQLiteAdapter.ts` | ~120-131 | HIGH — masks query failures | YES | Remove try/catch retry block, throw on first error with safe diagnostic |
| D04-BETTER-SQLITE3-SRC | `src/services/retention/WatchlistService.ts` | 6 | CRITICAL — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D05-BETTER-SQLITE3-SRC | `src/services/retention/SharingService.ts` | 5 | CRITICAL — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D06-BETTER-SQLITE3-SRC | `src/services/retention/DailyDigestGenerator.ts` | 5 | CRITICAL — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D07-BETTER-SQLITE3-SRC | `src/services/retention/SubscriptionService.ts` | 5 | CRITICAL — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D08-BETTER-SQLITE3-SRC | `src/services/retention/UserAlertEngine.ts` | 7 | CRITICAL — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D09-BETTER-SQLITE3-SRC | `src/intelligence/AttentionEngine.ts` | 9 | HIGH — bypasses DatabaseAdapter | YES | Convert to async, use dbAdapter.query() |
| D10-AUTH-BYPASS | `src/backend/web/routes/retention.ts` | 19,24,29,34,39,45,50,55,60,65,70,78,83,88,93,98,103,108 | CRITICAL — all private routes use `req.query.uid \|\| 'anonymous'` | YES | Add `requireAuthenticatedUser` preHandler, use `request.authenticatedUser!.uid` |
| D11-QUERY-UID | `src/services/portfolio/watchlistStore.ts` | 46, 72, 80 | CRITICAL — sends `?uid=` in fetch | YES | Create authenticatedFetch, send Bearer token |
| D12-HORIZON-NONDET | `src/backend/web/routes/stockstory.ts` | 66-72 | HIGH — `ORDER BY prediction_date DESC LIMIT 1` picks arbitrary horizon | YES | Add `prediction_horizon` filter with default 30, accept query param |
| D13-STABILITY-ALIASED | `src/backend/web/routes/stockstory.ts` | 114, 118, 124, 130 | HIGH — `stability: valueScore` mapped from same field as valuation | YES | Return `stability: null` or real stability if available |
| D14-NEUTRAL-FALLBACKS | `src/predictions/PredictionFactory.ts` | ~95-106 | HIGH — `?? 50` fallbacks fabricate plausible data | YES | Skip creation when critical scores missing, return INSUFFICIENT_ANALYTICAL_DATA |
| D15-FAIR-FALLBACK | `src/predictions/PredictionRegistryContract.ts` | 169 | HIGH — `?? 'Fair'` fallback for unknown classification | YES | Throw error for unknown classification |
| D16-FAIR-FALLBACK-2 | `src/predictions/PredictionFactory.ts` | ~113 | HIGH — `safeClassification = 'Fair'` as fallback | YES | Remove, throw instead |
| D17-RISK-CONFIDENCE | `src/predictions/PredictionFactory.ts` | ~87-91 | HIGH — confidence formula rewards risk | YES | Fix: `riskStrength = 100 - riskScore` |
| D18-FAKE-ZEROS | `src/services/stocks/StockRegistry.ts` | 31-34 | HIGH — `peRatio: 0`, `numeric: 0`, `range {0,0,0}`, `lastUpdated: new Date()` | YES | Use null/undefined with availability flags |
| D19-RELIANCE-DEFAULT | `src/pages/StockStoryPage.tsx` | 68 | MEDIUM — `readTickerFromUrl()` returns `'RELIANCE'` | YES | Return empty string, show "Select a stock" state |
| D20-EXCHANGE-LABEL | `src/pages/StockStoryPage.tsx` | 201 | MEDIUM — `exchange` defaults to `'NSE'` | YES | Use registry exchange or null |
| D21-SCHEMA-VALIDATOR | `scripts/validate-schema-contract.ts` | 1 | HIGH — may use native better-sqlite3 | YES | Convert to use sql.js-based SQLiteAdapter |
| D22-BUILD-SCRIPTS | `package.json`, `Dockerfile`, `render.yaml`, `vercel.json` | — | MEDIUM — ambiguous build commands | YES | Add explicit typecheck/build scripts |
| D23-RELEASE-WORKFLOW | `.github/workflows/release-gate.yml` | — | HIGH — may be incomplete | YES | Add mandatory gate steps |
| D24-SCRIPTS-BETTER-SQLITE3 | `scripts/*` | many | MEDIUM — legacy scripts use better-sqlite3 | NO (legacy/historical) | Document as legacy-only, not runtime |
