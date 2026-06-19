# Part AA — Premium Research Workflow Interface Rebuild

## Baseline

- **Baseline commit**: `bce10b460`
- **Current HEAD**: `36a61f2ff`
- **Status**: Working on `main`, no branch/PR

## Scope

- **Frontend-only**: No backend routes, provider integrations, ingestion logic, database schema, migrations, scoring math, auth, broker, payment, env vars, Railway config, or data verification logic modified.
- **Backend untouched**: Strictly enforced.
- **Backend API consumption**: Frontend consumes existing APIs only. Features without backend support use product-safe shells or empty states.

## Product Workflow Goal

StockStory India is the AI research layer between Indian investors and brokers. The product must feel like:

> "AI research for Indian equities — understand the stock before you invest."

### Research Workflow

Discover → Research → Compare → Review → Track

## Routes/Components Planned

| Route | Page Component | Status |
|---|---|---|
| Dashboard/Home | `DashboardHub.tsx` | Premium command center |
| Scanner | `ScannerPage.tsx` | Advanced discovery workspace |
| Rankings | `PublicRankingsPage.tsx` | Research shortlist |
| Company Research | `StockStoryPageF0.tsx` | Flagship research workspace |
| Compare | `ComparePage.tsx` | Decision support workspace |
| Watchlist | `WatchlistPage.tsx` | Thesis tracker |
| Portfolio | `PortfolioPage.tsx` | Thesis monitor |
| Alerts | `AlertsPage.tsx` | What Changed monitor |
| Methodology | `TrustCentrePage.tsx` | Research standards |
| Settings | `SettingsPage.tsx` | Settings |
| Search | `SearchPage.tsx` | Universal search |

## Shared Workflow Components

- `ResearchActionBar` — Action bar for research workflows
- `ThesisStatusBadge` — Badge showing thesis status
- `ProductEmptyState` — Product-safe empty states
- `ProductSectionHeader` — Consistent section headers
- `MetricContextStrip` — Compact metric display strip
- `WorkflowStepCard` — Workflow step card
- `ResearchCommandPanel` — Command panel for research
- `ComparePromptCard` — Compare prompt card
- `ReviewChecklistPanel` — Review checklist panel

## Acceptance Criteria

1. All routes use real data or clean empty states
2. No user-facing backend/provider leakage
3. No Buy/Sell/Hold, no price targets, no guaranteed returns
4. No fake data, fake rankings, fake financials
5. Product-safe language only
6. Mobile responsive (390px minimum)
7. Premium graphite visual system
8. All tests pass
9. No secrets committed
10. Committed directly to main, no branch/PR

## Compliance Rules

- No user-facing forbidden language (provider, API, coverage, freshness, backend, database, etc.)
- Product-facing language only (Research, Thesis, Conviction, Financial strength, Valuation context, Risk context, Compare, Track, Review, Invest)
- No Buy/Sell/Hold, no price targets, no guaranteed returns
- "Invest" means review-first broker handoff shell only