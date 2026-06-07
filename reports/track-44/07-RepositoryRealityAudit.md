# TRACK-44 Agent F: Repository Production Audit
**Date:** 2026-06-06T21:17:04.665Z

## Architecture Map

- **Source files (src/)**: 762 files
  - TypeScript: 539
  - TSX: 204
  - CSS: 2
  - SQL: 9
  - Tests: 8

- **Scripts (scripts/)**: 45 files
  - Track scripts: 40
  - Agent scripts: 8
  - Temp/debug: 0

## Database State

| Table | Rows |
|-------|------|
| daily_prices | 37,140 |
| financial_snapshots | 0 |
| feature_snapshots | 35,640 |
| factor_snapshots | 35,640 |
| ranking_snapshots | 30 |
| prediction_registry | 106,920 |
| symbols | 30 |

## Provider Inventory

| Provider | Files |
|----------|-------|

## Engine Inventory
- 137 engine files

## Duplicate Files

- `healthometer.ts`: 2 occurrences
- `index.ts`: 19 occurrences
- `intelligence.ts`: 2 occurrences
- `userprofile.ts`: 2 occurrences
- `types.ts`: 6 occurrences
- `firebase.ts`: 3 occurrences
- `colours.ts`: 2 occurrences
- `shadows.ts`: 2 occurrences
- `spacing.ts`: 2 occurrences
- `typography.ts`: 3 occurrences
- `dataintegrityengine.ts`: 2 occurrences
- `authservice.ts`: 2 occurrences
- `userprofilestore.ts`: 2 occurrences
- `companydatavalidator.test.ts`: 2 occurrences
- `marketdatagateway.ts`: 2 occurrences
- `historicalprovider.ts`: 2 occurrences
- `metadataprovider.ts`: 2 occurrences
- `newsprovider.ts`: 2 occurrences
- `priceprovider.ts`: 2 occurrences
- `growthengine.ts`: 2 occurrences
- `riskengine.ts`: 2 occurrences
- `stabilityengine.ts`: 2 occurrences
- `marketstate.ts`: 2 occurrences
- `exchangeresolver.ts`: 2 occurrences
- `healthscoreengine.ts`: 2 occurrences
- `marketrefreshscheduler.ts`: 2 occurrences
- `marketstatecoordinator.ts`: 2 occurrences
- `marketsubscriptionengine.ts`: 2 occurrences
- `realtimechartcoordinator.ts`: 2 occurrences
- `realtimecoordinator.ts`: 2 occurrences
- `stockcachemanager.ts`: 2 occurrences
- `portfoliointelligenceengine.ts`: 2 occurrences
- `stockregistry.test.ts`: 2 occurrences
- `momentumengine.ts`: 2 occurrences
- `valuationengine.ts`: 2 occurrences
- `percentileengine.test.ts`: 2 occurrences
- `registryvalidation.test.ts`: 2 occurrences
- `searchrouting.test.ts`: 2 occurrences
- `stockstoryengine.test.ts`: 2 occurrences
- `companysuperpage.tsx`: 2 occurrences
- `dashboardhub.tsx`: 2 occurrences
- `landinghero.tsx`: 2 occurrences
- `predictivehologram.test.tsx`: 2 occurrences
- `searchroutetests.test.tsx`: 2 occurrences

## Data Lineage
1. Yahoo v8/chart → daily_prices (37,140 rows)
2. daily_prices → feature_snapshots (35,640 rows)
3. feature_snapshots → factor_snapshots (35,640 rows)
4. factor_snapshots → ranking_snapshots (30 rows)
5. ranking_snapshots → prediction_registry (106,920 rows)

## Provider Lineage
- **Yahoo Finance v8/chart**: Price history → daily_prices
- **Yahoo Finance v7/quote**: Fundamental metadata (PE, PB, market cap) → financial_snapshots
- **Internal computation**: Features, Factors, Rankings, Predictions

## Temp/Debug Scripts (Deletion Candidates)


**0 temp scripts** are candidates for deletion.

## Migration Status
- `db\migrations\001_create_warehouse_tables.sql`
- `db\migrations\002b_create_user_profiles.sql`
- `db\migrations\002_create_feature_factor_tables.sql`
- `db\migrations\003_create_investor_state.sql`
- `db\migrations\004_create_company_intelligence_tables.sql`
- `db\migrations\005_add_stockstory_financial_columns.sql`
- `db\migrations\006_add_roa_column.sql`
- `db\migrations\007_create_master_registry.sql`
- `db\migrations\008_create_prediction_registry.sql`

## Redundancy Estimate
- Total files: 807
- Temp/debug scripts: 0
- Duplicate filenames: 44
- **Estimated 20-40% redundancy**: MINIMAL

## Success Criterion
- Complete repo audit generated → **COMPLETE ✅**
