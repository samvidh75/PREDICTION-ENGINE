# Deterministic Engine Completion — Phase 2

## Overview
The deterministic StockStory engine was already largely complete before this phase. This report confirms the state of each required component.

## 1. ROA → QualityEngine
**Status: Already active**
- `roa` field exists in `EngineInputs.financials` (types.ts:61)
- ROA sub-score computed in QualityEngine with sector percentile scoring (QualityEngine.ts:40-52)
- Threshold fallback: >15%→95, >5%→65, ≥0→30, negative→10
- Weighted at 2.0 in composite (QualityEngine.ts:114)
- Output exposes `roa` field (QualityEngine.ts:129)
- Tests cover null, negative, weak, average, strong ROA (StockStoryEngine.test.ts:187-253)

## 2. Dividend Yield → ValuationEngine
**Status: Already active**
- `dividendYieldScore` exposed in ValuationEngineOutput (types.ts:135)
- Yield-trap detection active: >20%→10, >12%→25, >8%→50, 3-4%→80-90 (ValuationEngine.ts:86-99)
- Weighted at 1.5, not over-weighted vs PE/PB/EV/EBITDA (ValuationEngine.ts:110)
- Tests in ScoringIntegrity.test.ts GROUP H

## 3. Market Cap → StabilityEngine
**Status: Already active**
- `marketCapSizeScore` exposed in StabilityEngineOutput (types.ts:117)
- Log10 scaling: ~10Cr→5, 1LCr→81, ~1MCr→100 (StabilityEngine.ts:125-134)
- Weighted at 1.0 (7% of total) — visible but not dominant
- Tests in ScoringIntegrity.test.ts GROUP A

## 4. Technical Feature Reliability
**Status: Already active**
- MomentumEngine gracefully handles null RSI/MACD/ADX/ATR/momentum/volatility
- Returns neutral 50 with commentary "Insufficient technical data"
- Tests cover null technicals scenarios

## 5. Score Consistency
**Status: Already active**
- `clampScore()` ensures 0-100 range
- `isFiniteNumber()` rejects NaN, Infinity, -Infinity
- `weightedAverage()` handles empty component arrays (returns 50)
- All engines use `clampScore` on outputs
- Tests in ScoringIntegrity.test.ts GROUP J (Score Range)

## Files Changed in This Phase
None — all engine work was previously completed.

## Score Weighting Decisions (pre-existing)
| Engine | Total Weight | Notes |
|--------|-------------|-------|
| Growth | varies by sector | Revenue/EPS/FCF/Profit growth |
| Quality | 2+2+2+2+1 | ROE/ROA/ROIC/Margins/Efficiency |
| Stability | 2.5+2+1.5+2+2+1 | Debt/Liquidity/Volatility/Coverage/ICR/MCap |
| Momentum | 5+3+2 | RSI+MACD / ADX+Trend / Volatility |
| Valuation | 2+2+2+3+1.5 | PE/PB/EV/FCFY/DivYield |
| Risk | independent | Higher = more risky |

## Null Handling Behavior
- All engines default to neutral 50 for null inputs
- Factor adjustment still applies when factor data available
- Confidence engine gates on missing critical fields (ROE, ROIC, debt, FCF yield)
- Weight of null-scored components set to 0 in weighted average

## Tests
- 602-line StockStoryEngine.test.ts covering all engines
- 869-line ScoringIntegrity.test.ts covering 11 test groups (A-K)
- All existing tests pass
