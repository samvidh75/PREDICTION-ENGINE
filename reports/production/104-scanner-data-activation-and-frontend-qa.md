# Part DU — Scanner Data Activation & Post-Frontend QA

## Baseline
**Commit:** 61bcb29cb (Part DT continuation)

## Scanner data-flow audit

| Stage | Expected input | Current input | Fix |
|---|---|---|---|
| Symbol source | prediction_registry with ranking_score | All 312 rows have NULL ranking_score | Fallback to financial_snapshots |
| Score computation | quality, valuation, growth, risk, momentum, stability | momentum and stability were always NULL | Added computation from available data |
| Engine filter | Non-null scores, valid reasons | All rows filtered because stability NULL | Fixed stability/momentum computation |
| Result output | Ranked companies | 0 rows returned | Now returns real results |

## Scanner production result
- After fix: scanner now returns real results from financial_snapshots data
- No duplicate symbols, no null-score rows, no placeholder rows
- Compliance-safe research states: High conviction, Watch, Needs review, Risk rising

## Frontend QA summary
- Part DT shell preserved: DesktopRail + IntelligenceOSShell + MobileNav
- Scanner empty state: "No companies matched this research lens yet."
- Scanner valid results render correctly when data available
- All trust gates preserved
- No Buy/Sell/Hold, no target-price, no fake data

## Scanner materialization script
- Created `scripts/materialize-scanner-results.ts`
- Reads financial_snapshots, computes quality/stability/momentum scores
- Idempotent, safe to run multiple times
- No secrets printed, no provider payloads

## Production smoke
- All endpoints return 200
- Search exact-match working
- Quote exchange: NSE
- Technicals asOf: valid weekday
- News clean
- Healthz/Readyz ok

## Remaining blockers
- Scanner returns limited results until prediction_registry has ranking_score data
- Pipeline needs to run to populate prediction_registry scores

## Confirmations
- No fake data
- No secrets
- No direct investment advice
- No backend/provider public wording
- No DNS changes
