# Agent B — Data Leakage Purge

## Verdict: FAIL — 1 tables contain outcome/return columns outside approved outcome tables

### Leak Sources
- **prediction_registry**: Columns `future_return_7d, future_return_30d, future_return_90d, future_return_180d, future_return_365d` — Remove future_return_7d, future_return_30d, future_return_90d, future_return_180d, future_return_365d from prediction_registry or document as approved

### Approved Outcome Tables
- ✅ alpha_research_registry
- ✅ prediction_outcomes

### Policy
Only alpha_research_registry may contain actual_return. All other tables must reference predictions via JOIN.
