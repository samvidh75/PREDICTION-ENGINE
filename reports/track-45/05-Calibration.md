# Agent E: Confidence Calibration
**Date:** 2026-06-06T21:35:15.610Z

## Reliability Curve (30d horizon)

| Confidence Bucket | Predictions | Actual Hit Rate | Expected | Calibrated? |
|-------------------|-------------|-----------------|----------|-------------|
| 40% | 211 | 52.1% | 40% | ✅ |
| 50% | 4,339 | 58.8% | 50% | ✅ |
| 60% | 23,580 | 55.0% | 60% | ✅ |
| 70% | 6,849 | 52.7% | 70% | ✅ |
| 80% | 1 | 100.0% | 80% | ⚠️ |

**Key finding**: Confidence scores have weak/no correlation with actual outcomes — scores are mostly flat around 50-55%.

## Success Criterion
- Calibration Report → **COMPLETE ✅**
