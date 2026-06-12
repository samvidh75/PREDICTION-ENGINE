# F1 Verification Results

Initial verification should run:

```bash
npm run typecheck:backend
npm run test:unit -- src/backend/scoring/__tests__/scoreDifferentiation.integration.test.ts
npm run repair:invalid-prices -- --dry-run
npm run repair:prediction-registry -- --dry-run
npm run check:score-collapse -- --universe=nifty50
npm run pipeline:predictions -- --universe=nifty50 --dry-run
```

Results are updated after command execution in this branch.

