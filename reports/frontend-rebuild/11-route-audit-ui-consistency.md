# Route Audit & UI Consistency Pass — Report

**Date:** 2026-06-15  
**Branch:** main (commit 532a4b3+)  
**Scope:** Route audit, navigation cleanup, stale page removal — no backend/scoring/provider changes  

---

## All Reachable Frontend Routes

### Public routes (intentional)
| Route | Page | Status |
|-------|------|--------|
| ?page=landing | PublicLandingPage | ✅ Active, refined |
| ?page=login | LoginPage | ✅ Active, clean |
| ?page=signup | SignupPage | ✅ Active, clean |
| ?page=trust | TrustCentrePage | ✅ Maps to methodology |
| ?page=methodology | TrustCentrePage | ✅ Active |
| ?page=validation | TrustCentrePage | ✅ Active |
| ?page=predictions | PublicPredictionsPage | ✅ Active |
| ?page=rankings | PublicRankingsPage | ✅ Active |
| ?page=about | PublicAboutPage | ✅ Active |

### Authenticated routes (intentional)
| Route | Page | Status |
|-------|------|--------|
| ?page=dashboard | DashboardHub | ✅ Active, 3-column layout |
| ?page=search | SearchPage | ✅ Active |
| ?page=rankings | PublicRankingsPage | ✅ Active |
| ?page=portfolio | PortfolioPage | ✅ Active |
| ?page=watchlist | WatchlistPage | ✅ Active |
| ?page=trust | TrustCentrePage | ✅ Active |
| ?page=methodology | TrustCentrePage | ✅ Active |
| ?page=validation | TrustCentrePage | ✅ Active |
| ?page=predictions | PublicPredictionsPage | ✅ Active |
| ?page=stock | StockStoryPageF0 | ✅ Active |
| ?page=company | StockStoryPageF0 | ✅ Active (alias for stock) |
| ?page=settings | SettingsPage | ✅ Active |

### Routes REMOVED (stale/unreachable from any navigation)
| Route | Reason |
|-------|--------|
| ?page=explore | No longer in sidebar/nav |
| ?page=discovery | No longer in sidebar/nav |
| ?page=academy | No longer in sidebar/nav |
| ?page=analysis | No longer in sidebar/nav |
| ?page=compare | No longer in sidebar/nav |
| ?page=journal | No longer in sidebar/nav |
| ?page=alerts | No longer in sidebar/nav |
| ?page=portfolio-doctor | No longer in sidebar/nav |
| ?page=workspace | No longer in sidebar/nav |
| ?page=daily-feed | No longer in sidebar/nav |
| ?page=brief | No longer in sidebar/nav |
| ?page=leaderboard | No longer in sidebar/nav |
| ?page=validation-dashboard | No longer in sidebar/nav |
| ?page=onboarding | No longer in sidebar/nav |

These routes still exist as files but are disconnected from the router, PageRenderer, LayoutContext, Sidebar, MobileNav, and TopNav. They remain importable if re-added later. No files were deleted.

---

## Navigation Changes

### Sidebar (unchanged — already correctly limited)
Already exposes: Dashboard, Search, Rankings, Watchlist, Methodology, Settings + Sign Out

### MobileNav (unchanged — already correctly limited)
Authenticated: Dashboard, Search, Rankings, Watchlist, Methodology, Settings  
Public: Home, About, Sign in, Create

### TopNav (unchanged)
Desktop: brand + search (authed) or About/Home/Sign in/Get started (public)  
Mobile: brand + search/start button

---

## Files Changed

```
M  src/app/PageRenderer.tsx              # Removed 12 stale route imports and cases
M  src/app/router.ts                     # Trimmed PageKey from 31→16, PROTECTED_PAGES 17→7, PUBLIC_PAGES 10→9
M  src/App.tsx                           # Removed stale isPublicPage references
M  src/context/LayoutContext.tsx          # Trimmed ViewType from 17→7, removed stale PAGE_TO_VIEW entries
M  src/context/__tests__/LayoutContext.test.ts  # Updated test for new route mapping
A  reports/frontend-rebuild/11-route-audit-ui-consistency.md
```

## Principal Side Effects

### Bundle size improvement
Before: main chunk `403 KB` (gzip 94.6 KB)  
After: main chunk `276 KB` (gzip 64.4 KB)  
Savings: **127 KB parsed, ~30 KB gzipped** — from removing 12 unused route chunks

### Legacy URL backward compatibility
- Stale route params (`?page=explore`, `?page=discovery`, `?page=alerts`, etc.) fall through to `landing`/`dashboard` — no blank screens or broken redirects
- `stock` and `company` both map to StockStoryPage as before
- `trust`, `methodology`, `validation` all map to TrustCentrePage as before

---

## What Was Intentionally Not Changed

- **Backend/scoring/provider logic**: untouched — no backend files modified
- **File deletion**: no files were deleted — stale pages remain importable for future re-activation
- **css (index.css/vos.css)**: untouched — `ss-tv-panel`/`ss-tv-neon-edge` classes still exist but are no longer imported in active render path
- **Layout shell (AppLayout, Sidebar, MobileNav, TopNav)**: these were already correct — only cleaned their backing ViewType definitions
- **StockStoryPage (company research)**: not modified — already comprehensive
- **DashboardHub**: not modified — already uses real signals API
- **PublicAboutPage**: kept as-is (not stale, reachable from public TopNav)

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS (1.10s, **main chunk 276 KB** ↓127KB) |
| `npm run build:backend` | PASS |

---

## Final Git Operations

```bash
git add src/ reports/
git commit -m "Clean frontend routes and UI consistency"
git push origin main
