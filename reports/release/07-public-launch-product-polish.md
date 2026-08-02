# Phase 7: Public Launch Product Polish

**Baseline commit**: `e0752230` (HEAD on `origin/main`)
**Date**: 2026-06-17

---

## Baseline verification (Phase 1)

| Check | Result |
|---|---|
| `git pull --ff-only` | Already up to date |
| Working tree | Clean — only `.env.example` and `.env.production.example` modified (from prior Firebase Admin SDK work), plus untracked artifacts |
| Smoke:production | 5/5 PASS (FRONTEND, VERCEL_HEALTH, VERCEL_COVERAGE, RAILWAY_HEALTH, RAILWAY_COVERAGE) |
| E2E | 36/36 passed (10.9s) |
| Frontend build | OK (vite 1.24s) |

---

## Public conversion journey audit (Phase 2)

### Routes audited

| Route | Primary CTA | Secondary CTA | Trust/disclaimer | Issues found |
|---|---|---|---|---|
| `/` (landing) | "Start Research" | "View Methodology", "View Rankings" | ResearchDisclaimer at bottom ✅ | None — strong copy |
| `/about` | "Create free account" | "Back to home" | ResearchDisclaimer at bottom ✅ | None — clear methodology section |
| `/rankings` | "Create free account" (empty state) | "View scoring methodology" | ResearchDisclaimer at bottom ✅ | Good empty state with data coverage card |
| `/predictions` | "Create free account" (empty state) | "View scoring methodology" | ResearchDisclaimer at bottom ✅ | Same pattern as rankings — good |
| `/trust` (Trust Centre) | N/A (informational) | N/A | ResearchDisclaimer at bottom ✅ | Comprehensive — factors, coverage, provider status |
| `/methodology` | Same as Trust Centre (same component) | — | — | Mapped to TrustCentrePage — correct |
| `/login` | Sign in (Google/Email) | "Create account" | Footer: "Research signals only. Not investment advice." ✅ | Clean returnTo context |
| `/signup` | Create account (Google/Email) | "Sign in" | Footer: "Research signals only. Not investment advice." ✅ | Clean returnTo context |

### Key findings
- Landing page copy is strong: "Indian equity research, with evidence you can inspect." — correctly positioned as research, not advice.
- No hype language, no fake testimonials, no fake user counts.
- All data claims backed by live API data (rankings, signals, coverage metrics).
- Unavailable data clearly labelled with `MissingDataBadge` / `DataFreshnessBadge`.

---

## Landing page copy polish (Phase 3)

Landing copy was already launch-ready:
- **Headline**: "Indian equity research, with evidence you can inspect."
- **Sub-headline**: "Track signals, fundamentals, and ranking changes without noisy dashboards. Built for research workflows, not tips."
- **CTAs**: "Start Research", "View Methodology", "View Rankings", "Create free account"
- **Principles panel**: "No fabricated rankings or scores", "Unavailable data clearly labelled", "Source-backed signals only"

No changes needed.

---

## Trust Centre and disclaimer clarity (Phase 4)

Trust Centre already provides:
- Performance audit metrics (Alpha, Hit Rate, Sharpe, Calibration) when data is available
- Data coverage summary (companies, prices, financial records, scored records)
- Scoring factor explanations (Growth, Quality, Valuation, Stability & Risk, Momentum, Confidence)
- Data status (Scoring database connected/pending, As-of date, Evidence completeness)
- Provider status breakdown
- ResearchDisclaimer

Status: Comprehensive and clear. No changes needed.

---

## Methodology page (Phase 5)

The `/methodology` route maps to `TrustCentrePage.tsx` in `PageRenderer.tsx` (lines 55-57). This is intentional — the Trust Centre contains the methodology content. No separate MethodologyPage exists. Decision documented: no new page created.

Additionally, `CompanyMethodologyAndRegistry.tsx` (shown on company pages) was **rewritten** from a dark-theme legacy component (`bg-white/5 border-white/10`, `font-vos-display`, hardcoded data counts: "660,037 candles", "505 equities", "1,515 articles") to a clean light-theme component matching the current design system.

---

## Signup/login trust polish (Phase 6)

Both `/login` and `/signup` pages:
- Include a footer with "Research signals only. Not investment advice."
- Use `CinematicAuthGateway` with clear Google/Email options
- Support `returnTo` context messages (e.g., "Sign in to open research for RELIANCE.")
- Use `mapAuthError` (25 error codes) for user-safe error messages
- No env warnings, no raw Firebase errors in UI

No changes needed — already polished.

---

## Post-login onboarding polish (Phase 7)

Authenticated experience:
- **Dashboard** (`DashboardHub`): Search-first layout with watchlist, signals, saved research panels. Empty states guide to search or watchlist.
- **Watchlist**: Empty state with guidance to search companies.
- **Portfolio**: Empty state with Add/Import CSV actions. Local/cloud state explicit.
- **Settings**: Shows real account state (email, name, sign-out).
- **Mobile Nav**: "Method" label renamed to **"Research"** for clarity.

No fake onboarding progress, no fake personalization.

---

## Pricing/billing readiness audit (Phase 8)

### Search results

**Active/frontend (no fake pricing shown to users):**
- `"Create free account"` button labels — accurate, product is genuinely free
- `index.html` JSON-LD: `"price": "0"`, `"priceCurrency": "INR"` — correct SEO metadata

**Misleading premium infrastructure (removed):**
- `src/components/premium/PremiumFeatureGate.tsx` — **Simplified**: always renders children, no lock card with "Unlock for deeper lens" CTA
- `src/components/premium/PremiumWorkspaceLayer.tsx` — **Simplified**: always renders children
- `src/components/subscriptions/FeatureGate.tsx` — **Simplified**: always renders children, removed "Upgrade to Plus/Pro/Institutional" buttons
- `src/services/subscriptions/PlanCoordinator.ts` — **Cleaned**: removed fake pricing data (₹999/month Plus, ₹2,499/month Pro, "Custom Pricing" Institutional)
- `src/services/subscriptions/BillingCoordinator.ts` — No-op upgrade stub (no real payment flow)

**Dead code (no user impact, left untouched):**
- `PremiumLockCard.tsx`, `PremiumTierSwitch.tsx` — Only referenced by `AdaptiveDashboardShell.tsx` (never imported by any active component)
- `premiumFeatureGates.ts`, `premiumEntitlementStore.ts`, `usePremiumEntitlement.ts`, `usePremiumAccess.ts` — Underlying services now unused by active UI

**Backend routes (no frontend connection):**
- `GET /api/plans` — Exists in backend but no frontend UI connects to it
- `POST /api/subscription/subscribe` — Backend endpoint, no frontend code calls it
- `SubscriptionService` — Real service querying DB but no frontend integration

**Verdict**: All fake upgrade/pricing CTAs removed. No billing UI shown to users. The product is free with no paywalls.

---

## Footer/legal/nav polish (Phase 9)

| Component | Status |
|---|---|
| Public landing page | Has ResearchDisclaimer at bottom; no separate footer component (acceptable) |
| About page | Has ResearchDisclaimer at bottom |
| Rankings/Predictions | Has ResearchDisclaimer at bottom |
| Login/Signup | Has inline footer "Research signals only. Not investment advice." |
| Trust Centre | Has ResearchDisclaimer at bottom |
| TopNav | Clean: Rankings, Signals, About, Home, Sign in, Get started |
| MobileNav | Clean: Home, Rankings, Signals, About, Sign in, Join. "Method" renamed to "Research" |
| Privacy/terms pages | Do not exist — no links to them in UI. Per instructions: not fabricated. |

No dead/href="#" links, no broken anchors, no misleading legal links.

---

## Real-user action flow QA (Phase 10)

Covered by E2E test suite (36 tests):

| Flow | E2E coverage |
|---|---|
| Landing → Signup | ✅ (test #8) |
| Landing → Rankings | ✅ (test #9) |
| Rankings row → Login with context | ✅ (test #35, #36) |
| Predictions signal → Login | ✅ (test #36) |
| Login → Google auth | ✅ (test #13) |
| Dashboard → Search | ✅ (test #15, #26) |
| Search → Company | ✅ (test #20, #21) |
| Company → Tabs | ✅ (test #21-23) |
| Watchlist → Open company | ✅ (test #30) |
| Settings → Sign out | ✅ (test #29) |

No dead CTAs, no confusing redirects, no raw errors.

---

## Mobile launch QA (Phase 11)

- Public hero: Responsive grid layout with `md:grid-cols-[1.15fr_0.85fr]` — collapses to single column on mobile
- CTA buttons: `flex-wrap gap-3` — wraps gracefully
- MobileNav: Fixed bottom bar with Home, Rankings, Signals, About, Sign in, Join — clean 6-item layout
- Login/signup: Full-width form on mobile with `max-w-md` container
- Company tabs: Use `overflow-x-auto` for horizontal scroll on mobile
- Toast: Fixed position, safe above mobile nav
- Rankings table: `overflow-x-auto` with responsive column visibility (`hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`)

No horizontal overflow, no clipped text, no crowded buttons.

---

## Regression search (Phase 12)

Searched for patterns in `src/`, `tests/`, `public/`, `index.html`, `scripts/`, `docs/`:

| Pattern | Result |
|---|---|
| `href="#"` | **Not found** in active UI |
| `console.log` | 3 instances in onboarding debug helpers (non-critical, not user-visible) |
| `debugger` | **Not found** |
| `Missing required environment variables` | Found in `config/firebase.ts:69` (internal error log, not rendered) |
| `investment advice` | Found as disclaimer text **only** — all correctly placed in disclaimers |
| `buy now`/`sell now`/`best stock` | **Not found** in active UI |
| `fake`/`dummy`/`placeholder` | Not used in production rendering paths |
| `[object Object]` | **Not found** in render output |

---

## Tests (Phase 13)

- **Unit tests**: 905/905 passed (86 files) — no regressions
- **E2E tests**: 36/36 passed (16.3s) — no regressions
- No existing tests for modified premium/subscription components (no tests to break)
- All existing CTA destination tests pass (#8-11, #35-36)
- No render-garbage tests pass (#21-24, #33)

**Added/modified tests**: None needed — existing coverage validates all critical paths. The premium gate simplifications are trust/removal changes that don't expose new user-facing behavior needing tests.

---

## Full verification (Phase 14)

| Check | Result |
|---|---|
| `npm run typecheck:all` | ✅ (5 tsconfigs) |
| `npm run lint` | ✅ (quiet, no output) |
| `npm run test:unit` | ✅ 905/905 (86 files) |
| `npm run validate:hygiene` | ✅ PASS: No secrets detected |
| `npm run build:frontend` | ✅ (vite 1.18s) |
| `npm run build:backend` | ✅ (ESM imports fixed) |
| `npm run test:e2e` | ✅ 36/36 passed (16.3s) |
| `npm run smoke:production` | ✅ 5/5 PASS |

---

## Changes made

| File | Change |
|---|---|
| `src/components/premium/PremiumFeatureGate.tsx` | Simplified to always render children — removed fake "Unlock for deeper lens" / "Premium deepening" lock card |
| `src/components/premium/PremiumWorkspaceLayer.tsx` | Simplified to always render children — removed PremiumLockCard wrapper |
| `src/components/subscriptions/FeatureGate.tsx` | Simplified to always render children — removed "Upgrade to Plus/Pro/Institutional" buttons |
| `src/services/subscriptions/PlanCoordinator.ts` | Removed fake pricing data (₹999, ₹2,499, "Custom Pricing") |
| `src/components/company/CompanyMethodologyAndRegistry.tsx` | Rewritten — dark theme → light theme, removed stale hardcoded data counts, added methodology explanation |
| `src/components/navigation/MobileNav.tsx` | Renamed "Method" tab to "Research" for clarity |

---

## Remaining blockers

1. **Backend Firebase Admin credentials not configured on Railway** — Authenticated API calls (watchlist, portfolio, retention) return 403. Frontend correctly sends Bearer token; backend lacks `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
2. **Data coverage is limited** — Production smoke shows minimal coverage (few symbols, pending prediction registry). Full value requires provider ingestion pipeline completion.

---

## Confirmations

- ✅ No fake data added
- ✅ No fake business claims added
- ✅ No investment-advice wording added
- ✅ No scoring/ranking/prediction formula changes
- ✅ No provider ingestion algorithm changes
- ✅ No secrets touched (no commits of `.env`, service account JSON, API keys)
- ✅ No privacy/terms pages fabricated
- ✅ No fake pricing plans or paywalls created
- ✅ All product claims remain accurate and verifiable
