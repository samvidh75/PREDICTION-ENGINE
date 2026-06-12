# F1 Verification Results

Verification run on 2026-06-12:

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

The collapse detector failure is evidence that the baseline database still contains collapsed/template scores. It should pass only after repair and regenerated F1 lineage-aware scores are applied.
