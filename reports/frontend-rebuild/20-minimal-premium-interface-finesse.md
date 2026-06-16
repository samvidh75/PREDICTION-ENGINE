# Report 20 - Minimal Premium Interface Finesse

Date: 2026-06-16
Repo: PREDICTION-ENGINE
Scope: Frontend UI/UX visual refinement only
Base commit: 12c322239e70e7c3f18c768ee6d66b08415a74c0

## Visual Issues Found

- Shared primitives relied on visible borders, small shadows, and uppercase microcopy too often.
- Public landing had a clear flow but felt slightly busy: multiple card treatments, heavier badges, and a verbose hero.
- Auth pages used the older card surface and background contrast, making them feel separate from the rest of the app.
- Dashboard first-run guidance and data-readiness copy competed with the primary search action.
- Empty states were honest but wordy in search, rankings, predictions, watchlist, and portfolio.
- Company unavailable state was useful but explained the scoring gap in operational language.
- App shell surfaces used a heavier slate background, strong sidebar active borders, and taller visual contrast than needed.

## Design Principles Applied

- Calm white/off-white surfaces with subtle slate separation.
- Purposeful typography hierarchy: fewer uppercase labels, clearer headings, shorter supporting copy.
- Reduced shadows and softened borders across cards, tables, auth containers, and shell surfaces.
- Primary action clarity: search and signup are emphasized; secondary actions stay quiet.
- Mobile-first CTA rows: grid stacking on narrow screens, flex only where there is room.
- Honest empty-data handling remains visible without feeling like an error state.

## Primitives And Tokens Refined

- `tokens.ts`: tighter containers, softer spacing, smaller sidebar grid, calmer focus ring.
- `Button`: flatter, more precise variants; reduced radius; quieter secondary/outline treatments.
- `Card`: softened borders and replaced default shadow with a very light elevation.
- `Input`: calmer labels, smaller radius, consistent focus ring.
- `Badge`: less shouty uppercase styling and softer tone palette.
- `Table`: quieter header and border treatment.
- `PageHeader`: mobile action rows stack cleanly; subtitle width shortened.
- `ResearchDisclaimer`: shorter, calmer research-only copy.
- `EmptyState`, `LoadingState`, `ErrorState`: reduced padding, softer borders, better mobile action layout.
- `OnboardingComponents`: compact first-step checklist and quieter data-readiness notice.

## Pages Refined

- Landing: new calmer hero headline, shortened product purpose, quieter trust card, cleaner workflow cards, preserved `hero-cta-start` and `hero-cta-methodology`.
- About: reduced hero copy, lighter methodology cards, softer section separation.
- Trust Centre / Methodology: tighter metric rhythm and shorter scoring-engine explanations.
- Rankings / Predictions: premium empty states, clearer signup CTA path, softer filters/tables.
- Login / Signup: cleaner centered auth card, softer page surface, aligned with app shell.
- Dashboard: more compact onboarding, quieter readiness panel, simpler stat descriptions.
- Search: stronger primary workflow with shorter empty/search prompt copy.
- Company unavailable page: less operational explanation, clearer live quote vs analytical score distinction.
- Watchlist / Portfolio: saved-research empty states shortened; portfolio summary softened.
- Navigation / App shell: quieter top nav, sidebar active state, and overall background.

## Mobile Improvements

- Audited 375px, 430px, 768px, 1024px, and 1440px.
- CTA rows now stack as full-width controls on mobile where needed.
- Landing hero starts higher and avoids oversized mobile rhythm.
- Empty-state action areas use grid-first mobile layout.
- Dashboard action groups and search form avoid cramped wrapping.
- No horizontal overflow found in rendered route audit.

## Copy Reductions

- Removed or shortened operational phrasing around scoring availability.
- Replaced verbose empty-state copy with direct next-action language.
- Preserved research-only disclaimers while reducing length.
- Kept public copy calm and finance-grade; no hype, AI magic, guaranteed-return, or advisory claims were added.

## Empty-Data Handling Preserved

- No fake rows, fake scores, fake rankings, fake predictions, fake returns, or placeholder metrics were added.
- Missing values remain unavailable, omitted, or tied to real API/backend data.
- Rankings and prediction pages still show verified-empty states when APIs return no rows.
- Company unavailable state still distinguishes quote availability from analytical score availability.

## Tests Updated

- `tests/playwright/f3-product-regression.spec.ts`
  - Updated landing smoke and fallback selectors to assert the new visible landing headline.
  - Existing CTA, auth boundary, search, company unavailable, rankings, no-garbage, and no-`href="#"` coverage preserved.

## Files Changed

- `src/components/ui/tokens.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Table.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/DataState.tsx`
- `src/components/ui/OnboardingComponents.tsx`
- `src/components/navigation/TopNav.tsx`
- `src/components/navigation/AppLayout.tsx`
- `src/components/navigation/Sidebar.tsx`
- `src/pages/PublicLandingPage.tsx`
- `src/pages/PublicAboutPage.tsx`
- `src/pages/PublicRankingsPage.tsx`
- `src/pages/PublicPredictionsPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/StockStoryPage.tsx`
- `src/pages/WatchlistPage.tsx`
- `src/pages/PortfolioPage.tsx`
- `src/pages/TrustCentrePage.tsx`
- `src/views/DashboardHub.tsx`
- `tests/playwright/f3-product-regression.spec.ts`

## Intentionally Not Changed

- Scoring formulas
- Ranking formulas
- Provider ingestion algorithms
- Backend API contracts
- Database schema/models
- Firebase config
- Vercel settings
- Railway settings
- Secrets or environment values
- No new dependencies were added

## Regression Search

Rendered route audit checked public and authenticated routes at 375, 430, 768, 1024, and 1440px with empty API responses.

Result: no horizontal overflow, no visible `undefined`, `NaN`, `Infinity`, `[object Object]`, `ss:open-search`, `AI magic`, `guaranteed`, or `href="#"`.

Static search notes:
- `investment advice` remains only in required research-only disclaimer language.
- Legacy `ss-tv/neon` strings remain in inactive command search code, not active route rendering.
- `undefined`/`null` hits are TypeScript guards and tests, not visible UI copy.

## Verification Results

- `npm run typecheck:all` - PASS
- `npm run lint` - PASS
- `npm run test:unit` - PASS, 71 files / 781 tests
- `npm run validate:hygiene` - PASS, 0 secrets / 0 hazards
- `npm run build:frontend` - PASS
- `npm run build:backend` - PASS
- `npm run test:e2e` - PASS, 36/36

## Backend And Data Confirmation

No backend, scoring, ranking, provider ingestion, database, Firebase, Vercel, Railway, secret, or environment behavior was changed. This pass is limited to frontend visual system, copy, layout, shell, page UI, and selector updates required by legitimate UI copy changes.
