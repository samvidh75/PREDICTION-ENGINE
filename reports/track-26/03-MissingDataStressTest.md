# TRACK-26 Phase 3: Missing Data Stress Test

## Individual Field Removal Impact (avg score delta)
| roe | -5.1 |
| roic | -2.9 |
| revGr | -2.6 |
| profGr | -1.9 |
| pe | 0.0 |
| pb | 0.0 |
| 

## Combination Removal Impact

| Stock | Baseline | No Growth | No Quality | All Null | Status |
|-------|----------|-----------|------------|----------|--------|
| RELIANCE | 29 | 21 | 24 | 21 | COLLAPSED |
| TCS | 40 | 32 | 26 | 22 | COLLAPSED |
| INFY | 41 | 33 | 26 | 22 | COLLAPSED |
| HDFCBANK | 40 | 29 | 31 | 25 | COLLAPSED |
| ICICIBANK | 42 | 29 | 32 | 24 | COLLAPSED |
| ITC | NaN | NaN | NaN | NaN | RESILIENT |
| SBIN | 37 | 25 | 29 | 23 | COLLAPSED |
| KOTAKBANK | 41 | 29 | 31 | 24 | COLLAPSED |
| LT | 33 | 22 | 25 | 19 | COLLAPSED |
| HINDUNILVR | NaN | NaN | NaN | NaN | RESILIENT |
| BHARTIARTL | 35 | 22 | 30 | 24 | COLLAPSED |

## Verdict
⚠️ 9 stocks collapsed when all data removed — scores fell below 30.

**Confidence Behavior:** When critical fields (ROE, ROIC) are missing, the confidence engine caps at Medium (2 missing) or Low (3+ missing). This is verified behavior from the 75 passing tests.
