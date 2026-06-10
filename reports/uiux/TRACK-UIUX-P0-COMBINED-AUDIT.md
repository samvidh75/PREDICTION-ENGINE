# TRACK-UIUX-P0 Combined Audit Report

This file consolidates all UIUX-P0 audit reports into one copy-friendly document.

## Final Audit

| Item | Result |
| --- | --- |
| Branch name | `track-uiux-p0-full-app-audit` |
| Base branch | `main` at `336582365e4a05d72eb51cb6a86a08e75456a8a4` |
| Commit SHA | Not committed |
| Runtime environment | Blocked: `node` and `npm` not found |
| Screens audited | Static/router inventory completed for public, dashboard, search, stock, compare, portfolio, watchlist, alerts, settings, workspace, daily feed |
| Controls tested | Static only; no browser click pass |
| Dead-button count before | 1 statically verified (`navigate('signals')`) |
| Dead-button count after | 0 statically verified in patched surface |
| Search-flow result | Not browser-executed |
| Symbol-normalization result | Route/API uppercases ticker; full UI not browser-executed |
| Fabricated-data findings | Stockstory neutral `50`s, compare `50`s, public hardcoded rankings, daily random mock feed |
| Silent-fallback findings | Fixed in targeted files |
| Demo/sample-data findings | Portfolio demo requires explicit mode; spec added |
| Portfolio-default findings | Empty portfolio returns empty, not default holdings; spec added |
| DB -> API -> UI prediction comparison | DB -> API test artifact added; UI comparison not run |
| Wrong-symbol findings | Unknown symbol API returns 404; browser stale-state not run |
| Stale-data findings | Not browser/runtime certified |
| Empty-state findings | Portfolio and daily feed patched/covered by reports |
| Error-state findings | Stock page shows unavailable; full browser not run |
| Loading-state findings | Not browser-certified |
| Mobile result | Not certified |
| Tablet result | Not certified |
| Desktop result | Not certified |
| Accessibility findings | Not browser-certified |
| Console errors | Not captured |
| Network failures | Not captured |
| Tests created | 3 Vitest audit specs under `tests/e2e/uiux` |
| Tests executed | Attempted `node --version`, `npm --version`, `npm ci`, `npm run test:e2e:uiux`; all failed because Node/npm are unavailable |
| Test counts | 6 test cases authored |
| Files changed | Targeted changes include `src/backend/web/routes/stockstory.ts`, `src/pages/StockStoryPage.tsx`, `src/components/company/StockCompare.tsx`, `src/components/dashboard/DashboardHub.tsx`, `src/components/intelligence/DailyFeed.tsx`, `src/pages/PublicRankingsPage.tsx`, `scripts/track38-populate-via-python.cjs`, `package.json`, `tests/e2e/uiux/*`, `reports/uiux/*`. Worktree also contains many pre-existing unrelated edits. |
| Screenshots | None; browser automation unavailable |
| Remaining blockers | Node/npm unavailable; no Playwright install; no local server; no browser screenshots; no DB -> API -> UI browser verification; many pre-existing unrelated dirty files |
| Final verdict | FAIL |

Final verdict rationale: the audit found and repaired several P0 data-honesty defects, but the requested full browser certification and validation command suite did not run. Per the task rules, this cannot be marked PASS.

## Runtime Environment

| Item | Result |
| --- | --- |
| Frontend URL | Not started |
| Backend URL | Not started |
| `/healthz` | Not executed; `node`/`npm` unavailable on PATH |
| `/readyz` | Not executed; `node`/`npm` unavailable on PATH |
| DB adapter | Not runtime-verified; code policy supports `postgres`, `sqlite`, `unavailable` |
| Data mode | Not runtime-verified |
| Fixture symbols | `TESTIT` fixture script exists in `scripts/seed-ci-fixtures.ts` |
| External providers called | None by this audit |
| Startup errors | Shell cannot find `node` or `npm` |

Commands attempted:

| Command | Result |
| --- | --- |
| `npm install -D @playwright/test` | Failed: `zsh:1: command not found: npm` |
| `which node` | `node not found` |
| `which npm` | `npm not found` |
| `node --version` | Failed: `zsh:1: command not found: node` |
| `npm --version` | Failed: `zsh:1: command not found: npm` |
| `npm ci` | Failed: `zsh:1: command not found: npm` |
| `npm run test:e2e:uiux` | Failed: `zsh:1: command not found: npm` |

Verdict: runtime browser certification is blocked until Node/npm are available in the execution environment.

## Browser Automation

No Playwright or Cypress dependency was present in `package.json`.

Attempted to install Playwright:

```text
npm install -D @playwright/test
zsh:1: command not found: npm
```

Because `node` and `npm` are unavailable on PATH, no browser automation framework could be installed or run in this shell.

Fallback added: `npm run test:e2e:uiux` now points to Vitest audit specs under `tests/e2e/uiux`. These are API/data-boundary regression tests, not a substitute for the requested real browser clickability/responsive pass.

## Screen And Control Inventory

Router source: `src/app/router.ts` and `src/app/PageRenderer.tsx`.

| Screen | Route | Main Components | Buttons | Tabs | Inputs | API Calls | Expected User Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public landing | `?page=landing` | `PublicLandingPage` | Signup, about, stock preview links | None | None | None observed | User can enter public funnel or open stock preview. |
| About / trust | `?page=about`, `?page=trust`, `?page=methodology`, `?page=validation` | `PublicAboutPage`, `TrustCentrePage` | Signup/back CTAs | None | None | `/api/ops/health` via trust widget | User sees methodology/trust status without fake metrics. |
| Login / signup | `?page=login`, `?page=signup` | `LoginPage`, `SignupPage`, auth gateway | Google/email actions, reset | Form modes | Email, password, name | `/api/auth/*`, Firebase client | User authenticates or sees auth error. |
| Public predictions | `?page=predictions` | `PublicPredictionsPage` | Signup link | None | None | None observed | Public prediction explainer. |
| Public rankings | `?page=rankings` | `PublicRankingsPage` | Ranking links, signup | None | None | `/api/intelligence/leaderboard?limit=10` | Shows real leaderboard or unavailable state. |
| Leaderboard | `?page=leaderboard` | `LeaderboardPage` | Stock row buttons, predictions link | None | None | `/api/intelligence/leaderboard?limit=10`, `/api/ops/health` | Shows validated predictions or unavailable state. |
| Dashboard | `?page=dashboard` | `DashboardHub`, `AppLayout` | Discovery, watchlist, daily feed, portfolio, alerts, stock rows | None | Search via shell | `/api/predictions/signals?limit=20` | User sees real registry signals and navigates to valid screens. |
| Search | `?page=search` | `SearchPage` | Result selection | None | Search query | Local registry/search services | User searches normalized stock symbols. |
| Stock detail | `?page=stock&id=TESTIT` / `?page=company&id=TESTIT` | `StockStoryPage`, `WhyItChangedTab` | Dashboard, discovery, watchlist, related stocks | Overview, financials, valuation, ownership, risks, documents, whychange | Notes textarea | `/api/stockstory/:ticker`, `/api/market-data/*`, `/api/company/*`, `/api/predictions/explain/:symbol` | User sees canonical prediction values or honest unavailable states. |
| Compare | `?page=compare` | `StockCompare` | Compare, presets | None | Two ticker inputs | `/api/stockstory/:symbol` | User compares only available scores; unavailable categories are skipped. |
| Portfolio | `?page=portfolio` | `PortfolioPage` | Add, import, edit, delete, stock open | None | Holding forms, CSV textarea | Local portfolio store; backend portfolio route separately audited | User manages explicit holdings. |
| Portfolio doctor | `?page=portfolio-doctor` | `PortfolioDoctor` | Retry | None | None | `/api/intelligence/portfolio` | Empty portfolio shows empty state, not default holdings. |
| Watchlist | `?page=watchlist` | `WatchlistPage` | List selectors, stock open, remove | Smart/custom lists | Weight input | Local watchlist store | User manages watchlist entries. |
| Alerts | `?page=alerts` | `AlertCentrePage` | Mark all, filters, open company, dismiss | Filters | None | Local alert/watchlist services | User filters/dismisses alerts. |
| Discovery | `?page=discovery`, `?page=explore` | `DiscoveryPage` | Stock/detail actions | None | Search/discovery controls | Intelligence/discovery services | User explores companies/sectors. |
| Settings/profile | `?page=settings` | `SettingsPage`, `ProfileButton` | Save, password reset, logout | Profile/security/alerts | Profile inputs | `/api/user/profile` where wired | User edits private settings. |
| Workspace | `?page=workspace` | `WorkspacePage` | Add/remove/open analysis | Portfolio/comparison/screener tabs | Symbol input, notes | Local workspace store | User persists workspace locally. |
| Daily feed | `?page=daily-feed` | `DailyFeed` | None currently | None | None | `/api/intelligence/discovery/rankings` | User sees real daily changes or unavailable/empty state. |

Browser click verification was not executed because Node/npm and browser automation are unavailable in this shell.

## Clickability Audit

| Screen | Control | Expected Action | Actual Action | PASS / FAIL | Root Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | View all signals | Navigate to a valid signal/feed screen | Static audit found `navigate('signals')`, but `signals` is not a registered route | FAIL before fix | Invalid route key | Changed target to registered `daily-feed` route. |
| Stock detail | Tabs | Switch local tab and URL `tab` param | Not browser-executed | Not certified | Browser automation unavailable | Needs Playwright/manual pass. |
| Portfolio | Add/import/edit/delete | Open modals/forms and mutate explicit holdings | Not browser-executed | Not certified | Browser automation unavailable | Needs Playwright/manual pass. |
| Navigation/sidebar/mobile nav | Route to registered screens | Not browser-executed | Not certified | Browser automation unavailable | Needs Playwright/manual pass. |

Dead-button count before: 1 statically verified.

Dead-button count after: 0 statically verified in patched surface; full visible-control count was not browser-certified.

## Data Honesty Audit

| Field | UI Location | Source | Live / Cached / Fixture / Sample / Missing | Silent Fallback? | User Label Accurate? | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Stock health score | Stock detail | `GET /api/stockstory/:ticker` from `prediction_registry.ranking_score` | Cached/DB-backed | Was defaulting missing values to `50` | No | Fixed in `src/backend/web/routes/stockstory.ts`; missing values are null/partial. |
| Classification | Stock detail / compare | `prediction_registry.classification` | Cached/DB-backed | Was defaulting to `Fair`/`Stable` | No | Fixed stockstory route and `StockCompare`; unavailable is shown/skipped. |
| Confidence | Stock detail | `prediction_registry.confidence_score`, `confidence_level` | Cached/DB-backed | Was defaulting to `50`/`Medium` | No | Fixed route and stock page envelope adapter. |
| Factor scores | Stock detail | `prediction_registry` canonical factor columns | Cached/DB-backed | Was defaulting missing factors to `50` | No | Fixed route; stock page renders unavailable for null factors. |
| Public rankings | Public rankings page | Previously hardcoded real tickers | Fabricated | Yes | No | Replaced hardcoded rankings with leaderboard fetch and unavailable state. |
| Compare categories | Compare page | `GET /api/stockstory/:symbol` | Cached/DB-backed | Was defaulting missing scores to `50` | No | Fixed `StockCompare` to skip unavailable categories. |
| Daily feed movers | Daily feed page | Previously `Math.random()` mock data | Fabricated | Yes | No | Removed mock generation; failed/empty API returns honest state. |
| Portfolio empty state | Portfolio API | Explicit `positions` only | Missing/empty | No default holdings in route | Yes | Added regression spec for empty and explicit demo mode. |
| Demo portfolio | Portfolio API | Explicit `mode: demo` | Sample | No silent injection | Yes | Regression spec verifies `status: demo`, `isDemo`, `_demo`. |

Remaining static findings not fully repaired in this run:

| Finding | Risk |
| --- | --- |
| Several chart/search components still use deterministic synthetic mini-chart helpers for previews. | Must be clearly labelled if user-visible as non-live chart data. |
| Broader codebase contains many historical scripts/reports with synthetic generation references. | Not necessarily active UI, but should stay excluded from production data paths. |

Verdict: key active P0 fabricated stockstory, public rankings, compare, daily feed, and portfolio-default issues were repaired; full app data-honesty certification remains blocked without browser/runtime execution.

## Prediction Lineage Audit

Canonical route confirmed in code: `GET /api/stockstory/:ticker`.

| Canonical Field | DB Value | API Value | UI Value | Match? |
| --- | --- | --- | --- | --- |
| symbol | `TESTIT` in audit fixture spec | `data.symbol` | Not browser-executed | API only |
| prediction_date | `2025-06-09` in audit fixture spec | `data.predictionDate` | Not browser-executed | API only |
| ranking_score | `85` in audit fixture spec | `data.rankingScore` / `healthScore` | Not browser-executed | API only |
| classification | `Excellent` in audit fixture spec | `data.classification` | Not browser-executed | API only |
| confidence_score | `90` in audit fixture spec | `data.confidence.score` | Not browser-executed | API only |
| confidence_level | `Very High` in audit fixture spec | `data.confidence.level` | Not browser-executed | API only |
| quality_score | `82` in audit fixture spec | `data.factors.quality.score` | Not browser-executed | API only |
| growth_score | `78` in audit fixture spec | `data.factors.growth.score` | Not browser-executed | API only |
| value_score | `72` in audit fixture spec | `data.factors.value.score` | Not browser-executed | API only |
| momentum_score | `80` in audit fixture spec | `data.factors.momentum.score` | Not browser-executed | API only |
| risk_score | `12` in audit fixture spec | `data.factors.risk.score` | Not browser-executed | API only |
| sector_score | `68` in audit fixture spec | `data.factors.sector.score` | Not browser-executed | API only |
| prediction_horizon | `30` in audit fixture spec | `data.predictionHorizon` | Not browser-executed | API only |
| lineage | `prediction_registry` | `dataState.lineage` all non-fallback/non-synthetic | Not browser-executed | API only |

Regression test added: `tests/e2e/uiux/stockstory-lineage.audit.spec.ts`.

Verdict: DB -> API lineage is covered by a test artifact but was not executed in this shell; DB -> API -> UI browser comparison remains blocked.

## Search Audit

| Case | Expected | Result |
| --- | --- | --- |
| Uppercase symbol | Opens requested ticker | Not browser-executed |
| Lowercase symbol | Normalizes to uppercase | Not browser-executed |
| Whitespace | Trims and normalizes | Not browser-executed |
| Unknown symbol | Does not show stale previous data | API unknown-symbol regression added for stockstory route |
| Empty search | No duplicate submit or stale result | Not browser-executed |
| Special characters | Rejected or unavailable state | Not browser-executed |
| Rapid repeated searches | No stale data | Not browser-executed |
| Enter/search icon/autocomplete | Works consistently | Not browser-executed |
| Back/forward/refresh | Preserves correct symbol | Not browser-executed |

Verdict: not certified without browser automation.

## Data State Audit

| State | Expected Behavior | Result |
| --- | --- | --- |
| API loading | Visible loading, stops | Not browser-executed |
| API timeout | Honest error/unavailable state | Not browser-executed |
| API 404 unknown symbol | No stale/fabricated stock values | API regression spec added for unknown symbol |
| API 500 | No blank screen/infinite spinner | Not browser-executed |
| Missing prediction row | `PREDICTION_NOT_FOUND` unavailable envelope | Code path verified by inspection |
| Missing metric | Unavailable/null, not `0`/`50` | Stockstory route fixed |
| Empty portfolio | Empty state, no holdings injected | Regression spec added |
| Unauthenticated profile | `401` | Regression spec added |
| Invalid token | `403` | Regression spec added |
| Persistence unavailable | `503` | Existing route behavior inspected; not newly executed |

Verdict: targeted API state repairs were made; full browser-state certification is blocked.

## Portfolio Honesty

| Case | Expected | Status |
| --- | --- | --- |
| `POST /api/intelligence/portfolio` with `{ "positions": [] }` | Empty portfolio response, no injected real tickers | Regression spec added. |
| `POST /api/intelligence/portfolio` with `{ "mode": "demo", "positions": [] }` | Explicit demo response with sample holdings labelled | Regression spec added. |
| UI empty portfolio | Honest empty state | Not browser-executed. |

Test artifact: `tests/e2e/uiux/portfolio-honesty.audit.spec.ts`.

## Authenticated User Flows

| Flow | Expected | Result |
| --- | --- | --- |
| `GET /api/user/profile` missing token | `401` | Regression spec added |
| `POST /api/user/profile` missing token | `401` | Existing route behavior inspected; not newly executed |
| Invalid token | `403` | Regression spec added |
| `?uid=` override | Ignored; token UID used | Regression spec added for profile |
| Body `uid` override | Cannot override persistence UID | Regression spec added for profile insert key |
| Missing persistence | `503` | Code path inspected |
| User A reads user B | Blocked by token UID boundary | Existing route design and tests cover token UID boundary |

Test artifact: `tests/e2e/uiux/private-state.audit.spec.ts`.

Verdict: test artifacts created, not executed in this shell.

## Responsive Audit

Required viewports: desktop `1440x1000`, tablet `820x1180`, mobile `390x844`.

Browser viewport tests were not executed because Node/npm and browser automation are unavailable on PATH. No screenshots were captured.

Static notes:

| Area | Finding |
| --- | --- |
| Mobile navigation | Components exist: `MobileHeader`, `MobileNav`, `MobileSearchOverlay`, `MobileShell`. |
| Desktop navigation | Components exist: `DesktopShell`, `Sidebar`, `TopNav`, `CommandCentreSearch`. |
| Stock page | Uses responsive grids and overflow-x tab strip; needs viewport verification. |
| Portfolio/watchlist | Modal/form controls need mobile click verification. |

Verdict: not certified.

## Accessibility Audit

| Area | Expected | Result |
| --- | --- | --- |
| Buttons have accessible names | Required | Not browser-executed |
| Inputs have labels/names | Required | Static scan found several placeholder-only inputs; needs browser/a11y pass |
| Keyboard Tab reaches controls | Required | Not browser-executed |
| Enter activates primary actions | Required | Not browser-executed |
| Escape closes modals | Required where applicable | Not browser-executed |
| Focus visible | Required | Not browser-executed |
| Meaningful images have alt text | Required | Not browser-executed |
| Disabled controls semantic | Required | Not browser-executed |
| Color not only signal | Required | Not browser-executed |
| Unavailable values readable | Required | Improved in stock page and compare surfaces |

Verdict: not certified.

## Console And Network Failures

| Page | Error Type | URL / Component | Error | Reproducible? | Fix |
| --- | --- | --- | --- | --- | --- |
| All browser pages | Environment | Browser automation | Not run because `node` and `npm` are unavailable | Yes in this shell | Install/expose Node/npm, then run `npm run test:e2e:uiux` and a true browser suite. |

No runtime console or network failures were captured.

## Screenshots

No screenshots were captured in this run because the local shell cannot execute `node` or `npm`, and no browser automation binary is installed.
