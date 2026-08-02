# Local Matrix Verification

| Command | Exit Code | Result | Failure |
|---------|-----------|--------|---------|
| `npm ci` | 0 | PASS | None |
| `npm run test:smoke` | 0 | PASS | None |
| `npm run test:release-gate` | 0 | PASS | None |
| `npm run lint` | 0 | PASS | None |
| `npm run typecheck:frontend` | 0 | PASS | None |
| `npm run typecheck:backend` | 0 | PASS | None |
| `npm run typecheck:all` | 0 | PASS | None |
| `npm run test:unit` | 0 | PASS | None |
| `npm run test:integration:sqlite` | 0 | PASS | None |
| `DATABASE_URL=... npm run test:integration:postgres:ci` | 0 | PASS | None |
| `npm run validate:schema` | 0 | PASS | None |
| `npm run validate:query-schema` | 0 | PASS | None |
| `npm run validate:distributions` | 0 | PASS | None |
| `npm run validate:data-integrity` | 0 | PASS | None |
| `npm run validate:hygiene` | 0 | PASS | None |
| `npm run build:vercel` | 0 | PASS | None |
| `npm run build:backend` | 0 | PASS | None |
| `npm run compile:backend` | 0 | PASS | None |
| `npm audit --omit=dev --audit-level=high` | 0 | PASS | None |
| `REQUIRE_FULL_RELEASE_GATE=true ... npm run release:gate` | 0 | PASS | None |
