# Agent C — Data Leakage Purge

## Verdict: FAIL — Data leakage found

### Leak Sources Found: 2
#### prediction_registry
- **Columns**: future_return_7d, future_return_30d, future_return_90d, future_return_180d, future_return_365d
- **Type**: DIRECT — outcome column in non-outcome table
- **Severity**: CRITICAL
- **Fix**: Remove future_return_7d, future_return_30d, future_return_90d, future_return_180d, future_return_365d from prediction_registry or add to approved list with clear documentation

#### prediction_registry
- **Columns**: alpha
- **Type**: INDIRECT — alpha may encode future information
- **Severity**: MEDIUM
- **Fix**: Ensure alpha is computed from historical data only at prediction time, not from realized outcomes

### Approved Outcome Tables
- ✅ alpha_research_registry
- ✅ prediction_outcomes

### Leakage Policy
Only these tables may contain outcome/return columns:
alpha_research_registry, prediction_outcomes

All other tables must reference predictions and outcomes via JOIN with prediction_registry.
