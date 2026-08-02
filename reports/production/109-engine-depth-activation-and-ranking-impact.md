# Part DZ — Engine Depth Activation & Ranking Impact

## Baseline
**Commit:** 532d851d0

## Engine Field Audit
- ROA: Already active in QualityEngine, added to scanner quality scoring
- Dividend yield: Already in ValuationEngine, was MISSING from production stockstory.ts query — FIXED
- Market cap: Already active in StabilityEngine (log10 scaling)
- EPS: Was MISSING from production query — FIXED

## Fixes Applied
| Fix | File | Impact |
|---|---|---|
| Added `dividend_yield`, `eps` to healthometer query | stockstory.ts | ValuationEngine now receives dividend data in production |
| Added `dividend_yield`, `eps` to scanner query | research.ts | Scanner valuation scoring now includes dividend context |
| Added ROA to scanner quality scoring | research.ts | Quality compounders lens now includes asset efficiency |
| Added dividend yield to scanner valuation scoring | research.ts | Dividend stability lens more accurate |

## Engine Depth Audit
- Created `scripts/audit-engine-depth.ts`
- Checks: scanner valid results, healthometer present, quote consistency, no engine internals leaked, public-copy compliance

## Technical Reliability
- Technical indicators already have trust gates (weekend bar filtering)
- RSI/MACD/ADX/ATR all computed from trusted daily_prices data

## Scanner Result
- Returns real results with improved scoring from ROA + dividend yield

## Quote/Snapshot Consistency
- Verified: quote and snapshot prices match

## Remaining Blockers
- None critical

## Confirmations
- No fake data, no secrets, no investment advice, no backend/provider/engine public wording, no DNS changes
