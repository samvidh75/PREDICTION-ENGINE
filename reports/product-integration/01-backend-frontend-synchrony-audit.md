# Backend-Frontend Synchrony Audit — Report

**Date:** 2026-06-15
**Branch:** main (commit c3d1cf3+)
**Scope:** Frontend/backend integration audit and product synchrony fixes — no scoring/ranking/provider algorithm changes

---

## Route → API → Component Map

| Route | API Endpoint | Component(s) | Loading | Empty | Error |
|-------|-------------|-------------|---------|-------|-------|
| landing | — | PublicLandingPage | — | — | — |
| about | — | PublicAboutPage | — | — | — |
| login | — | LoginPage + CinematicAuthGateway | ✅ AuthUXLoader | — | ✅ mapped |
| signup | — | SignupPage + CinematicAuthGateway | ✅ AuthUXLoader | — | ✅ mapped |
| trust/methodology | `/api/intelligence/trust-metrics` | TrustCentrePage | ✅ spinner | ✅ status=unavailable | ✅ amber banner |
| predictions | `/api/intelligence/leaderboard` | PublicPredictionsPage | ✅ LoadingState | ✅ EmptyState | ✅ ErrorState |
| rankings | `/api/intelligence/leaderboard` | PublicRankingsPage | ✅ text | ✅ EmptyState | ✅ catch→empty |
| dashboard | `/api/predictions/signals` + SearchPage | DashboardHub | ✅ text | ✅ subtle text | ✅ AlertTriangle |
| search | StockSearchEngine (local) | SearchPage | — | ✅ EmptyState | — |
| portfolio | PortfolioEngine (local) + useLiveQuotes | PortfolioPage | ✅ status | ✅ dashed border | — |
| watchlist | WatchlistEngine + NoteEngine (local) | WatchlistPage | — | ✅ dashed border | — |
| settings | Auth only | SettingsPage | — | — | — |
| stock/company | `/api/stockstory/:ticker`, `/api/market-data/metadata/:symbol`, `/api/company/:symbol/ownership`, `/api/company/:symbol/timeline` | StockStoryPageF0 + StockStoryPage | ✅ spinner | ✅ prediction unavailable card | ✅ error + missing inputs |
| leaderboard *(disconnected)* | `/api/intelligence/leaderboard` | LeaderboardPage | ✅ Skeleton | ✅ unavailable | ✅ catch→empty |

---

## Backend/Frontend Integration Issues Found and Fixed

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| TopNav search button dispatches `ss:open-search` event with **zero event listeners** — clicking search in the header did nothing | `src/components/navigation/TopNav.tsx` | **HIGH** — broken primary product action | Changed to direct URL navigation: `setPage("search")` |
| MobileHeader search button dispatches `ss:open-search` event with **zero event listeners** — same dead control | `src/components/navigation/MobileHeader.tsx` | **MEDIUM** — file is not in active render path, but would be broken if reconnected | Changed to same URL navigation pattern |

### Summary
- **1 dead event was removed** (`ss:open-search`) — had dispatchers in 2 components, zero listeners
- **2 search buttons** now navigate directly to the search page via URL
- No other integration gaps found — all other API consumers use direct `fetch()` calls with proper error/catch/state handling

---

## UI/UX Improvements Made

| Improvement | File |
|-------------|------|
| Search navigation fixed — clicking search bar or search icon now reliably opens the search page | `src/components/navigation/TopNav.tsx` |
| Mobile search action wired correctly for future reconnection | `src/components/navigation/MobileHeader.tsx` |

---

## Quality Gate Results

Scanned all active route components for remaining issues:

- `undefined` — 0 found in active render path
- `null` — properly guarded via `formatNumber`, `formatMetric`, `asFiniteNumber`
- `NaN` — 0 found (guarded by `Number.isFinite`)
- `Infinity` — 0 found
- `[object Object]` — 0 found
- `href="#"` — 0 found
- `TODO` in visible copy — 0 found
- `coming soon` in active UI — 0 found
- `console.log` in production path — previously fixed in passes 1-5 (remaining are in CLI tools/schedulers, not API server)
- Old `ss-tv-app`/neon/terminal/glow classes in active routes — 0 found (previously fixed in About page pass)
- Dead buttons/controls — **1 found and fixed**: `ss:open-search` event

---

## Files Changed

```
M  src/components/navigation/TopNav.tsx        # Fixed: dead ss:open-search event → direct URL navigation
M  src/components/navigation/MobileHeader.tsx  # Fixed: same dead event → direct URL navigation
A  reports/product-integration/01-backend-frontend-synchrony-audit.md
```

---

## What Was Intentionally Not Changed

- **Scoring/ranking/provider algorithms**: untouched
- **Database schema/models**: untouched
- **Firebase project config / Vercel settings / domain settings**: untouched
- **MobileHeader file**: kept (not imported in active render path, but fixing its dead control prevents regression if reconnected)
- **LeaderboardPage**: kept as file — already disconnected from PageRenderer/router in pass 3
- **StockStoryPage adaptStockStory function**: complex but correct — maps canonical `prediction_registry` columns to frontend DTOs with proper null guards

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS (1.11s) |
| `npm run build:backend` | PASS |

## Live URL Verification

| URL | Status |
|-----|--------|
| https://www.stockstory-india.com | **200 OK** |
| https://stockstory-india.com | **308 → www** |

---

## Cumulative Summary (All 6 Passes)

| Pass | Commit | Description |
|------|--------|-------------|
| Performance/SEO/Accessibility | `3504031` | Console hygiene, OG image, a11y fixes |
| Design System Rebuild | `532a4b3` | Shared UI primitives, PublicPredictions rewrite, Landing/Portfolio refinement |
| Route Audit | `0e2236c` | 12 stale routes disconnected, main chunk ↓127KB |
| Product Readiness QA | `75f6560` | PublicAboutPage redesign, copy/trust/mobile audit |
| Backend API Hardening | `c3d1cf3` | Error handling, logging hygiene, security audit |
| Product Synchrony | *(current)* | Fixed dead search controls, verified all API→component contracts |

---

## Final Git Operations

```bash
git add src/ reports/
git commit -m "Synchronize frontend experience with backend data"
git push origin main
