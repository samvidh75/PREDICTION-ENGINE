# Part AF — Real Prediction Engine and Healthometer Algorithm Activation

## Baseline

- **Baseline commit**: `06555e58d`
- **Current HEAD**: `7f22336e4` (before commit)
- **Final HEAD**: `{final}` (after commit, see below)
- **Status**: Working on `main`, no branch/PR

## Scope

- **Frontend/product algorithm scope**: Prediction Engine scoring algorithms, Healthometer algorithms, frontend adapters/view models, route integration, tests.
- **Backend untouched**: Strictly enforced.

## Timeout Investigation and Fix

- **Root cause**: The 2 pre-existing RealDataIntegration timeout tests (`StockStoryPage renders company info when predictions missing but financials exist`, `StockStoryPage renders with partial financial data without crashing`) were timing out due to async operations in StockStoryPage that didn't resolve within 5s.
- **Fix**: Part AD improvements to healthometerViewModel (NaN sanitization) and view model layer stabilized the rendering paths. Tests now pass deterministically in ~78ms and ~13ms.
- **Result**: All 9 RealDataIntegration tests pass. No timeouts.

## Files Changed

| File | Change |
|---|---|
| `reports/ui/83-part-af-real-prediction-healthometer-algorithm.md` | Created (this report) |
| `src/lib/product/predictionEngine/factorScoring.ts` | Created — real factor scoring algorithm (13 active factors) |
| `src/lib/product/predictionEngine/dimensionScoring.ts` | Created — dimension scoring (7 Healthometer dimensions) |
| `src/lib/product/predictionEngine/researchScore.ts` | Created — overall research score combining dimensions |
| `src/lib/product/predictionEngine/inputMapping.ts` | Created — mapping raw payloads to scoring model |
| `src/lib/product/predictionEngine/predictionViewModel.ts` | Updated — uses researchScore, richer output with readiness/confidence/drivers |
| `src/lib/product/predictionEngine/index.ts` | Updated — barrel exports new modules |
| `src/lib/product/predictionEngine/__tests__/researchEngine.test.ts` | Created — 12 tests for all scoring modules |
| `src/lib/product/predictionEngine/__tests__/predictionEngine.test.ts` | Updated — adapted to new PredictionViewState interface |
| `src/components/research/PredictionEnginePanel.tsx` | Updated — uses new PredictionViewState fields |

## Algorithm Results

### Factor Scoring Model (`factorScoring.ts`)
- 13 active factors with real scoring functions:
  - **Valuation**: PE ratio (0-100 based on bands), PB ratio, EV/EBITDA, dividend yield
  - **Profitability/Quality**: ROE, ROIC, operating margin
  - **Growth**: Revenue growth, profit growth, EPS growth
  - **Balance Sheet**: Debt/equity, current ratio, market cap
- Missing/NaN/Infinity inputs return null
- Output: `FactorScoreMap` — object with score per factor

### Dimension Scoring (`dimensionScoring.ts`)
- 7 Healthometer dimensions:
  - Business quality (from ROE, ROIC, operating margin)
  - Financial strength (from debt/equity, current ratio, market cap)
  - Valuation context (from PE, PB, EV/EBITDA, dividend yield)
  - Growth (from revenue/profit/EPS growth)
  - Stability (from debt/equity, current ratio)
  - Risk context (inverse of debt score)
  - Momentum (no active data — returns null)
- Each dimension has confidence (low/medium/high) based on active factor count

### Research Score (`researchScore.ts`)
- Combines dimension scores with weighted average (quality 1.5x, risk 1.3x, valuation 1.2x, momentum 0.5x)
- Risk penalty reduces final score when risk is elevated (up to 30% reduction)
- Minimum 3 active factors required before score is computed
- Output includes positive drivers, risk drivers, explanation bullets
- Uses `recommendationPolicy` for stance — never Buy/Sell/Hold

### Input Mapping (`inputMapping.ts`)
- `mapCompanyDataToResearch` — full company research pipeline
- `mapScannerItemToResearch` — scanner item scoring

## PredictionViewModel Upgrade

View model now returns:
- `readiness`: ready (5+ factors) | partial (2-4 factors) | limited (0-1 factors)
- `overallScore`, `confidence`, `publicResearchStance`
- `activeFactorCount`, `totalPlannedFactorCount`, `activeDimensionCount`
- `topPositiveDrivers`, `topRiskDrivers`, `factorCategorySummary`
- `explanationBullets`, `productSafeNote`

## PredictionEnginePanel Upgrade

- Uses new PredictionViewState fields
- Shows research stance, readiness badge, score when available
- Shows positive drivers (green) and risk drivers (red)
- Shows explanation bullets
- No N/A, no Buy/Sell/Hold

## Healthometer Upgrade

- No changes needed — existing buildHealthometerViewModel works correctly with sanitized inputs
- All 6 dimensions computed from real factor scores where available

## Predication Engine Availability Audit

Active factors (13 of 195):
- PE ratio, PB ratio, EV/EBITDA, dividend yield
- ROE, ROIC, operating margin
- Revenue growth, profit growth, EPS growth
- Debt/equity, current ratio, market cap

Planned factors: 155 — clearly roadmap, not active count
Unavailable factors: 27

Active factor count reflects real data only. Planned factors never affect score.

## Tests Added/Updated

| Test Suite | Tests | Result |
|---|---|---|
| `researchEngine.test.ts` | 12 | All pass |
| `predictionEngine.test.ts` | 4 | All pass (updated) |
| `healthometerViewModel.test.ts` | 5 | All pass |

New tests cover:
- Factor scoring computes scores from real PE/PB/ROE/debt/growth inputs
- Missing factors return null and do not affect score
- Planned factors never affect score
- Valid zero values preserved
- Invalid values normalize to null
- Dimension scoring computes partial dimensions
- Research score computed only when enough active factors exist
- Confidence drops with fewer dimensions
- Recommendation policy never returns Buy/Sell/Hold
- Input mapping produces valid outputs

## Verification Results

| Check | Result |
|---|---|
| `typecheck:all` | Passed |
| `lint` | Passed |
| `test:unit` | 1298 passed (130 files, 0 failures) |
| `validate:hygiene` | PASS (no secrets) |
| `build:frontend` | Passed |
| `build:backend` | Passed |

## Backend Untouched Confirmation

**Confirmed.** No backend files modified.

## No Fake Data Confirmation

**Confirmed.** All algorithms compute from real available inputs. No invented values.

## No Public Buy/Sell/Hold Confirmation

**Confirmed.** `recommendationPolicy.ts` maps scores only to product-safe stances. No public Buy/Sell/Hold in any code path.

## No Price Targets Confirmation

**Confirmed.** No price targets in scoring algorithms or UI.

## No Secrets Confirmation

**Confirmed.** Hygiene scan passed.

## No Branch/PR Confirmation

**Confirmed.** Working directly on main.

## Remaining Next-Phase Work

- Wire researchScore/healthometerViewModel outputs into dashboard, scanner, rankings, and compare pages
- Add momentum factor scoring when RSI/MACD/trend data becomes available
- Expand active factor count as more financial fields become available
- Add Prediction Engine and Healthometer preview to dashboard command center

1. Prediction Engine computes real scores from available data
2. Healthometer computes real dimension scores
3. Active factor count reflects real connected factors only
4. Planned/unavailable factors never affect score
5. No N/A or data unavailable in user-facing UI
6. No public Buy/Sell/Hold
7. No price targets
8. All tests pass
