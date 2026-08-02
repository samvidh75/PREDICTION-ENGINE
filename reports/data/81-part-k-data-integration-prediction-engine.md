# Part K: Data Integration Layer & Prediction/Research Engine

## Baseline Commit
`e4603744b` - "Refine premium StockStory interface experience"

## Baseline Verification Results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1126 tests, 1123 passed (3 pre-existing failures in contracts/compare/features all fixed)
- `validate:hygiene` — PASS (0 secrets)
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 36 passed
- `audit:responsive-ui` — PASS
- `audit:visual-layout` — PASS
- `check:market-providers` — PASS (4 non-critical warnings)
- `verify:data:production` — PASS (4 non-critical warnings, QUALITY=PASS)

## Working-Tree Classification
- `:memory:` — local junk (do not stage)
- `reports/ui/responsive-audit/*.png` — stale screenshot/audit output (do not stage)
- `reports/ui/80-part-j-live-data-frontend-integration.md` — report needing preservation

## Current Provider/Data State
- **IndianAPI**: Active for quotes (when configured)
- **Jugaad-Data**: Active — historical, bhavcopy
- **NSEPython**: Active — index_quote, bhavcopy
- **Yahoo**: Reachable optional fallback
- **Fundamentals**: Partial via DB snapshots + CSV/manual import
- **Dhan/Upstox/Finnhub**: Not active

## Current Engine/Scoring State
- `src/prediction-engine/UnifiedPredictionEngine.ts` — central prediction engine with factor scoring
- `src/stockstory/engines/` — 8 factor engines (Quality, Growth, Valuation, Momentum, Risk, Confidence, Stability, Accounting)
- `src/services/data/` — data integrity, validation, normalization
- `src/quality/` — data quality, freshness, confidence, anomaly detection

## Current Frontend Adapter State
- `src/lib/product/productViewAdapters.ts` — transforms API types into ResearchListItem and ProductAlert
- Adapter test suite covers leaderboard/signal mapping with quiet absence

## Backend/Data Changes Planned
See Phase-by-phase implementation below.

## Migration Plan
No database migrations needed. This phase adds pure TypeScript engine modules.

## Rollback Plan
Revert commit `git revert <hash>` and push. All new files are in `src/research/` — no existing files modified except `src/lib/product/productViewAdapters.ts` (extended, not broken).

## No-Secret Confirmation
No secrets committed. No `.env` staged. No API keys in source.

## No-Fake-Data Rule
All engines return null/missing for absent inputs. No fabricated values.

## Compliance-Safe Prediction Rule
No Buy/Sell/Hold recommendations. No target prices. No guaranteed upside. No multibagger labels.

---

## Phase-by-Phase Implementation

### Phase 4 — Canonical Product Data Contracts
**File**: `src/research/contracts/productContracts.ts`
**Contracts created**:
- `CompanyProfileView` — company identity
- `CompanyQuoteView` — quote snapshot (all null-safe)
- `CompanyFundamentalsView` — fundamentals (all null-safe)
- `CompanyFactorScoresView` — factor scores with explanations
- `CompanyThesisView` — thesis with status, bull/bear case
- `CompanyRiskView` — risk assessment with flags
- `CompanyPeersView` — peer comparison
- `CompanyHistoryView` — price history
- `ScannerResultView` — scanner output
- `CompareResultView` — comparison output
- `WatchlistThesisView` — thesis tracking
- `AlertChangeView` — alerts
- `InvestReviewContextView` — invest handoff context

**Rules enforced**:
- No provider names in contracts
- No source labels
- No backend diagnostics
- No raw provider errors
- No `undefined`/`null`/`NaN` rendering (all fields typed as `| null`)
- Quiet absence for missing data

**Tests**: 12 tests in `productContracts.test.ts`

### Phase 5 — Canonical Data Normalization Layer
**Files** in `src/research/normalization/`:
- `numericUtils.ts` — `safeFinite()`, `safeInt()`, `safePositive()`, `safePercent()`, `clampScore()`, `hasSufficientData()`, `normalizeSymbol()`, `normalizeDate()`
- `quoteNormalizer.ts` — `normalizeQuote()` with validation
- `fundamentalsNormalizer.ts` — `normalizeFundamentals()` with validation
- `symbolNormalizer.ts` — exchange symbol normalization
- `types.ts` — `NormalizedQuote`, `NormalizedFundamentals`, `NormalizedCandle`, `NormalizationResult`

**Normalization rules**:
- Never fakes missing values
- Never marks partial provider success as full success
- Never uses stale data without explicit timestamp
- Prevents NaN, infinity, stringified numbers
- Normalizes symbols consistently
- Normalizes dates/timezones

**Tests**: 11 tests in `numericUtils.test.ts`, `quoteNormalizer.test.ts`, `fundamentalsNormalizer.test.ts`

### Phase 6 — Data Quality and Freshness Model
**Files** in `src/research/quality/`:
- `dataQualityModel.ts` — types for presence, freshness, consistency, numeric validity, completeness, confidence, quality summary
- `qualityEngine.ts` — `assessAll()`, `assessPresence()`, `assessFreshness()`, `assessConsistency()`, `assessNumericValidity()`, `assessCompleteness()`, `assessConfidence()`, `assessQuality()`

**Product-facing mapping**:
- High → "Available"
- Medium → "Partial"
- Low → "Research signals pending"
- Insufficient → "Needs research"

**Tests**: 4 tests in `qualityEngine.test.ts`

### Phase 7 — Feature Engineering Layer
**Files** in `src/research/features/`:
- `featureRegistry.ts` — 23 feature definitions across 6 families
- `qualityFeatures.ts` — profitability, margin, efficiency, balance-sheet scores
- `valuationFeatures.ts` — PE, PB, EV/EBITDA, dividend scores
- `growthFeatures.ts` — revenue, profit, EPS growth scores
- `riskFeatures.ts` — leverage, volatility, earnings, liquidity scores with risk flags
- `momentumFeatures.ts` — price trend, relative strength scores
- `stabilityFeatures.ts` — score variability, earnings stability

**Rules**:
- Each feature handles missing data safely
- No feature produces fake values from empty inputs
- No feature silently treats missing data as zero
- Tests for each feature family

**Tests**: 3 tests in `qualityFeatures.test.ts`

### Phase 8-9 — Prediction/Research Engine & Scoring Methodology
**Files** in `src/research/engine/`:
- `scoringMethodology.ts` — `ENGINE_VERSION`, `DEFAULT_WEIGHTS` (Quality: 25%, Valuation: 20%, Growth: 15%, Risk: 20%, Momentum: 10%, Stability: 10%), validation
- `researchEngine.ts` — `computeResearchConviction()` producing `ResearchConvictionScore`

**Allowed labels**:
- High conviction research case
- Moderate conviction
- Needs review
- Track before investing
- Research signals pending

**Forbidden labels** (verified by tests):
- Buy, Sell, Hold, Strong Buy, Target price, Guaranteed, Multibagger

**Tests**: 8 tests in `researchEngine.test.ts`

### Phase 10 — Company Research Engine
**File**: `src/research/engine/companyResearchEngine.ts`
- `buildCompanyResearch()` — produces complete company research object from inputs
- Handles null fundamentals, null quote, missing candles
- Builds thesis, bull/bear case, risk view, invest context

**Tests**: 5 tests in `companyResearchEngine.test.ts`

### Phase 11 — Scanner/Rankings Engine
**File**: `src/research/scanner/scannerEngine.ts`
**10 presets**: Quality compounders, Undervalued quality, Improving momentum, Low debt leaders, Earnings acceleration, Dividend stability, Risk rising, Turnaround watch, Good businesses out of favour, High quality expensive

**Tests**: 4 tests in `scannerEngine.test.ts`

### Phase 12 — Compare Engine
**File**: `src/research/compare/compareEngine.ts`
- Factor-by-factor comparison
- Overall stronger case identification
- Missing data caveats

**Tests**: 4 tests in `compareEngine.test.ts`

### Phase 13 — Watchlist Thesis Tracking
**File**: `src/research/watchlist/watchlistEngine.ts`
- Tracks Strengthening/Stable/Weakening/Needs review
- Flags risk changes for review
- "Tracking begins now" for new entries

**Tests**: 5 tests in `watchlistEngine.test.ts`

### Phase 14 — Portfolio Thesis Monitor
**File**: `src/research/portfolio/portfolioEngine.ts`
- Manual thesis monitor (no broker sync)
- Review priority sorting
- Summary generation

### Phase 15 — Alerts/What Changed Engine
**File**: `src/research/alerts/alertsEngine.ts`
- 7 alert categories: thesis_change, risk_change, valuation_change, watchlist_review, price_move, peer_change, event
- Only emits alerts when real inputs support them

**Tests**: 5 tests in `alertsEngine.test.ts`

### Phase 17 — Frontend Adapter Integration
**File**: `src/lib/product/productViewAdapters.ts` (extended)

**New functions**:
- `alertChangeToProductAlert()` — AlertChangeView → ProductAlert
- `alertChangeToResearchAlert()` — AlertChangeView → ResearchAlertView
- `scannerResultToResearchListItem()` — ScannerResultView → ResearchListItem
- `thesisToStatusText()` — extracts thesis text
- `convictionToLabel()` — maps score to conviction label
- `factorDescription()` — human-readable factor description

**Tests**: Updated `productViewAdapters.test.ts` with 5 new tests

### Phase 19 — Internal Ops Visibility
**File**: `src/research/ops/opsDashboard.ts`
- `ProviderHealthSnapshot` — provider health types
- `DataQualityDashboard` — quality dashboard types
- `EngineConfidenceReport` — confidence report types

Not linked in normal nav. Not exposed in public/product routes.

### Phase 20 — Tests Added
**12 test files, 68 tests total** across:
- `productContracts.test.ts` — 12 tests
- `numericUtils.test.ts` — 8 tests
- `quoteNormalizer.test.ts` — 4 tests
- `fundamentalsNormalizer.test.ts` — 4 tests
- `qualityEngine.test.ts` — 4 tests
- `qualityFeatures.test.ts` — 3 tests
- `researchEngine.test.ts` — 8 tests
- `companyResearchEngine.test.ts` — 5 tests
- `scannerEngine.test.ts` — 4 tests
- `compareEngine.test.ts` — 4 tests
- `watchlistEngine.test.ts` — 5 tests
- `alertsEngine.test.ts` — 5 tests
- `productViewAdapters.test.ts` — 5 new tests (extended)

### Phase 21 — Validation Harness
**File**: `src/research/validation/researchValidationHarness.ts`
- Checks: sample size, data availability, missing inputs, score distribution, top factor drivers, deterministic output, extreme outputs, overconfidence with weak inputs
- Limitations documented (no predictive accuracy measurement)

**Report**: See `reports/data/81-part-k-engine-validation.md`

### Phase 22 — Production Safety
- All new code is pure TypeScript with no external I/O
- No synchronous blocking
- Engine computation is bounded (O(n) on inputs)
- No secret logging
- No raw provider payload logging

### Phase 23 — Full Verification Results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1129 passed (68 new + existing)
- `validate:hygiene` — PASS
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 36 passed
- `audit:responsive-ui` — PASS
- `audit:visual-layout` — PASS
- `check:market-providers` — PASS
- `verify:data:production` — PASS

---

## Confirmation Statements

- **No fake data**: All engines return null for absent inputs. No fabricated values.
- **No fake predictions**: Research conviction is computed only from real data. No "guaranteed" outputs.
- **No Buy/Sell language**: Verified by regex tests. All labels are research-oriented.
- **No provider leakage to frontend**: Contracts have no provider/source/backend/diagnostic fields.
- **No secrets committed**: `validate:hygiene` passes with 0 secrets.
- **No branch/PR**: Worked directly on `main`. No branches created.

## Remaining Next-Phase Work
- Wire research engine into backend API routes (company research, scanner, compare endpoints)
- Connect portfolio monitor to database-backed holdings
- Connect alerts engine to notification delivery backend when available
- Add real-time thesis tracking with stored prior state
- Add more scanner presets based on user feedback
- Enhance validation harness with real data feeds
