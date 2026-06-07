# AGENT E — Prediction Drift Monitor

## What to Detect
1. **Signal Degradation**: hit_rate trending down over 30-day rolling windows
2. **Factor Drift**: quality_factor/growth_factor distribution shifting significantly
3. **Sector Drift**: hit_rate divergence between sectors
4. **Confidence Inflation**: actual_accuracy < expected_accuracy for > 10 consecutive days

## Alert Thresholds
| Condition | Alert |
|-----------|-------|
| 30d rolling hit_rate < 40% | WARNING: Signal degradation detected |
| 365d hit_rate < 30% | CRITICAL: Long-term underperformance |
| confidence calibration gap > 20% | WARNING: Confidence miscalibrated |
| quality_factor mean shifted > 10 points | INFO: Factor distribution drift |
| sector divergence > 30% hit_rate gap | WARNING: Sector-specific drift |

## Implementation
- SQL query over prediction_registry for rolling hit rates
- Compare confidence_score vs actual alpha for calibration
- Store results in drift_monitor_registry table
- Alert via Slack/webhook if thresholds exceeded

## Design
Monitor doesn't stop the pipeline — it surfaces issues for human review. Never auto-adjust scores based on drift detection.
