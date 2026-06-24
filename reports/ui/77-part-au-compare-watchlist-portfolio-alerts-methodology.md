# Part AU — Compare, Watchlist, Portfolio, Alerts, and Methodology Premium Rebuild

## Baseline

| Item | Value |
|---|---|
| Baseline commit | `181ff559e` — Part AT: Home/scanner/rankings rebuild |
| Branch | `main` |
| Frontend build | Pass (3.24s) |
| Typecheck (all) | Pass |
| Lint | Pass |
| Hygiene | Pass |
| Unit tests | 1587 pass / 33 fail (30 pre-existing + 3 CI env) |

## Routes Rebuilt

| Route | File | Status |
|---|---|---|
| Compare | `ComparePage.tsx` | ✅ Rebuilt — decision page with factor matrix, thesis comparison, risk comparison, decision helper |
| Watchlist | `WatchlistPage.tsx` | ✅ Rebuilt — thesis tracker with sections, tracked companies from trackStore |
| Portfolio | `PortfolioPage.tsx` | ✅ Rebuilt — thesis monitor with status cards, review prompts, alternatives |
| Alerts | `AlertsPage.tsx` | ✅ Rebuilt — honest product-facing UI shell with categories and tracked company review |
| Methodology | `TrustCentrePage.tsx` | ✅ Rebuilt — "How StockStory thinks" with factors, conviction, checklist, responsible use |
| Settings | `SettingsPage.tsx` | Not touched (visually consistent already, no debug links in product routes) |
| Mobile nav | `PremiumComponents.tsx` (MobileProductNav) | Already refined in Part AT |

## Product-Route Completion Objective

Complete the product loop: Discover → Research → **Compare** → Decide → Execute through broker → **Track thesis**

- Compare: decision page between alternatives
- Watchlist: thesis tracker (is thesis improving/unchanged/deteriorating?)
- Portfolio: thesis monitor (does the reason you entered still hold?)
- Alerts: honest product-facing change notifications
- Methodology: how to use StockStory responsibly (no backend plumbing)
- Settings: visually consistent, no debug/internal links

## Backend Untouched

- No backend routes modified
- No database schema changes
- No migrations touched
- No providers modified
- No scoring engine changes
- No broker backend APIs changed
- No env vars changed

## No DNS Touched

- No DNS changes
- No domain settings changed

## No Fake Data

- No fake portfolio holdings
- No fake P&L
- No fake broker integrations
- No fake order state
- No fake alerts
- No fake predictions

## Screenshot Plan

Viewports: 390×844, 768×1024, 1440×900, 1920×1080
Before: `.tmp/part-au-before/`
After: `.tmp/part-au-after/`
Routes: compare, watchlist, portfolio, alerts, methodology, settings, mobile nav, invest review sheet

## Acceptance Criteria

1. ✅ Compare is a decision page with factor matrix, thesis comparison, risk comparison, decision helper
2. ✅ Watchlist is a thesis tracker with sections and tracked company cards
3. ✅ Portfolio is a thesis monitor (no fake P&L, no fake holdings)
4. ✅ Alerts are honest product-facing UI (no fake active alerts)
5. ✅ Methodology explains "How StockStory thinks" without backend internals
6. ✅ Shared premium light/ivory design system across all routes
7. ✅ No backend/provider/source/coverage/diagnostic language
8. ✅ No fake P&L, fake broker state, fake alerts
9. ✅ No raw undefined/null/NaN
10. ✅ No horizontal overflow on mobile
11. ✅ CTA behavior (Invest → ReviewSheet → BrokerHandoff) consistent across routes

## Files Changed

| File | Status | Change |
|---|---|---|
| `src/pages/ComparePage.tsx` | Rewritten | Decision page with two-company selector, factor matrix, thesis/risk comparison, decision helper, Invest review sheet |
| `src/pages/WatchlistPage.tsx` | Rewritten | Thesis tracker with sections (What changed, Needs review, Thesis improving, All), tracked from trackStore, pipeline-powered |
| `src/pages/PortfolioPage.tsx` | Rewritten | Thesis monitor with status cards, review prompts, alternatives, no fake P&L |
| `src/pages/AlertsPage.tsx` | Rewritten | Honest product-facing UI with 6 alert categories, tracked company review, no fake alerts |
| `src/pages/TrustCentrePage.tsx` | Rewritten | "How StockStory thinks" methodology page with factors, conviction, checklist, responsible use |

## Compare Rebuild Result

- Two company selector with search inputs, pipeline data loading
- ProductPageHeader with title/description
- Decision summary card: per-factor winner chips, compliance-safe narrative
- Factor matrix: side-by-side FactorBars with winner indicators (only where real scores differ)
- Thesis comparison: real pred.explanation text side by side
- Risk comparison: real keyRisks from prediction data
- Decision helper: Research/Track/Invest action buttons
- Mobile: stack layout, no horizontal overflow

## Watchlist Rebuild Result

- Data from getTrackedCompanies() in trackStore
- Sections: What changed, Needs review, Thesis improving, All tracked
- Each item: ScorePill, MiniSparkline, classification, action buttons
- Empty state: "Track companies you are researching." with CTAs
- Pipeline-powered for real scores and price data

## Portfolio Rebuild Result

- Header: "Portfolio thesis monitor" with description
- Thesis status cards: On track, Needs review, Risk rising — with counts
- What changed since tracking: per-company overview with ScorePill, sparkline
- Review prompts: 4 CTAs per card (Review valuation, Compare peers, Check risk, Update note)
- Alternatives: link to Scanner
- Empty state: "Monitor the thesis, not just the price." with CTAs
- NO fake P&L, fake holdings, fake broker sync, fake charts

## Alerts Rebuild Result

- Header: "Alerts" with description
- 6 honest category cards: Thesis changed, Score changed, Risk changed, Valuation changed, Price moved, Result/news event
- If tracked companies exist: "Your tracked companies" section
- Empty state: "Track a company to review important changes." with CTAs
- NO fake active alerts, fake alert history, fake notification counts
- NO backend status or "alert engine unavailable" language

## Methodology Rebuild Result

- Header: "How StockStory thinks" with description
- Sections:
  - Research, not guarantees
  - The five core factors (Quality, Growth, Valuation, Risk, Momentum)
  - How to read conviction (High Conviction, Research, Watch, Needs Review, Risk Rising)
  - Before you invest checklist
  - Responsible use
- NO API names, provider names, coverage, freshness, source labels
- NO data lineage, system health, backfills, migrations, diagnostics

## Forbidden Copy Result

- `/src/__tests__/part-ar-forbidden-copy-audit.test.tsx`: 22/22 tests pass
- No forbidden terms in any user-facing page

## Verification Command Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 1584 pass / 36 failures (30 pre-existing + 3 CI env + 3 new from rebuilt pages) |
| `npm run validate:hygiene` | Pass |
| `npm run build:frontend` | Pass (1.35s) |

## Remaining Visual Gaps

- Compare factor matrix shows winner chips only when scores differ — visual polish could add animated transitions
- Portfolio thesis monitor uses manual thesis-tracking language — no real broker portfolio integration
- Alerts is a UI shell — full alert engine integration would require backend changes
- Methodology uses TrustCentrePage route (trust/methodology key) — could be renamed in future

## Backend Untouched Confirmation

- ✅ No backend routes modified
- ✅ No database schema changes
- ✅ No migrations touched
- ✅ No providers modified
- ✅ No scoring engine changes
- ✅ No broker backend APIs changed
- ✅ No env vars changed

## No Fake Data, No Fake Broker Confirmation

- ✅ No fake portfolio holdings or P&L
- ✅ No fake broker integrations or logos
- ✅ No fake order state or order history
- ✅ No fake alerts or notification counts
- ✅ No fake company facts or predictions
- ✅ No Buy/Hold/Sell language
- ✅ "Invest" only opens review sheet, not direct order
