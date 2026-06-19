# Part R — Data-Rich Intelligence Detailing Report

## Baseline

- **Baseline Commit**: `a3d91d805` ("Execute premium UI coherence and data display repair")
- **Baseline Verification**:
  - `typecheck:all`: PASS
  - `lint`: PASS
  - `test:unit`: 1184 passed
  - `validate:hygiene`: PASS (0 secrets)
  - `build:frontend`: PASS
  - `build:backend`: PASS
  - `test:e2e`: 36 passed (4 pre-existing failures)
  - `smoke:production`: PASS
  - `check:market-providers`: PASS

## Scope

Part R focuses on making the app feel like a real research intelligence product by carefully showing processed data from providers and engines in useful, structured, premium product surfaces. This is not a basic UI polish pass.

## Route Intelligence Map

### Dashboard
- **Data path**: API signals → `api.getSignals()` → `DashboardHub.tsx` → intelligence items
- **Available fields**: signal symbol, type, severity, explanation (real)
- **Not shown**: score context, factor drivers per signal, risk details
- **Fallback**: "No notable changes" when empty — correct

### Scanner
- **Data path**: Backend scanner engine → `api.getScanner()` → `ScannerPage.tsx` via `scannerResultToResearchListItem` adapter
- **Available fields**: symbol, companyName, sector, rank, score, conviction, oneLineThesis, keyReason, riskMarker (real)
- **Not shown**: factor breakdown, confidence, top drivers, data sufficiency
- **Fallback**: score-driven signal labels — correct

### Rankings
- **Data path**: Scanner API → `PublicRankingsPage.tsx` with auth gating
- **Available fields**: same as scanner + rank order
- **Not shown**: top driver per row, risk indicator per row, "How to read" disclosure
- **Fallback**: gated for public, full for authenticated — correct

### Company Detail (StockStoryPage)
- **Data path**: `api.getStockStory()` + `api.getCompanyResearch()` → adapters → page components
- **Available fields**: signal, factorScores, thesis, narrative, bull/bear case, strengths, risks, fundamentals, quote
- **Not shown**: factor explanations inline, driver list, risk review panel, "What would change", "Before you invest checklist"
- **Fallback**: "Research signals pending" when unavailable — correct

### Compare
- **Data path**: `api.compareCompanies()` → `ComparePage.tsx`
- **Available fields**: company scores, strengths, risks, factorComparison, recommendation
- **Not shown**: signal meter per company, factor bar comparison inline
- **Fallback**: "Comparison is being prepared" — correct

### Watchlist
- **Data path**: Local engine + `api.getWatchlistThesis()`
- **Available fields**: symbol, status, conviction, score
- **Not shown**: thesis health meter, signal label, next action
- **Fallback**: tracked state — correct

### Portfolio
- **Data path**: Local engine + `api.monitorPortfolio()`
- **Available fields**: holdings, review priority, summary
- **Not shown**: thesis signal per holding, risk flags inline
- **Fallback**: "No thesis tracked yet" — correct

### Alerts
- **Data path**: `api.getAlerts()`
- **Available fields**: id, symbol, type, title, body, timestamp
- **Not shown**: signal context, severity tone properly integrated
- **Fallback**: empty state — correct

### Invest Handoff
- **Data path**: `api.getInvestContext()` → `InvestHandoffSheet.tsx`
- **Available fields**: conviction, score, thesis, keyRisks, keyStrengths, whatToWatch
- **Not shown**: signal meter, risk review, before-you-invest checklist
- **Fallback**: "Loading invest context..." — correct

## Intelligence Components Plan

Create these reusable components:

1. `SignalExplanationPanel` — why this label, top drivers, top risks, confidence
2. `FactorDriverList` — ordered factor scores with mini-bars and commentary
3. `RiskReviewPanel` — flagged risks, severity, what to review
4. `NextBestActionPanel` — what action user should take next
5. `CompanySnapshotStrip` — compact company header with key metrics
6. `MetricInterpretationRow` — single metric with interpretation text
7. `ResearchContextLink` — contextual link to Research Standards

## Data Sufficiency Rules

- If 0 factors available → section-level pending: "Research signals pending — not enough data for a reliable case."
- If 1-2 factors → partial: "Limited factor data available — confidence reduced."
- If 3+ factors → show all, note missing as "not available" silently
- Never show per-field pending badges
- Never show provider/backend wording

## Prohibitions

- No Buy/Sell/Hold labels
- No provider/backend/API/source wording
- No fake data, fake sectors, fake rankings
- No raw null/undefined/NaN
- No HTTP status codes
- No raw exceptions

## Acceptance Criteria

1. Dashboard feels like a research briefing with signal explanations
2. Scanner cards show drivers/risks where available
3. Rankings show explanation disclosure and signal rows
4. Company page shows signal explanation, factor drivers, risk review
5. Compare has useful suggestions and selected state
6. Watchlist/portfolio/alerts use signal state consistently
7. Invest handoff shows decision-review context
8. No route feels like a skeleton
9. No Buy/Sell/Hold labels
10. No backend/provider leakage
11. No fake data
12. Typecheck, lint, tests, E2E, builds pass

## Implementation Plan

1. Create `SignalExplanationPanel` component
2. Create `FactorDriverList` component  
3. Create `RiskReviewPanel` component
4. Create `NextBestActionPanel` component
5. Enhance StockStoryPage with intelligence components
6. Enhance ScannerPage with driver/risk display
7. Enhance PublicRankingsPage with "How to read" disclosure
8. Enhance ComparePage with signal context
9. Ensure DashboardHub uses proper briefing structure
10. Ensure InvestHandoffSheet uses signal meter
11. Add contextual Research Standards links
12. Add/update tests
13. Run verification
14. Take screenshots
15. Update report
16. Commit and push
