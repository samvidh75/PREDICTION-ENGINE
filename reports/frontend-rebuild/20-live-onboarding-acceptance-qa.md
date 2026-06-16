# Report 20 — Live Onboarding Acceptance QA & UX Hardening Pass

**Date:** 2026-06-16  
**Engineer:** Antigravity (UX QA Lead / Frontend Reliability)  
**Latest commit:** 12c32223 (on main)  
**Scope:** Frontend/UI/UX only — no backend, scoring, or provider changes

---

## 1. Deployment Status Checked

| Surface | Status |
|---|---|
| Repo | Clean — up to date with origin/main |
| Vercel | Deployed |
| Railway | Pending nightly renewal (not affected by this pass) |

---

## 2. Routes Audited

### Public routes
| Route | Status |
|---|---|
| `/?page=landing` | ✅ Clean |
| `/?page=about` | ✅ Clean |
| `/?page=methodology` | ✅ Clean |
| `/?page=trust` | ✅ Clean |
| `/?page=rankings` | ✅ CTA routing fixed |
| `/?page=predictions` | ✅ CTA routing fixed |
| `/?page=login` | ✅ Clean |
| `/?page=signup` | ✅ Clean |

### Authenticated (local test mode via Playwright mockAuthSession)
| Route | Status |
|---|---|
| `/?page=dashboard` | ✅ Checklist + DataPanel hardened |
| `/?page=search` | ✅ Clean |
| `/?page=stock&id=RELIANCE` | ✅ No render garbage |
| `/?page=stock&id=UNKNOWNTEST` | ✅ Shows unavailable state |
| `/?page=watchlist` | ✅ Clean empty state |
| `/?page=portfolio` | ✅ Clean empty state |
| `/?page=settings` | ✅ Color contrast fixed |

---

## 3. Issues Found & Fixed

### CTA / Routing Issues
| Issue | Fix |
|---|---|
| `PublicRankingsPage` empty state CTA "Search a stock" → protected `/search` (triggers redirect-to-login for unauthenticated users) | Changed to "Create free account" → `/signup` |
| `PublicPredictionsPage` empty state CTA "Search a stock" → protected `/search` | Changed to "Create free account" → `/signup` |
| Public mobile nav had only 4 tabs (Home, About, Sign in, Join) — Rankings/Predictions unreachable on mobile without an account | Added Rankings + Signals tabs; 6-tab bar; `isPublicMobile` check extended |

### Copy / Polish Issues
| Location | Before | After |
|---|---|---|
| `DashboardHub` subtitle | "…when the backend pipeline runs" | "…as data ingestion completes" |
| `DataReadinessPanel` title | "Data Status: Ingestion Sync Pending" | "Scoring data is still being indexed" |
| `DataReadinessPanel` body | "filler mock stock data" | "fabricated or sample data" |
| `DataReadinessPanel` | Permanent, not dismissible | Dismissible via X button, persisted to localStorage |
| Onboarding step 2 title | "Understand the score methodology" | "Review the scoring methodology" |
| Onboarding step 2 body | "our model calculates predictions and the rules that govern data trust" | "the scoring model is structured, what data sources it uses, and how data availability is disclosed" |
| `TrustCentrePage` status | Raw strings: "partial", "error", "unavailable" | Human-readable: "Partial — some evidence sources are not yet connected" etc. |
| `TrustCentrePage` missing inputs | "Missing inputs: audited_outcomes.alpha, …" | "Some performance fields require additional ingestion cycles before they are available." |
| `SettingsPage` save notice | `text-emerald-400` (fails WCAG AA on white) | `text-emerald-700` |
| `SettingsPage` reset confirmation | `text-emerald-400` | `text-emerald-700` |
| Rankings empty state title | "Scoring signals not populated yet" | "Verified rankings are being prepared" |
| Predictions empty state title | "Scoring signals not populated yet" | "Verified predictions are being prepared" |

### Regression Checks (No Issues Found)
| Pattern | Result |
|---|---|
| `href="#"` in active routes | ✅ None |
| `mock` in active UI copy | ✅ Fixed |
| `NaN` / `undefined` / `Infinity` / `[object Object]` in rendered text | ✅ None |
| `ss-tv` / `neon-edge` in active routes | ✅ Only in dead code (AppShell, Landing.tsx) |
| `ss:open-search` in rendered DOM | ✅ Not present |
| Fake/hardcoded values in active views | ✅ None |

---

## 4. Files Changed

| File | Change |
|---|---|
| `src/components/ui/OnboardingComponents.tsx` | DataReadinessPanel: dismissible, hardened copy, removed "mock" |
| `src/views/DashboardHub.tsx` | Subtitle + step 2 copy polished |
| `src/pages/TrustCentrePage.tsx` | Status raw strings → human-readable label map |
| `src/pages/__tests__/TrustCentrePage.test.tsx` | Updated assertions to match new labels |
| `src/pages/SettingsPage.tsx` | `text-emerald-400` → `text-emerald-700` (×2) |
| `src/pages/PublicRankingsPage.tsx` | Empty state CTA + title reworded |
| `src/pages/PublicPredictionsPage.tsx` | Empty state CTA + title reworded |
| `src/components/navigation/MobileNav.tsx` | +Rankings +Predictions public tabs; `isPublicMobile` extended |
| `tests/playwright/f3-product-regression.spec.ts` | 2 new CTA routing tests |

---

## 5. Verification Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | ✅ PASS |
| `npm run lint` | ✅ PASS |
| `npm run test:unit` | ✅ 781 passed (71 files) |
| `npm run validate:hygiene` | ✅ PASS — 0 secrets, 0 hazards |
| `npm run build:frontend` | ✅ PASS — 1875 modules |
| `npm run build:backend` | ✅ PASS |
| `npm run test:e2e` | ✅ **36/36 passed** (was 34/34; +2 CTA routing tests) |

---

## 6. What Was NOT Changed

- Scoring formulas, ranking formulas, provider ingestion algorithms
- Backend API contracts, database schema/models
- Firebase config, Vercel/Railway settings, secrets
- No fake data added
- `Landing.tsx` (dead code, unreachable in active routing)
- `CommandCentreSearch.tsx` (legacy, not in active routing via AppLayout)
- `AppShell.tsx`, `IntelligenceNavigationRail.tsx` (not in active routing)
