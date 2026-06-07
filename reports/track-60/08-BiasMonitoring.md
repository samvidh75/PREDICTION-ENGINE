# Agent H — Bias Monitoring

## Automated Checks
1. **Look-ahead**: Verify quality_registry.data_date <= prediction_date for all predictions
2. **Survivorship**: Track universe size — flag if drops below 30
3. **Leakage**: Scan all tables for actual_return columns outside approved list
4. **Signal drift**: Flag if 365d hit rate drops below 65% (3σ threshold from historical 69.8%)

## Frequency: Daily
## Storage: bias_check_results table
## Alert: If any check FAILS, block Trust Centre publishing until resolved.
