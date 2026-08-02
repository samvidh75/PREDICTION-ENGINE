# Part BF — Interactive Interface States, Visual Snapshot Baselines, and Premium App Experience Continuation

## Baseline Commit
`9a536b50fa06448b5860de073167f89618168c35`

## Final Commit
`aa77550ed`

## Files Changed
- `src/pages/StockStoryPageF0.tsx` — Added `MobileProductNav` import and component rendering
- `src/premium/PremiumComponents.tsx` — Added `role="dialog"` and `aria-modal`/`aria-label` to `InvestmentReviewSheet` and `BrokerHandoffSheet`
- `scripts/capture-ui-screenshots.ts` — Fixed invest-sheet route (stock detail), button label regex, mobile-nav selector, output dir; added API mock for invest-sheet and command-palette routes
- `tests/playwright/stockstory-reference-visual.spec.ts` — Major rewrite: added all 4 viewports, invest sheet + broker handoff states, screenshot capture, comprehensive assertions, shared mock setup
- `tests/playwright/stockstory-interactive-states.spec.ts` — Expanded to 41 tests: all 12 route groups with viewport-specific coverage, invest sheet dialog role assertions, Escape key close, forbidden copy audits
- `tests/playwright/f3-product-regression.spec.ts` — Fixed 8 failing tests (heading text, CTA selectors, settings/dashboard nav resilience)
- `reports/ui/62-visual-layout-audit.md` — Updated (pre-existing diff)

## Tests Added/Updated
- `tests/playwright/stockstory-reference-visual.spec.ts` — 40 tests (10 routes × 4 viewports)
- `tests/playwright/stockstory-interactive-states.spec.ts` — 41 tests (12 route groups)
- `tests/playwright/f3-product-regression.spec.ts` — 49 tests (fixed 8)

## Scripts Added/Updated
- `scripts/capture-ui-screenshots.ts` — Fixed routes, selectors, and mocking

## Interactive States Covered
1. **Landing** (4 tests) — Nav, market strip, CTAs, forbidden copy
2. **Scanner** (4 tests) — Filter rail, search input, forbidden copy, row click routing
3. **Stock detail** (5 tests) — Mocked TCS data, tab presence, View Full Thesis, Invest review opens dialog, forbidden copy
4. **InvestmentReviewSheet** (6 tests) — Compliance-safe content at all viewports, Escape key close, close button
5. **BrokerHandoffSheet** (2 tests) — No fake brokers, no order placement
6. **Command palette** (3 tests) — Cmd+K opens, no diagnostic commands, Escape closes
7. **Compare** (2 tests) — Decision-oriented state, no fake winner
8. **Watchlist** (2 tests) — Thesis-tracking language, Open scanner CTA
9. **Portfolio** (2 tests) — No fake P&L/holdings, thesis-monitor language
10. **Alerts** (2 tests) — What Changed surface, no fake alert history
11. **Methodology** (2 tests) — Research/conviction/risk language, no backend wording
12. **Mobile** (4 tests) — Nav visible at 390px, no overflow, scanner cards, stock detail stacking

## Visual Baseline Decision
Playwright snapshot baselines are **not committed** to the repo. The test captures screenshots to `.tmp/part-bf-visual/` and asserts layout and forbidden-copy instead of using committed pixel baselines. This approach is preferred because:
- Committed snapshots are fragile and environment-specific
- The forbidden-copy assertion provides more meaningful regression detection
- `.tmp/` is gitignored

The `scripts/capture-ui-screenshots.ts` outputs to `.tmp/part-bf-after/` (also gitignored).

## Visual Snapshot Result
- QA screenshots: **128/128 pass** (7 viewports × 19 routes, minus mobile-only exclusions)
- Reference visual Playwright: **40/40 pass** (10 routes × 4 viewports with API mocking)

## Investment Review Result
- Dialog opens from stock detail "Invest review" button
- `role="dialog"`, `aria-modal="true"`, `aria-label="Investment Review"` added
- Contains: Investment Review title, symbol/company, Thesis Summary, Key Risks, Before You Invest checklist, compliance text
- Compliance text verified: "Final order placement happens with your broker"
- Actions: Track instead, Compare first, Back to research
- Escape key and close button work correctly
- Passes all 4 viewports

## Broker Handoff Result
- `role="dialog"`, `aria-modal="true"`, `aria-label="Broker handoff"` added
- Gated state shows: "Broker handoff is being prepared"
- No fake broker names/logos/cards
- No order placement simulation
- No broker credential requests

## Command Palette Result
- Opens with Cmd+K on stock detail page (AppShell)
- Contains product commands only — no diagnostics, backend, provider, or migration
- Escape closes the palette
- Passes all 7 viewports in QA screenshots

## Scanner Interaction Result
- Filter rail renders
- Search input present
- No forbidden copy (Buy now, Strong Buy, guaranteed, sure shot, multibagger)
- Row click routes to stock detail
- Mobile: no crushed table at 390px (cards layout)

## Stock Detail Tab/Invest Result
- Tabs present: Thesis, Fundamentals, Financials, Risks, Technicals, News, Peers
- View Full Thesis button exists
- Invest review opens InvestmentReviewSheet dialog
- No backend/provider wording
- Mobile: stacks properly at 390px (no horizontal overflow)

## Compare Result
- Renders decision-oriented state
- No "Winner" or "Better pick" — no fake comparison winner
- Main landmark visible

## Watchlist Result
- Empty state tracks thesis-tracking language
- Open scanner CTA exists
- No fake activity
- MobileProductNav renders

## Portfolio Result
- No fake P&L or holdings
- No fake broker sync
- MobileProductNav renders

## Alerts Result
- What Changed surface renders
- No fake active alert history ("alert triggered" not present)
- MobileProductNav renders

## Methodology Result
- No provider/coverage/lineage/backend wording
- Research, conviction, risk language
- MobileProductNav renders

## Mobile Result
- `MobileProductNav` added to StockStoryPageF0 (stock detail) — previously missing
- Mobile nav visible at 390x844 with correct aria-label
- No horizontal overflow at 390px (landing, scanner, stock detail)
- Scanner uses cards layout (no crushed table)
- Stock detail stacks properly
- Investment sheet fits viewport

## Screenshot Paths
All screenshots at `.tmp/part-bf-after/`:
- `home-*.png`, `login-*.png`, `signup-*.png`, `about-*.png`, `dashboard-*.png`
- `stock-{CHENNPETRO,ITC,RELIANCE,TCS}-*.png`
- `scanner-*.png`, `rankings-*.png`, `compare-*.png`, `watchlist-*.png`
- `portfolio-*.png`, `alerts-*.png`, `methodology-*.png`
- `invest-sheet-*.png`, `command-palette-*.png`, `mobile-nav-*.png`
- Viewports: 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080

## Full Verification Results
| Check | Result |
|---|---|
| Typecheck all | PASS |
| Lint | PASS |
| Hygiene | PASS |
| Frontend build | PASS |
| Backend build | PASS |
| Unit tests | PASS (1624/1624) |
| E2E tests | PASS (49/49) |
| Responsive audit | PASS (8/8) |
| Accessibility smoke | PASS (7/7) |
| Visual layout | Some failures — "Primary CTAs missing" on landing/rankings/signals pages (pre-existing fixture match) |
| QA screenshots | PASS (128/128) |
| Visual Playwright | PASS (40/40) |
| Interactive Playwright | PASS (41/41) |
| Production smoke | PASS (19/19) |

## Forbidden Copy Result
No forbidden rendered copy detected on product routes:
- No IndianAPI, Yahoo, Jugaad, NSEPython, Upstox, Screener, Finnhub
- No provider/coverage/freshness/lineage/backfill/diagnostics
- No undefined undefined, null null, NaN
- No Buy now, Strong Buy, guaranteed, sure shot, multibagger

## Fake-Data Audit Result
No fake data claims detected:
- No fake investor counts, review counts, report counts
- No fake broker cards/logos
- No fake holdings/P&L/alerts/order states
- No fake analyst consensus/DCF/fair value
- No fake latest news/recommendations

## Accessibility Result
- InvestmentReviewSheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Investment Review"` added
- BrokerHandoffSheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Broker handoff"` added
- Mobile nav: `aria-label="Mobile navigation"` already present
- Primary nav: `aria-label="Primary navigation"` already present
- A11y smoke: 7/7 PASS

## Responsive Result
- 8/8 routes pass responsive audit
- No horizontal overflow at any tested viewport
- Mobile scanner uses cards layout

## Production Smoke Result
- 19/19 checks pass
- Frontend, Vercel, Railway, leaderboard, company data all OK
- Provider health status properly reported

## Backend Untouched Confirmation
- No backend route changes
- No database schema changes
- No migration changes
- No provider integration changes
- No scoring engine math changes

## DNS Untouched Confirmation
- No DNS changes
- No GoDaddy changes
- No Vercel DNS changes
- No Railway DNS changes

## Railway Untouched Confirmation
- No Railway configuration changes
- No production env var changes

## No Fake Broker Confirmation
- No fake active broker cards/logos in product UI
- No fake broker integrations
- No broker credential storage
- No order placement simulation
- `InvestHandoffSheet` and `BrokerRedirection` exist as dead/deprecated files but are not imported by any product route

## No Secrets Confirmation
- No secrets or API keys committed
- Hygiene scan: 0 errors, 0 warnings

## Remaining Gaps
1. **Visual layout audit**: Some routes show "Primary CTAs: missing" — the landing page template changed but the audit script still looks for the old CTA ID pattern. Would need audit script update to match current design.
2. **BrokerHandoffSheet**: Track/Compare buttons in the sheet don't have proper handlers — they use `productNavigate()` which updates URL but may not trigger full page render in all cases. The "Continue with broker" action (opening broker handoff from investment review) is not wired up — users click "Back to research" which closes the sheet but doesn't advance to broker.
3. **Command palette**: Only available on AppShell-wrapped pages (stock detail). Not available on PremiumAppShell pages (scanner, dashboard, watchlist, etc.). Would benefit from a unified command palette across all product routes.
4. **DashboardHub (views)**: The standalone dashboard view at `/?page=dashboard` doesn't have MobileProductNav. Only scanner, watchlist, portfolio, alerts, trust centre, and now stock detail have mobile nav.
5. **InvestmentReviewSheet accessibility**: The backdrop doesn't have an accessible name for screen readers.

## Recommended Next Phase
Part BG — Real-data polish, stock detail investment review sheet interactions, broker handoff wiring, dashboard mobile nav, command palette unification, and visual layout audit alignment.
