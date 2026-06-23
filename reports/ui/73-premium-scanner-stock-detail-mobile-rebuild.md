# Part CR: Premium Scanner & Mobile-First Stock Detail Rebuild

## Baseline Commit
`a4a4129d2` — Add StockEdge session wrapper and discovery pipeline

## Current Stock Detail Problems
1. **Section order**: Chart is at bottom (after thesis, risk, fundamentals); should be near top
2. **No financial histogram**: Revenue/PAT/EBITDA bar chart missing entirely
3. **No stock-specific news**: News intelligence not connected to stock detail
4. **No brokerage/research commentary**: Missing "Street view" section
5. **Healthometer is inline**: Not extracted as reusable component; used directly in StockStoryPageF0.tsx
6. **Legacy pages exist**: StockStoryPage.tsx (858 lines) and SuperpageV8.tsx are dead code

## Current Scanner Gaps
1. **No free vs premium model**: All scans are implicitly "free"
2. **No premium scan catalogue**: 10+ premium scan concepts not implemented
3. **No pricing/payment UI**: No route or component for premium subscription
4. **Scans are presets not catalogued**: Results-driven but no catalogue browse

## Current Healthometer Issue
- Inline in StockStoryPageF0 — not extractable/reusable
- Uses `research.healthometer.dimensions[]` which may be missing for some symbols
- Should show partial state gracefully

## Current Chart/Graph Issues
- HistoricalPriceChart works (SVG line chart)
- No financial histogram (revenue, PAT, EBITDA bars)
- No interactive metric tabs for financial data

## Current Mobile Layout Issues
- Responsive shells exist but stock detail is not explicitly mobile-optimized
- Some sections may overflow or not stack cleanly at 390px

## Current Payment/Pricing Status
- No pricing page or route
- localStorage-only tier store (debug/demo only)
- PremiumFeatureGate and PremiumWorkspaceLayer are pass-through stubs
- No payment gateway

## Routes/Components to Change

### New Components Needed
1. `ScanCatalogue.tsx` — Scan catalogue with free/premium registry
2. `ScanCard.tsx` — Individual scan card component
3. `PricingPage.tsx` — Premium pricing page with ₹99/mo, ₹999/yr
4. `HealthometerPanel.tsx` — Standalone Healthometer component
5. `AnalysisMeters.tsx` — Technical + fundamental meter cards
6. `FinancialHistogram.tsx` — Interactive bar chart for financial data
7. `FinancialMetricTabs.tsx` — Metric selector tabs
8. `StockNewsPanel.tsx` — Stock-specific news panel
9. `NewsService.ts` — Backend news cache service

### Pages to Create/Update
1. Create `PricingPage` route → `src/pages/PricingPage.tsx`
2. Update `ScannerPage.tsx` → Add free/premium tabs + catalogue
3. Update `StockStoryPageF0.tsx` → Reorder sections, add new components
4. `ComparePage.tsx` — Verify unchanged
5. `WatchlistPage.tsx` — Verify unchanged

### Routes to Add
- `pricing` → `PricingPage`
- Update `router.ts` to include pricing route

## Backend Changes Required
1. News service with 12-hour cache TTL (or shell with empty result)
2. No other backend changes if data already flows through existing APIs

## Frontend-Only Parts
- Scan catalogue registry (frontend)
- Pricing UI shell (frontend)
- Stock detail reordering (frontend)
- Healthometer extraction (frontend)
- Financial histogram (frontend, uses existing data)
- News panel (frontend, with backend cache shell)

## Risks/Blockers
1. Frontend typecheck fails on pre-existing untracked files (IntelligenceHUD, PredictiveHologram, PredictivePanel)
2. No real payment gateway — pricing page must be a shell
3. No real news API — news must use empty-safe shell
4. Financial data may be partial for many symbols — histogram must handle gracefully
