# TRACK-36 AGENT 2: Schema Audit
**Generated:** 2026-06-06T19:19:22.250Z

## Migration Files (9)
- 001_create_warehouse_tables.sql
- 002_create_feature_factor_tables.sql
- 002b_create_user_profiles.sql
- 003_create_investor_state.sql
- 004_create_company_intelligence_tables.sql
- 005_add_stockstory_financial_columns.sql
- 006_add_roa_column.sql
- 007_create_master_registry.sql
- 008_create_prediction_registry.sql

## Table Verification
| Table | Status |
|-------|--------|
| symbols | ❌ NOT FOUND |
| daily_prices | ❌ NOT FOUND |
| financial_snapshots | ❌ NOT FOUND |
| feature_snapshots | ❌ NOT FOUND |
| factor_snapshots | ❌ NOT FOUND |
| prediction_registry | ❌ NOT FOUND |
| daily_prediction_snapshots | ❌ NOT FOUND |
| benchmark_observations | ❌ NOT FOUND |
| engine_attribution_results | ❌ NOT FOUND |
| statistical_validations | ❌ NOT FOUND |
| master_security_registry | ❌ NOT FOUND |
| investor_state | ❌ NOT FOUND |

## Tables Found: 0/12

## Verdict: **DB_UNREACHABLE**
