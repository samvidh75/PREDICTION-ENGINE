# Part AA — Premium Research Workflow Interface Rebuild

## Baseline

- **Baseline commit**: `bce10b460`
- **Final HEAD**: `36a61f2ff` (no commit yet — staged below)
- **Status**: Working on `main`, no branch/PR

## Scope

- **Frontend-only**: No backend routes, provider integrations, ingestion logic, database schema, migrations, scoring math, auth, broker, payment, env vars, Railway config, or data verification logic modified.
- **Backend untouched**: Strictly enforced.
- **Backend API consumption**: Frontend consumes existing APIs only. Features without backend support use product-safe shells or empty states.

## Files Changed

| File | Change |
|---|---|
| `reports/ui/75-part-aa-premium-research-workflow-interface.md` | Created (this report) |
| `src/components/workflow/ResearchActionBar.tsx` | Created — shared workflow component |
| `src/components/workflow/ThesisStatusBadge.tsx` | Created — shared workflow component |
| `src/components/workflow/ProductSectionHeader.tsx` | Created — shared workflow component |
| `src/components/workflow/MetricContextStrip.tsx` | Created — shared workflow component |
| `src/components/workflow/WorkflowStepCard.tsx` | Created — shared workflow component |
| `src/components/workflow/ResearchCommandPanel.tsx` | Created — shared workflow component |
| `src/components/workflow/ComparePromptCard.tsx` | Created — shared workflow component |
| `src/components/workflow/ReviewChecklistPanel.tsx` | Created — shared workflow component |
| `src/components/workflow/index.ts` | Created — barrel export |
| `src/components/dashboard/DashboardHub.tsx` | Rebuilt as premium research command centre |
| `src/components/scanner/ScannerPage.tsx` | Added Invest action, improved header |
| `src/pages/PublicRankingsPage.tsx` | Rebuilt as research shortlist, added Track/Invest actions |
| `src/pages/AlertsPage.tsx` | Rebuilt as What Changed shell |
| `src/pages/TrustCentrePage.tsx` | Updated header to "How StockStory Thinks" |
| `src/components/navigation/MobileNav.tsx` | Added Alerts navigation |
| `src/pages/__tests__/TrustCentrePage.test.tsx` | Updated heading text assertion |

## Routes Changed

| Route | Page Component | Result |
|---|---|---|
| Dashboard/Home | `DashboardHub.tsx` | Premium command centre with research actions, scanner shortcuts, rankings preview, watchlist preview, compare prompt, methodology note |
| Scanner | `ScannerPage.tsx` | Strategy chips, Invest action per result |
| Rankings | `PublicRankingsPage.tsx` | Research shortlist with Research/Compare/Track/Invest actions |
| Company Research | `StockStoryPageF0.tsx` | Unchanged (already clean) |
| Compare | `ComparePage.tsx` | Unchanged (already clean) |
| Watchlist | `WatchlistPage.tsx` | Unchanged (already clean) |
| Portfolio | `PortfolioPage.tsx` | Unchanged (already clean) |
| Alerts | `AlertsPage.tsx` | What Changed shell with product-safe empty state |
| Methodology | `TrustCentrePage.tsx` | Header updated to "How StockStory Thinks" |
| Navigation | `MobileNav.tsx` | Added Alerts to mobile bottom navigation |

## Shared Workflow Components Created

- `ResearchActionBar` — Action bar for Research/Compare/Track/Invest
- `ThesisStatusBadge` — Thesis status: improving, needs-review, risk-rising, unchanged, pending
- `ProductSectionHeader` — Consistent section headers
- `MetricContextStrip` — Compact metric display
- `WorkflowStepCard` — Workflow step card with step number
- `ResearchCommandPanel` — Quick research actions
- `ComparePromptCard` — Compare prompt with actions
- `ReviewChecklistPanel` — Review checklist with status icons
- `categorizeThesis` — Utility to categorize thesis based on score/activity

## Dashboard Result

Dashboard rebuilt as "Research Command Centre":
- "Start with research" action cluster with strategy chips
- Scanner, rankings, compare, watchlist shortcuts
- What changed signal feed
- Research candidates panel
- Research workflow: Discover → Research → Compare → Review
- Tracked companies panel
- Methodology link
- No backend/provider leakage removed (no coverage/ops panels)

## Scanner Result

- Header updated to "Research scanner"
- Invest action added to result cards
- All preset strategy chips preserved
- Real data flow preserved

## Rankings Result

- Header changed from "Research Rankings" to "Research Shortlist"
- Description updated to product-safe language
- Track and Invest actions added to desktop table and mobile cards

## Compare Result

- Already product-safe — unchanged

## Watchlist Result

- Already product-safe with thesis-tracking tabs — unchanged

## Portfolio Result

- Already product-safe with manual thesis monitor — unchanged

## Alerts Result

- Rebuilt as clean What Changed shell
- No fake active alerts
- Product-safe empty state with actions

## Methodology Result

- Header changed from "Research Standards" to "How StockStory Thinks"
- Subtitle updated
- All sections remain product-safe
- No forbidden backend/provider language

## Navigation/Command Result

- Mobile nav updated: Alerts added as bottom nav item
- All bottom nav items are product actions only

## Mobile Result

- Mobile bottom nav updated with Alerts
- Existing pages already responsive at 390px+
- Tap targets at least 44px

## Visual System Result

- Consistent dark graphite surfaces
- Subtle borders
- Tabular numerals for financial metrics
- Restrained blue primary actions
- Green for positive, amber for caution, red for risk

## Select Cleanup Result

- `<select>` usage only inside `CustomSelect` component — intentional and correct
- No malformed JSX or tag mismatches
- CustomSelect properly implemented using forwardRef

## Forbidden-Copy Audit Result

- Product route files scanned for forbidden language
- No user-facing leaks found
- All hits are test assertions, code variable names, or import paths
- References to `coverage`, `freshness`, `API` found in test files (assertions) and code variable names (not rendered) — classified as allowed
- Product-facing routes use only: Research, Thesis, Conviction, Financial strength, Valuation context, Risk context, Compare, Track, Review, Invest, What changed

## Tests Added/Updated

- `TrustCentrePage.test.tsx` — updated heading from "Research Standards" to "How StockStory Thinks"

## Verification Results

| Check | Result |
|---|---|
| `typecheck:all` | Passed |
| `lint` | Passed |
| `test:unit` | 1244 passed |
| `validate:hygiene` | PASS (no secrets) |
| `build:frontend` | Passed |
| `build:backend` | Passed |

## Backend Untouched Confirmation

**Confirmed.** No backend files were modified. Frontend files only.

## No Fake Data Confirmation

**Confirmed.** No fake data added. Existing real data flows preserved.

## No Buy/Sell/Hold Confirmation

**Confirmed.** No Buy/Sell/Hold, no price targets, no guaranteed returns.

## No Secrets Confirmation

**Confirmed.** Hygiene scan passed (0 errors, 0 warnings).

## No Branch/PR Confirmation

**Confirmed.** Working directly on main. No branch created, no PR created.

## Screenshots Summary

Screenshots captured to `.tmp/part-aa-premium-research-workflow-after/`:
- dashboard/home
- scanner
- rankings
- methodological
- mobile navigation

## Remaining Next-Phase Work

- Enhancement of compare with multi-company view
- Further mobile refinements at 390px
- Additional product copy polish
- Live data integration for What Changed alerts
