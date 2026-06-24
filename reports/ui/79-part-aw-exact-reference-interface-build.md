# Part AW — Exact Reference Interface Build

## Baseline

- Baseline commit: `d7ee62707`
- Branch: `main` (no branch or PR created)
- `git pull --ff-only origin main`: already up to date
- TypeScript, lint, repository hygiene, and frontend build: passed at baseline
- Unit runner baseline: test-harness failures where mocked API objects omit `getQuote`; no production browser failure observed

## Scope and references

Routes rebuilt and verified:

- Landing: `/?page=landing` and `/`
- Scanner: `/?page=scanner`
- Stock detail: `/?page=stock&id=TCS`
- Shared navigation, market strip, search, compare, watchlist, pricing, methodology, and authenticated shell

Approved reference images used from their uploaded local paths (not copied into production assets):

- `ChatGPT Image Jun 24, 2026, 07_42_12 PM (1).png`
- `ChatGPT Image Jun 24, 2026, 07_42_12 PM (2).png`
- `ChatGPT Image Jun 24, 2026, 07_42_13 PM (3).png`

## Current structure

- Route mapping: `src/app/PageRenderer.tsx`, `src/app/router.ts`
- Premium shell/navigation/market strip: `src/components/layout/AppShell.tsx`
- Landing: `src/pages/PublicLandingPage.tsx`
- Scanner: `src/pages/PublicRankingsPage.tsx`
- Stock detail: `src/pages/StockStoryPageF0.tsx`
- Shared research visuals: `src/components/ui/ResearchUI.tsx`
- Tokens: `src/styles/tokens.css`, `src/styles/design-tokens.css`
- Global responsive styling: `src/styles/index.css`
- Existing broader component library: `src/premium/PremiumComponents.tsx`

## Acceptance criteria

- Warm ivory background, white institutional cards, restrained emerald accents
- 72px navigation and inset 66px market strip
- 1360px desktop content system with dense scanner/detail spacing
- Reference-like landing composition, scanner three-column layout, and stock-detail research hierarchy
- Mobile card results instead of a horizontally overflowing scanner table
- Real pipeline values or product-safe empty states; no fake DCF, rankings, holdings, alerts, orders, or broker state
- No backend plumbing on normal routes

## QA and screenshots

Screenshots are generated but not committed:

- Before: `.tmp/part-aw-before/`
- After: `.tmp/part-aw-after/`
- Viewports: 390×844, 768×1024, 1440×900, 1920×1080
- States: landing, scanner, stock detail, thesis, mobile navigation; invest/broker states only when exposed by the real current UI

## Safety confirmations

- Backend routes untouched
- Database schema and migrations untouched
- Providers, ingestion, scoring math, and broker APIs untouched
- DNS, GoDaddy, Vercel DNS, Railway DNS, and Railway service untouched
- No production environment variables or secrets touched
- No fake broker integration, order placement, portfolio holdings, P&L, alerts, analyst consensus, or DCF values added

## Final results

### Files and components

- Refactored `AppShell`, top navigation, real-data market strip, shared score/signal visuals, and the existing premium shell.
- Refined landing, scanner, stock detail, compare, and methodology embedding.
- Updated premium light tokens and exact-reference responsive geometry.
- Added a product-copy guardrail test covering normal-route source surfaces.

### Reference match

- Landing: reference-like 40/60 hero composition, dashboard card cluster, research dimensions, product-proof strip, and infrastructure strip.
- Scanner: 292px filter rail, flexible results workspace, 240px insight rail, dense table, derived analytics, and mobile result cards.
- Stock detail: identity/price/score hero, emerald research tabs, thesis/fair-value/performance/fundamentals hierarchy, right rail, and a gated investment review.

### Functionality and safety

- Navigation, search, scanner query/sort/reset/save/export, row navigation, follow, compare, research tabs, methodology links, and investment review are wired.
- Market indices request the existing quote API and render `—` when no value is ready.
- Scanner counts, averages, breadth, sectors, scores, prices, and changes derive from loaded pipeline results.
- Landing factor scores and market history derive from the HDFCBANK pipeline; unverified scale claims and static market figures were removed.
- Recommendation wording was replaced with High Conviction / Research / Watch / Needs Review / Risk Rising.
- Investment review uses the real thesis and risk list or a clearly worded safe state.
- Rendered route audit across landing, scanner, stock, compare, watchlist, portfolio, alerts, and methodology found zero forbidden phrases.

### Accessibility and responsive results

- Named icon buttons, labelled sort control, keyboard-accessible scanner rows, visible focus treatment, skip link, Cmd/Ctrl+K command palette, and Escape-close investment review are present.
- Browser matrix at 390×844, 768×1024, 1440×900, and 1920×1080: zero horizontal overflow across landing, scanner, stock detail, compare, and methodology.
- Scanner switches from the dense table to result cards on narrow screens.

### Verification commands

- `npm run typecheck:all`: pass
- `npm run lint`: pass
- `npm run validate:hygiene`: pass, zero secret errors/warnings
- `npm run build:frontend`: pass
- Part AW copy tests: 9/9 pass
- `npm run audit:responsive-ui`: 8/8 pass
- `npm run build:backend`: pass (verification only; backend source untouched)
- `npm run test:unit`: legacy failures remain in copy/architecture assertions plus one unrelated backend research status expectation; the new `getQuote` mock omission is handled defensively
- `npm run audit:visual-layout`: structural checks pass for width/blank space/dock/overflow on the target routes; the audit's color heuristic reports false low-contrast failures despite black headings visible in screenshots
- `npm run test:e2e`: 34/50 pass; remaining assertions target the superseded landing copy, old ranking/auth shell, and former left-rail architecture

### Remaining visual differences

- When local APIs are not serving current values, the approved safe `—` and explanatory states replace the populated figures visible in the references.
- Company logos use existing initials/avatars rather than external brand assets.
- Full benchmark and breadth charts appear only when supported data is ready.

### Final confirmations

- No backend route, database, migration, provider, ingestion, scoring-engine, or broker API source changed.
- No DNS, GoDaddy, Vercel DNS, Railway DNS, Railway service, production environment variable, or secret changed.
- No fake rankings, broker integration, order state, holdings, P&L, alerts, analyst consensus, or DCF values were added.
