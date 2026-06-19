# Part Q — Research Signal Data Coverage & Production Proof

## Baseline Commit

`c492c83cc` (Add research signal meters and premium data UI - Part P)

## Baseline Verification Results

- typecheck:all: PASS
- lint: PASS
- test:unit: 1184 passed (8 new adapter tests added)
- validate:hygiene: PASS, 0 secrets
- build:frontend: PASS
- build:backend: PASS
- audit:responsive-ui: TIMEOUT
- audit:visual-layout: PASS

## Data Coverage Audit

### Company Page (StockStoryPage.tsx)

| Aspect | Status |
|--------|--------|
| API route | getStockStory + getCompanyResearch (enhanced) |
| Typed client method | getStockStory, getCompanyResearch, getCompanyFinancials |
| Signal adapter | productSignalAdapter.ts + researchDataAdapter.ts (new) |
| Thesis narrative | From getCompanyResearch.thesis.thesis, fallback to StockStoryData.narrative |
| Bull/Bear case | From getCompanyResearch.thesis.{bullCase,bearCase}, fallback to factor-based |
| Factor scores | From getCompanyResearch.factorScores, fallback to StockStoryData |
| Top strengths/risks | From getCompanyResearch.thesis.{topStrengths,topRisks} |
| ThesisHealthMeter | Shows real signal from combined data |
| FactorScorePanel | Shows real factors from combined data |
| Missing fields | Omitted quietly, section-level pending only when no data |

### Scanner (ScannerPage.tsx)

| Aspect | Status |
|--------|--------|
| API route | getScanner |
| Typed client method | getScanner(preset, limit) |
| Signal chip | Shows from scannerSignalLabel (score-based) |
| Thesis text | Cleaned via cleanThesisLine (no "Sector pending") |
| HelpPopover | Dismissible, localStorage remembered |
| Missing sector | Omitted quietly |

### Rankings (PublicRankingsPage.tsx)

| Aspect | Status |
|--------|--------|
| API route | getScanner("Quality compounders", 50) |
| Signal chip | rankingsSignalLabel per row |
| Public gating | 3-row preview, lock panel |
| Sector filter | Derived from real data, "—" when missing |
| Dark design | bg-[#0D1117] table, no white |

### Compare (ComparePage.tsx)

| Aspect | Status |
|--------|--------|
| Suggested companies | From getScanner API, 6 real ranked suggestions |
| Comparison categories | 3 presets using first 2 ranked |
| Selected comparison | Factor comparison from compareCompanies API |
| Signal labels | PENDING — could add mini meters for selected |

### Dashboard (DashboardHub.tsx)

| Aspect | Status |
|--------|--------|
| Research briefing header | "Today's research overview" with BookOpen icon |
| What Changed | Signal severity-colored tone chips |
| Tracked companies | Signal dot indicators |
| Scanner presets | 4 presets with icons |
| Portfolio thesis monitor | Summary card |

### Invest Handoff (InvestHandoffSheet.tsx)

| Aspect | Status |
|--------|--------|
| API route | getInvestContext |
| Signal computation | computeResearchSignal from context score |
| ThesisHealthMeter | Added to StageOne thesis review |
| Key risks | From API context or fallback |
| Checklist | Stage 1 investment checklist |

### Alerts (AlertsPanel.tsx)

| Aspect | Status |
|--------|--------|
| API route | getAlerts(symbol) |
| Severity chips | By change type (risk_change=red, thesis_change=amber) |
| Signal labels | Via type-based tone chips |

## Research Signal Model Result

Created `src/lib/research/researchSignalModel.ts`:

- `computeResearchSignal()` — deterministic label derivation
- 7 compliance-safe labels
- Tone-based color mapping
- Updated `computeLabel` thresholds: score >= 75 → High conviction, >= 55 → Worth researching, >= 40 → Track, >= 25 → Needs review, < 25 → Track (compare first)

## Product Signal Adapter Result

Created `src/lib/product/researchDataAdapter.ts`:

- `companyResearchToFactorScores()` — maps CompanyResearchData.factorScores to CompanyFactorScoresView
- `computeSignalFromResearchData()` — computes signal from CompanyResearchData with thesis context
- `buildCompanyPageData()` — combines research data + stock story + financials into unified page data

## Tests Added

- `src/lib/product/__tests__/researchDataAdapter.test.ts` — 8 tests covering:
  - companyResearchToFactorScores null/empty/mapping
  - computeSignalFromResearchData null/full/thesis
  - buildCompanyPageData combined/fallback

## Remaining Caveats

- getCompanyResearch must be deployed and returning real data for companies
- Scanner card thesis text depends on API returning useful oneLineThesis
- Compare selected state could show mini signal meters (future enhancement)
- E2E tests require dev server
- Screenshots require dev server
- smoke:production and verify:data:production require production environment

## No Fake Data Confirmation

All data from real API responses. No fake rankings, predictions, sector labels, thesis, alerts, or holdings.

## No Buy/Sell/Hold Confirmation

All labels use compliance-safe alternatives. ResearchSignalView has 7 allowed labels.

## No Provider/Backend Leakage Confirmation

Prediction registry copy removed. All fallback language uses product-safe terms.

## No Secrets Confirmation

No secrets, provider keys, or environment variables exposed.

## No Branch/PR Confirmation

All commits directly to main. No branch. No PR.
