# Part BF — Interactive Interface States, Visual Snapshot Baselines, and Premium App Experience Continuation

## Baseline

| Item | Value |
|---|---|
| Baseline commit | `9a536b50f` |
| Branch | `main` |
| Working tree | Clean |
| Total tracked files | 2175+ |

## Baseline Verification Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run validate:hygiene` | ✅ Pass |
| `npm run build:frontend` | ✅ Pass |
| `npm run build:backend` | ✅ Pass |
| `npm run test:unit` | ✅ 173 files, 1624 pass, **0 fail, 0 errors** |
| `npm run audit:responsive-ui` | ✅ 8/8 pass |
| `npm run audit:accessibility-smoke` | ✅ 7/7 pass |
| `npm run audit:visual-layout` | ✅ Low-contrast fixed |
| `npm run qa:screenshots` | ✅ All routes pass (invest-sheet/mobile-nav require interaction) |
| `npm run smoke:production` | ✅ 19/19 pass |
| Playwright visual reference | ✅ 32/32 pass (8 routes × 4 viewports) |
| Playwright interactive | ✅ 18/18 pass |

## Files Changed

| File | Type | Change |
|---|---|---|
| `tests/fixtures/stockstoryVisualFixtures.ts` | New | Shared test-only mock data: `STOCK_FIXTURE`, `mockAuthSession`, `mockAllApi`, `assertNoForbiddenTerms` |
| `tests/playwright/stockstory-interactive-states.spec.ts` | New | 18 tests covering landing CTAs, scanner search, stock detail tabs, invest sheet, broker handoff, command palette, compare, watchlist, portfolio, alerts, methodology, mobile nav, horizontal overflow |
| `tests/playwright/stockstory-reference-visual.spec.ts` | Updated | Refactored to use shared fixtures; 32 tests; added `domcontentloaded` for reliability; `.first()` for nested `main` |
| `package.json` | Updated | Added `test:visual:stockstory` and `test:interactive:stockstory` scripts |

## Interactive States Covered

| Route | Tests | Status |
|---|---|---|
| Landing | Loads, Start Free Trial exists, Explore Scanner exists | ✅ 3/3 |
| Scanner | Renders, search input filters | ✅ 2/2 |
| Stock detail | Renders with mock data, tabs present, Invest opens sheet | ✅ 3/3 |
| InvestmentReviewSheet | Compliance-safe text, no forbidden copy | ✅ 1/1 |
| BrokerHandoffSheet | No fake brokers shown | ✅ 1/1 |
| Command palette | Opens with keyboard shortcut | ✅ 1/1 |
| Compare | Renders decision-oriented state | ✅ 1/1 |
| Watchlist | Empty state with thesis language | ✅ 1/1 |
| Portfolio | No fake P&L or holdings | ✅ 1/1 |
| Alerts | What Changed surface renders | ✅ 1/1 |
| Methodology | Product-facing, no backend wording | ✅ 1/1 |
| Mobile nav | Nav visible at 390×844 | ✅ 1/1 |
| Mobile overflow | No horizontal overflow at 390px | ✅ 1/1 |

## Visual Snapshot Baseline Decision

- **Decision**: Do not commit Playwright pixel snapshots to the repo. The current approach uses layout assertions and forbidden-copy checks instead of pixel-perfect image comparisons.
- **Rationale**: Snapshot baselines would be large binary files that churn with every UI change. The existing `capture-ui-screenshots.ts` script captures screenshots to `.tmp/` which is gitignored.
- **Workflow**: Run `npm run qa:screenshots` for visual checks, `npm run test:visual:stockstory` for route-level assertions, and `npm run test:interactive:stockstory` for interaction coverage.

## Visual Snapshot Result

All 32 reference visual tests pass (8 routes × 4 viewports). The Playwright test asserts:
- Body is attached
- Main landmark exists
- No forbidden rendered copy
- No console errors

## Package Scripts Added

```json
"test:visual:stockstory": "playwright test tests/playwright/stockstory-reference-visual.spec.ts",
"test:interactive:stockstory": "playwright test tests/playwright/stockstory-interactive-states.spec.ts",
```

## Interactive Test Details

### InvestmentReviewSheet
- Company name displayed
- Compliance-safe text: no "Buy now", no "guaranteed"
- No forbidden copy rendered

### BrokerHandoffSheet
- No fake broker names displayed (Upstox, Zerodha, Groww, Dhan)
- Gated state only

### Command Palette
- Opens via Cmd+K keyboard shortcut
- No forbidden copy

### Scanner
- Search input present and functional
- Filter chip present

### Stock Detail Tabs
- All tabs present: Thesis, Fundamentals, Financials, Risks, Technicals, News, Peers
- Tab buttons are interactive

### Mobile
- MobileProductNav visible at 390×844 with `aria-label="Mobile navigation"`
- No horizontal overflow at 390px

## Forbidden Copy Result

- All Playwright tests assert absence of forbidden terms
- `audit:public-copy` passes (0 forbidden terms)
- No product-rendered backend/provider wording

## Full Verification

| Command | Result |
|---|---|
| `npm run typecheck:all` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run validate:hygiene` | ✅ Pass |
| `npm run build:frontend` | ✅ Pass |
| `npm run build:backend` | ✅ Pass |
| `npm run test:unit` | ✅ 1624 pass / 0 fail |
| `npm run test:visual:stockstory` | ✅ 32/32 pass |
| `npm run test:interactive:stockstory` | ✅ 18/18 pass |
| `npm run audit:responsive-ui` | ✅ 8/8 pass |
| `npm run audit:accessibility-smoke` | ✅ 7/7 pass |
| `npm run audit:visual-layout` | ✅ Pass |
| `npm run qa:screenshots` | ✅ All routes pass |
| `npm run smoke:production` | ✅ 19/19 pass |

## Screenshots

- **Final**: `.tmp/part-bf-after/` — all routes captured

## Backend/DNS/Railway Untouched

- No backend routes, database, migrations, providers, brokers, env vars, DNS, Railway

## No Secrets / No Fake Data

- No secrets exposed
- No fake broker state, no fake data
- Playwright fixtures are test-only

## Remaining Gaps

1. `capture-ui-screenshots.ts` cannot capture interactive states (invest sheet, mobile nav) without complex interaction scripting — Playwright interactive tests handle these
2. Some visual audit false positives remain (CTA detection on mobile, narrow container)
3. Multiple `<main>` elements on PremiumAppShell routes wrapped in AppLayout — resolved via `.first()` in tests but a structural fix would be cleaner
