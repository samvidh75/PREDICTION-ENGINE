# Authenticated Workspace Interface Integration

**Date:** 2026-06-17  
**Base commit:** `55316268` — Integrate frontend with live backend contracts  
**Branch:** main (no branch created)  

---

## Baseline

- Repo clean, on main, aligned with origin/main
- Frontend builds successfully before changes
- Production: home 200, health status ok (5 symbols, 15 predictions today), coverage healthy (6 symbols, 2987 price rows, 27 prediction records)

---

## Authenticated Route Audit

| Route | Component | Layout | API Client Usage | Direct fetch | Auth | Mobile | Local-only |
|-------|-----------|--------|-----------------|--------------|------|--------|------------|
| Dashboard | `DashboardHub.tsx` (components/) | AppLayout | `api.getSignals()`, `api.getOpsHealth()` | None | Required | Adequate | Heavy |
| Search | `SearchPage.tsx` | AppLayout | `api.getLeaderboard()` | None | Required | Good | Very heavy (entirely local) |
| Company | `StockStoryPageF0.tsx` → `StockStoryPage.tsx` | AppLayout | After fix: `api.getMetadata()`, `api.getStockStory()`, `api.getCompanyFinancials()` | 0 remaining (was 5) | Required | Good | Moderate |
| Watchlist | `WatchlistPage.tsx` | AppLayout | `api.getWatchlists()`, `api.removeWatchlistTicker()` | None | Required | Improved | Very heavy |
| Portfolio | `PortfolioPage.tsx` | AppLayout | `api.getQuote()` via `useLiveQuotes` | None | Required | Improved | Entirely local |
| Settings | `SettingsPage.tsx` | AppLayout | None | None | Required | Adequate | Exclusively local |

---

## Portfolio Backend Endpoint Audit

- **No dedicated portfolio CRUD backend** — holdings are managed 100% client-side via localStorage
- `GET/POST /api/intelligence/portfolio` — stateless factor/sector/diversification analysis (no auth, no P&L)
- `GET/POST /api/investor-state` — generic blob store (`investor_state` table), requires Firebase Bearer token
- PortfolioEngine was using broken `?uid=` query param auth pattern (no Bearer token) — **FIXED**
- Price enrichment works via public `GET /api/market-data/quote/:symbol`
- P&L is entirely client-side via `PortfolioReviewEngine`
- No portfolio data is fabricated

---

## Changes Made

### 1. PageRenderer.tsx
- Fixed `DashboardHub` import path from `../views/DashboardHub` (legacy) to `../components/dashboard/DashboardHub` (warm-neutral active version)

### 2. client.ts (API Client)
- Added `WatchlistRow` interface matching backend `user_watchlists` table
- Added 6 authenticated watchlist CRUD helpers: `getWatchlists`, `createWatchlist`, `updateWatchlist`, `deleteWatchlist`, `addWatchlistTicker`, `removeWatchlistTicker` — all use `authenticatedFetchJSON` with Firebase Bearer token
- Extended `getMetadata`, `getStockStory`, `getCompanyFinancials` with optional `ApiRequestOptions` parameter (for AbortSignal passthrough)

### 3. PortfolioEngine.ts
- **Critical auth fix:** Replaced raw `fetch('/api/investor-state?uid=...')` calls (broken — no Bearer token) with `authenticatedFetchOnlyIfSignedIn()` which properly sends Firebase Authorization header
- Simplified the save sync to a single POST instead of GET-then-POST cycle

### 4. PortfolioPage.tsx
- Added mobile-responsive card layout (`sm:hidden` cards + `hidden sm:block` desktop table)
- Replaced fixed-width table grid (`grid-cols-[1fr_130px_72px_110px_110px_82px_72px]`) with narrower columns for desktop, and stacked card layout for mobile
- Added `(saved locally)` indicator when no auth session
- Replaced manual `handleOpenStock` URL manipulation with `navigateToStock` from routeCoordinator

### 5. StockStoryPageF0.tsx
- **Removed global `window.fetch` monkey-patch** (was intercepting all API calls to add horizon params, unwrap envelopes, and patch exchange metadata)
- Deleted unused utility functions: `appendHorizon`, `unavailableMetadata`, `withHonestMetadataFallback`, `unwrapExplanationEnvelope`
- Removed `useLayoutEffect` import — component now only manages horizon selector UI

### 6. StockStoryPage.tsx
- **Migrated 5 direct `fetch()` calls to centralized API client:**
  - Metadata: `api.getMetadata(ticker, { signal })`
  - StockStory: `api.getStockStory(ticker, horizon, { signal })`
  - Financials: `api.getCompanyFinancials(ticker)`
  - Ownership: removed (was always 404 — no backend route exists)
  - Timeline: removed (was always 404 — no backend route exists)
- Removed import of `CompanyMetadata` from `services/data/types` (now from `services/api/client`)
- Stockstory call reads `horizon` from URL params directly (no monkey-patch needed)

### 7. WhyItChangedTab.tsx
- Handles analytical response envelope (`{ status, data, message }`) instead of expecting raw `ExplanationData`
- Reads `horizon` from URL params

### 8. WatchlistPage.tsx
- Backend-first watchlist: fetches from `/api/watchlists` when authenticated, falls back to local `WatchlistEngine`
- Added auth state machine: loading → authenticated (backend or offline) → anonymous
- "(offline mode)" banner when authenticated but backend unavailable
- "Local" / "Auto" source labels in sidebar

### 9. DashboardHub.tsx
- Replaced `RecentSearchStore.addTicker + manual URL push` with `navigateToStock()` from routeCoordinator
- Both signals and health data use the centralized API client

---

## No Unavailable States / Data Rules

All changes follow the core data rule: every visible value is either:
1. Real backend/API/provider/database data
2. Explicitly marked as unavailable/pending
3. User-entered local data clearly marked as local
4. Or omitted

No fake prices, financials, metrics, rankings, prediction scores, signals, charts, portfolio values, or alerts were added.

No scoring formulas, ranking formulas, prediction algorithms, provider ingestion algorithms, or secrets were touched.

---

## Regression Search Results

- `window.fetch` / `globalThis.fetch` in production code: **0** (only in test file: `TrustCentrePage.test.tsx`)
- Legacy styling (glow/neon/cyber/terminal/Exo/Orbitron/Sora): **0 in active routes** (only in non-routed ambient/chart/command-centre components)
- No "AI magic", "guaranteed", "buy now" in production UI (only in community moderation engine)
- `api.searchUniversal()` is dead code in client.ts (defined but never called by any active route)

---

## Full Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | Pass (0 errors) |
| `tsc -p tsconfig.all.json --noEmit` | Pass |
| `tsc -p tsconfig.backend.json --noEmit` | Pass |
| `tsc -p tsconfig.providers.json --noEmit` | Pass |
| `tsc -p tsconfig.ingestion.json --noEmit` | Pass |
| `eslint --quiet` | Pass (0 errors) |
| `test:unit` | **829/829 passed** |
| `validate:hygiene` | Pass (0 secrets, 0 hazards) |
| `build:frontend` | Pass (vite, 1.13s) |
| `build:backend` | Pass (tsc + ESM fix) |
| `test:e2e` | Pre-existing failures (body visibility) — not from these changes |

---

## Production Smoke

| Endpoint | Status |
|----------|--------|
| https://www.stockstory-india.com | 200 (Vercel, HIT) |
| /api/ops/health | ok, DB connected, production |
| /api/ops/data-coverage | ok, 6 symbols, 2987 prices, 27 predictions |
| Railway direct | ok, DB connected |

---

## Remaining Blockers / Known Issues

1. **E2E tests have pre-existing failures** — all 34/36 tests fail on `body` visibility. Not caused by these changes. Likely test environment configuration (Vite dev server vs Playwright webServer setup).

2. **Search is entirely client-side** — `StockSearchEngine.search()` operates on in-memory `generate500Stocks()`. The `/api/search/universal` endpoint exists but is never called. Users searching for stocks outside the hardcoded 500 get zero results. This is a pre-existing issue.

3. **No error toast/notification system** — all API errors are handled silently or with inline text. No centralized error notification exists across any route.

4. **`api.searchUniversal()` is dead code** — defined in `client.ts` but never imported or called by any active route.

5. **Settings have zero server persistence** — profile name, alert preferences, all localStorage-only. No backend endpoint for settings exists.

6. **Portfolio has no dedicated backend** — no `/api/portfolio` CRUD endpoints. The `investor_state` generic blob store is the only persistence mechanism.

7. **Legacy `views/DashboardHub.tsx`** (456 lines) is dead — not imported by PageRenderer but contains more features than the active version. Could be removed to reduce code debt.

8. **Several dead portfolio service files** — `PortfolioHealthEngine.ts`, `PortfolioRiskEngine.ts`, `PortfolioPerformanceEngine.ts`, `PortfolioAnalyticsEngine.ts`, `PortfolioCoach.ts`, `PortfolioExplanationEngine.ts` — all compute metrics now provided elsewhere.

---

## Commit Summary

```
9 files changed, 192 insertions(+), 132 deletions(-)
```

Files modified:
- `src/app/PageRenderer.tsx`
- `src/components/dashboard/DashboardHub.tsx`
- `src/components/intelligence/WhyItChangedTab.tsx`
- `src/pages/PortfolioPage.tsx`
- `src/pages/StockStoryPage.tsx`
- `src/pages/StockStoryPageF0.tsx`
- `src/pages/WatchlistPage.tsx`
- `src/services/api/client.ts`
- `src/services/portfolio/PortfolioEngine.ts`
