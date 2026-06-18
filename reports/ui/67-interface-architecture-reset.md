# Interface Architecture Reset

Baseline commit: `cf4bfd9077a9460ae5cafd3b9fd91f202398b8fb`

## Screenshot Issues Addressed

- Public landing, auth, about, and authenticated dashboard used different surface systems.
- Landing/auth/about mixed dark graphite with white cards and weak emerald/glass remnants.
- Signup used an oversized proof slab and the mobile bottom dock overlapped the form.
- About relied on large empty hero-like regions instead of useful product content.
- Dashboard read as a card wall instead of a compact research workspace.
- Navigation exposed inconsistent destinations across public and app contexts.

## Duplicate Route Systems Found

- `/?page=landing` renders `PublicLandingPage`.
- `/market` falls through to the same landing behavior because path routing is query-key based.
- `/?page=signup` renders `SignupPage`.
- `/?page=login` / signin renders `LoginPage`.
- `/?page=about` renders `PublicAboutPage`.
- Authenticated pages render through `AppLayout` and `IntelligenceOSShell`.
- Stale premium/light components remained active through `PremiumUI`, `Button`, `Input`, and page-specific surface classes.

## Colour System Reset

- Global CSS tokens now use graphite canvas `#070A0F`, surfaces `#0D1117` / `#111827`, high-contrast text, restrained blue action `#2962FF`, emerald only for verified/trust states, amber for missing data, and red for blocked/danger states.
- Shared `Button` and `Input` primitives were moved off white/slate styling to the same dark token set.
- Ordinary content no longer uses large white cards, beige surfaces, or emerald-glass framing.

## Shell Architecture Changes

- Added `src/components/product/ProductUI.tsx` with `ProductShell`, `ProductPage`, `ProductHero`, `ProductPanel`, `ProductSection`, `ProductAction`, `ProductEmptyState`, `ProductStatusPill`, `ProductFormPanel`, and proof/integrity helpers.
- Public pages and auth pages now share the same product primitives.
- Public top navigation and authenticated shell now share the same graphite/nav identity and brand treatment.

## Landing / Market

- Rebuilt landing around one readable hero and one compact research-state panel.
- `Start research`, `View rankings`, and `Check Trust Centre` CTAs are wired and covered by e2e tests.
- Missing coverage is labelled as unavailable rather than filled with fake numbers.
- Removed display-only provider badges that could imply unsupported source health.

## Signup / Signin

- Rebuilt auth routes with one compact form panel and one useful proof panel.
- Removed the empty/oversized decorative card pattern.
- Disabled form actions include reasons.
- Signin/signup cross-links still work inside the auth gateway.
- Mobile auth no longer shows the bottom dock over the form.

## About

- Rebuilt as a compact mission + principles + product-does layout.
- Removed empty white/hero block behavior.
- CTAs route to Rankings and Trust Centre.
- Research-only, source-trust, unavailable-labelled, and no-fake-data principles are explicit.

## Dashboard / Navigation

- Dashboard is now command-first: Search company, Compare, Rankings, and Source trust are visible immediately.
- Watchlist and portfolio empty states are honest and actionable.
- Signal feed unavailable state explicitly says no fallback cards were created.
- Public nav includes Rankings, Signals, About, Trust Centre, Sign in, and Get started.
- Mobile public nav includes useful destinations only.

## Buttons / Actions Fixed

- Landing CTA IDs preserved for regression tests.
- Start Research routes to signup for unauthenticated users.
- Trust Centre / methodology button contract restored.
- Settings and Trust tabs remain keyboard-operable buttons and are covered by e2e.

## Stale Systems Removed / Deactivated

- Active landing/about/auth/dashboard routes no longer depend on white `Surface` layouts.
- Global token defaults no longer point at beige/white surfaces.
- Auth mobile no longer displays the public bottom dock.
- No active buy/sell/pro/trading UI was added.

## Accessibility

- Icon-only nav actions have labels.
- Form fields have labels.
- Disabled auth actions explain why they are disabled.
- Focus outlines use the blue action token.
- Escape/command-palette behavior remains handled by the existing shell.

## Screenshot Proof

- After screenshots captured to `.tmp/interface-rebuild-after/` for 11 routes across 390x844, 768x1024, 1440x900, and 1920x1080.
- Representative manual inspection: landing desktop, signup mobile, about desktop, dashboard desktop, and Trust Centre mobile.
- Generated screenshots are not committed.

## Tests Added / Updated

- Updated audit scripts:
  - `audit:visual-layout` now checks real preview URLs, no giant blank public regions, low-contrast hero text, content width, overflow, desktop bottom dock, raw tokens, and primary CTAs.
  - `audit:responsive-ui` recognizes the new product shell primitives and primary CTAs.
- Added diagnostics:
  - `diagnose:fundamentals`
  - `diagnose:symbol-gaps`
- Existing e2e product regression suite covers landing CTAs, public routes, auth boundaries, dashboard, settings, search, company detail, rankings, Trust Centre navigation, and forbidden `href="#"`.

## Verification Results

- `npm run typecheck:frontend`: PASS
- `npm run typecheck:all`: PASS
- `npm run lint`: PASS
- `npm run test:unit`: PASS, 96 files / 995 tests
- `npm run validate:hygiene`: PASS, 0 secrets / 0 hazards
- `npm run build:frontend`: PASS
- `npm run build:backend`: PASS
- `npm run test:e2e`: PASS, 36/36
- `npm run audit:responsive-ui`: PASS
- `npm run audit:visual-layout`: PASS
- `npm run smoke:production`: PASS with non-critical provider warnings
- `npm run verify:data:production`: PASS with warnings
- `npm run check:market-providers`: Completed; reports provider gaps honestly
- `npm run diagnose:scored-symbols`: Completed
- `npm run diagnose:fundamentals`: PASS
- `npm run diagnose:symbol-gaps -- --symbols=VARUNBEVER,ZOMATO,YESBANK`: PASS

## Remaining True Blockers

- Production/provider checks still report non-critical provider degradation or optional providers unavailable depending on environment.
- Local diagnostics used SQLite fallback because PostgreSQL was unavailable locally.
- Fundamentals coverage is partial: local diagnostic reports 61 snapshot rows across 31 symbols, with missing fundamentals labelled unavailable.
- VARUNBEVER, ZOMATO, and YESBANK remain unscored in local diagnostics due to registry/history/feature/factor/prediction gaps.

## Data And Secret Confirmation

- No fake data, fake predictions, fake provider health, fake source labels, fake fundamentals, fake quotes/history, or fake rankings were added.
- No trading, buy/sell, pro/paywall, Dhan/Upstox/Finnhub-active, Yahoo/NSE-bypass UI was added.
- `validate:hygiene` passed with 0 secrets detected.
