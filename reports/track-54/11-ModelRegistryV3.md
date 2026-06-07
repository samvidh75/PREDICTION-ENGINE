# SSI Model Registry — V1, V2, V3

## SSI-V1 (Foundation)
- **Factors:** Quality, Growth, Value (3 factors)
- **Weights:** Equal (0.33 each)
- **Validation:** Manual inspection on 10 stocks
- **Limitations:** No risk factor, no backtest, small sample

## SSI-V2 (Current Production)
- **Factors:** Quality, Growth, Value, Momentum, Risk (5 factors)
- **Weights:** Quality 0.35, Value 0.25, Growth 0.20, Momentum 0.10, Risk 0.10
- **Validation:** 30-stock factor analysis, alpha stability test (TRACK-50)
- **Performance:** 69.8% 365d hit rate (claimed, pending outcome verification)
- **Limitations:** 30 stocks, no fundamental data integration, survivorship bias

## SSI-V3 (Proposed — Post TRACK-54)
- **Factors:** Quality + Value (Cheap Quality)
- **Fundamental Screens:** PE < 15, ROE > 15, ROCE > 12
- **Weights:** Quality 0.60, Value 0.40
- **Validation Required:**
  - 100-stock factor backtest (30d/90d/180d/365d)
  - Sector-neutral hit rate
  - Confidence calibration per decile
  - Out-of-sample testing (walk-forward)
- **Target Performance:** > 55% 365d hit rate on 100 stocks
- **Limitations:** Requires fundamental PE/ROE data expansion, outcome_registry population

## Evolution Path
| Version | Factors | Universe | Validation | Status |
|---|---|---|---|---|
| V1 | 3 | 10 | Manual | Deprecated |
| V2 | 5 | 30 | Alpha stability, sector check | Production |
| V3 | 2+CQ | 100 | Full backtest, calibration, sector-neutral | Proposed |

## Recommendation
**V3 should become production after TRACK-54 data expansion.**
V2 remains production until 100-stock validation is complete.
