# Confidence Calibration V3

## Quality Score Bands
| Band | Count | % |
|---|---|---|
| Below 50% | 306 | 1% |
| 90-100% | 35,323 | 99% |
| 80-89% | 8 | 0% |
| 70-79% | 1 | 0% |
| 60-69% | 2 | 0% |

## Expected Calibration
- **High quality (80%+)** predictions should outperform low quality (<50%)
- **At 100 stocks:** bands should show monotonic relationship between confidence and accuracy
- **Current limitation:** No outcome data to validate actual calibration

## Post-Expansion Target
With 100 stocks + outcome_registry populated:
- Compute actual hit rate per confidence band
- Publish calibration curve on Trust Centre
- Verify monotonicity: higher confidence → higher accuracy
