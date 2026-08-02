# Repository Reconciliation: Main Health Gates

Audit date: 2026-06-14
Baseline: `origin/main` / `c26e13bb3ae9ecc461afaa3d106029d4f9a464b4`

## Gate Results

### npm run typecheck:all

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 typecheck:all
> npm run typecheck:active && npm run typecheck:providers && npm run typecheck:ingestion && npm run typecheck:repo


> prediction-engine@0.1.0 typecheck:active
> npm run typecheck:frontend && npm run typecheck:backend


> prediction-engine@0.1.0 typecheck:frontend
> tsc -p tsconfig.frontend.json --noEmit


> prediction-engine@0.1.0 typecheck:backend
> tsc -p tsconfig.backend.json --noEmit


> prediction-engine@0.1.0 typecheck:providers
> tsc -p tsconfig.providers.json --noEmit


> prediction-engine@0.1.0 typecheck:ingestion
> tsc -p tsconfig.ingestion.json --noEmit


> prediction-engine@0.1.0 typecheck:repo
> tsc -p tsconfig.all.json --noEmit
```

### npm run lint

- Status: FAIL
- Exit code: 1

```text
> prediction-engine@0.1.0 lint
> npm run lint:active


> prediction-engine@0.1.0 lint:active
> eslint --quiet src/backend src/db src/services/auth src/services/FactorEngine.ts src/services/FeatureEngine.ts src/services/retention scripts/validate-schema-contract.ts scripts/audit-query-schema-compatibility.ts scripts/validate-data-integrity.ts scripts/validate-repository-hygiene.ts


/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/scripts/validate-schema-contract.ts
  13:39  error  Empty block statement  no-empty

/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/db/SQLiteAdapter.ts
   61:32  error  Empty block statement  no-empty
  270:34  error  Empty block statement  no-empty

/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/db/__tests__/p0-stabilization.test.ts
   95:58  error  Empty block statement  no-empty
  182:58  error  Empty block statement  no-empty
  252:58  error  Empty block statement  no-empty

✖ 6 problems (6 errors, 0 warnings)
```

### npm run test:unit

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 test:unit
> node scripts/run-vitest-ci.mjs


 RUN  v4.1.8 /Users/samvidhmehta/Desktop/PREDICTION-ENGINE

test env check... failing command... pass1... fail1... 
 Test Files  67 passed (67)
      Tests  611 passed (611)
   Start at  22:44:32
   Duration  7.44s (transform 1.82s, setup 0ms, import 6.67s, tests 2.00s, environment 47.52s)
```

### npm run test:provider-broker

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 test:provider-broker
> vitest run tests/providers src/services/providers/broker/*.test.ts src/backend/persistence/cache/cacheHierarchyEngine.test.ts


 RUN  v4.1.8 /Users/samvidhmehta/Desktop/PREDICTION-ENGINE


 Test Files  17 passed (17)
      Tests  78 passed (78)
   Start at  22:44:40
   Duration  2.17s (transform 687ms, setup 0ms, import 1.35s, tests 182ms, environment 14.56s)
```

### npm run validate:schema

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 validate:schema
> tsx scripts/validate-schema-contract.ts

=== Schema Contract Validation (Isolated) ===

Using temp DB: /var/folders/fl/l0gp8hnj0jgcrrd7qpc3_p8h0000gn/T/schema-contract-1781457282704-rnkz.db

1. Table presence check for prediction_registry...
  PASS: prediction_registry exists

2. Column completeness check...
  PASS: id
  PASS: symbol
  PASS: prediction_date
  PASS: ranking_score
  PASS: classification
  PASS: confidence_score
  PASS: confidence_level
  PASS: quality_score
  PASS: growth_score
  PASS: value_score
  PASS: momentum_score
  PASS: risk_score
  PASS: sector_score
  PASS: price_at_prediction
  PASS: benchmark_level
  PASS: prediction_horizon
  PASS: validation_status
  PASS: validated_at
  PASS: future_return
  PASS: benchmark_return
  PASS: alpha
  PASS: created_at
  PASS: created_by

3. UNIQUE constraint validation...
  PASS: UNIQUE constraint on (symbol, prediction_date, prediction_horizon) confirmed

=== Validation Complete ===
Errors: 0
PASS: Schema contract validation passed (isolated)
```

### npm run validate:data-integrity

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 validate:data-integrity
> tsx scripts/validate-data-integrity.ts

=== Data Integrity Validation ===


=== Data Integrity Complete ===
Critical errors: 0
Warnings: 0
PASS: No critical data integrity violations
```

### npm run validate:hygiene

- Status: PASS
- Exit code: 0

```text
> prediction-engine@0.1.0 validate:hygiene
> tsx scripts/validate-repository-hygiene.ts

=== Repository Hygiene Scan ===


=== Hygiene Scan Complete ===
Errors (secrets): 0
Warnings (hazards): 0
PASS: No secrets detected
```

