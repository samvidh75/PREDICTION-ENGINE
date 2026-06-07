# AGENT C — Trust Centre Automation

## Design: TrustMetricsService

### Daily Computations (from prediction_registry WHERE validation_status = 'validated')

1. **Hit Rate**: validated_positive_direction / total_validated
2. **Sharpe Ratio**: mean(alpha) / std(alpha) across all validated
3. **Calibration Matrix**: actual_accuracy per confidence_level bucket
4. **Coverage**: symbols_with_predictions / total_universe
5. **Total Predictions**: COUNT(*) from prediction_registry
6. **Avg Alpha**: AVG(alpha) across validated predictions
7. **Avg Confidence**: AVG(confidence_score) across all predictions

### Output
Trust Centre page reads from /api/predictions/journal which pulls live from prediction_registry. No separate storage needed — stats are computed on read.

### Implementation
- Class: TrustMetricsService in src/predictions/TrustMetricsService.ts
- Can be added as GET /api/trust/stats endpoint for pre-computed stats
- Or computed live from existing /api/predictions/journal data (simpler, always fresh)

### Success
- ✅ All Trust Centre metrics are live — no hardcoded values
- ✅ Updates automatically as predictions are generated and validated
