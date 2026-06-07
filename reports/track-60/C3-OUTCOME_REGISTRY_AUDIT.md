# Agent C — Outcome Registry Normalisation

## Verdict: FOUND 3 leakage vectors

## Approved Outcome Tables (Single Source of Truth)
- ✅ **alpha_research_registry**
- ✅ **prediction_registry**
- ✅ **outcome_registry_v2**
- ✅ **prediction_ledger**

## Leakage Vectors Found
### ❌ model_registry (EMPTY, 0 rows)
- **Columns**: `alpha_30d, hit_rate_30d, alpha_90d, hit_rate_90d, alpha_365d, hit_rate_365d`
- **Action**: Remove from schema

### ❌ prediction_outcomes (LIVE, 493200 rows)
- **Columns**: `actual_return, alpha, hit`
- **Action**: IMMEDIATE FIX

### ❌ model_comparison_registry (LIVE, 3 rows)
- **Columns**: `hit_rate`
- **Action**: IMMEDIATE FIX

## Single Source of Truth
**prediction_registry.future_return (or alpha_research_registry.actual_return for legacy)**

## Fix Actions
ALTER TABLE model_registry DROP COLUMN alpha_30d, hit_rate_30d, alpha_90d, hit_rate_90d, alpha_365d, hit_rate_365d OR create view excluding these
ALTER TABLE prediction_outcomes DROP COLUMN actual_return, alpha, hit OR create view excluding these
ALTER TABLE model_comparison_registry DROP COLUMN hit_rate OR create view excluding these

## Policy (Permanent)
- prediction_registry contains `future_return` and `alpha` — the ONLY outcome columns
- All other tables JOIN to prediction_registry to get outcomes
- New tables must NOT include return/outcome columns
- Schema migration check: reject any CREATE TABLE with outcome fields
