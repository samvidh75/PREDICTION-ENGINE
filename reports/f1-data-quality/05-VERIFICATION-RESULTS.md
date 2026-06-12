# F1 Verification Results

## Baseline verification run — 2026-06-12

The original local verification run completed before the F1 v2 remediation edits:

```bash
npm run typecheck:backend
# PASS

npm run lint
# PASS

npm run test:unit -- src/backend/scoring/__tests__/scoreDifferentiation.integration.test.ts
# PASS: 2 tests

npm run repair:invalid-prices -- --dry-run
# PASS: dry-run only; found 98 invalid daily_prices rows, all zero OHLC on 2026-06-07.

npm run repair:prediction-registry -- --dry-run
# PASS: dry-run only; found 240 sentinel/domain-invalid prediction rows.

npm run pipeline:predictions -- --symbols=RELIANCE,HDFCBANK,INFY --dry-run
# PASS: dry-run only; produced differentiated partial scores from valid prices with fundamentals unavailable.

npm run check:score-collapse -- --universe=nifty50
# EXPECTED FAIL against current unrepaired database:
# latest date 2026-06-08, 94 rows, identicalRatio 0.851063829787234,
# fallbackRatio 0.6418439716312057, zero variance in multiple factors.
```

The collapse-detector failure is evidence that the baseline database still contains collapsed/template scores. It should pass only after reviewed quarantine operations and regenerated F1 lineage-aware scores are appended.

## F1 v2 remediation edits requiring hosted verification

The following changes were added after the baseline run and require CI verification on the draft pull request:

- debt-to-equity propagation from `financial_snapshots` into the score engine;
- portable mapping of `profit_growth AS earnings_growth`;
- honest `netMargin: null` handling when the portable snapshot schema does not provide net margin;
- corrected score direction for debt-to-equity, PE/PB multiples, and annualized volatility;
- registry-compatible classification labels;
- explicit `prediction_registry_quarantine` migration;
- quarantine-only invalid-price handling with no source-row deletion;
- guarded immutable-registry append path with collapse refusal;
- completeness and lineage persistence;
- expanded score differentiation regressions;
- pipeline contract regressions;
- dedicated `f1-data-quality-dry-run` GitHub Actions job.

## Required hosted checks

```bash
npm run lint
npm run typecheck:all
npm run test:unit
npm run test:integration:sqlite
npm run test:integration:postgres:ci
npm run validate:schema
npm run validate:distributions
npm run validate:data-integrity
npm run validate:hygiene
npm run build:vercel
npm run build:backend
npm run compile:backend
npm run test:coverage
npm audit --omit=dev --audit-level=high
npx playwright test
```

The draft pull request must remain unmerged until hosted CI completes and any failures are repaired.
