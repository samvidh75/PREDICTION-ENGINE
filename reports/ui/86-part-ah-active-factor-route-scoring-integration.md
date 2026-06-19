# Part AH — Active Factor Expansion and Route Scoring Integration

## Baseline

- **Baseline commit**: `3c6de53a5`
- **Current HEAD**: `e93c5fdf4`
- **Status**: Working on `main`, no branch/PR

## Scope

- **Frontend-only/product-algorithm scope**: Factor scoring expansion, dimension scoring improvements, route integration, tests.
- **Backend untouched**: Strictly enforced.

## Current State

- **Active factor count**: 13 (PE, PB, EV/EBITDA, dividend yield, ROE, ROIC, operating margin, revenue/profit/EPS growth, debt/equity, current ratio, market cap)
- **Planned factor count**: 155
- **Unavailable factor count**: 27
- **Route integration**: PredictionEnginePanel on company page only
- **Factor scores from API**: quality, valuation, growth, risk, momentum, stability — available in `CompanyResearchData.factorScores` not used by frontend scoring

## Acceptance Criteria

1. Expanded active factor count ≥ 16
2. Dimension scoring uses backend factor scores when available
3. RecommendationPolicy handles edge cases (high score+low confidence, etc.)
4. PredictionEnginePanel shows cleaner hierarchy
5. Route integration into scanner, rankings, compare where data exists
6. No N/A, no fake data, no Buy/Sell/Hold
7. All tests pass