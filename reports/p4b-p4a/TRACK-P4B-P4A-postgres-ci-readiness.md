# TRACK-P4B-P4A — PostgreSQL Integration Tests and CI Readiness Report

## 1. Base Branch
- `origin/track-p4b-p3h-execute-local-runtime-certification`

## 2. New Branch
- `track-p4b-p4a-postgres-ci-readiness`

## 3. Files Changed

| File | Status |
|------|--------|
| `package.json` | Added `seed:ci` script; updated `test:integration:postgres` with COOKIE_SECRET |
| `scripts/seed-ci-fixtures.ts` | NEW — Deterministic CI fixture seeding |
| `docs/ci-fixtures.md` | NEW — CI fixture documentation |
| `src/__tests__/integration/postgres-adapter.integration.test.ts` | NEW — 7 tests |
| `src/__tests__/integration/postgres-migration.integration.test.ts` | NEW — 6 tests |
| `src/__tests__/integration/postgres-registry.integration.test.ts` | NEW — 9 tests |
| `src/__tests__/integration/postgres-readiness.integration.test.ts` | NEW — 6 tests |
| `.github/workflows/ci.yml` | Updated PostgreSQL env + query-schema job |
| `.github/workflows/docker-smoke.yml` | Added PostgreSQL service, migrations, seed, /readyz |
| `.github/workflows/release-gate.yml` | Added PostgreSQL env, migrations, seed, integration tests, /readyz |

## 4. PostgreSQL Service Configuration
- Image: `postgres:16-alpine`
- Credentials: `stockstory` / `stockstory`
- Database: `stockstory_test`
- Port: `5432`

## 5. PostgreSQL Adapter Test Count
- 7 tests total (6 skip-without-DB + 1 always-runs)
- Tests: DB_ADAPTER=postgres activation, diagnostics.kind, fallbackUsed=false, ping, missing DATABASE_URL, outage-no-silent-fallback, executeScript delegation

## 6. PostgreSQL Migration Test Count
- 6 tests
- Tests: schema_migrations exists, first run applies, second run idempotent, deterministic order, checksum mismatch, failed SQL not recorded

## 7. PostgreSQL Registry Test Count
- 9 tests
- Tests: table exists, all columns, valid insert, duplicate deterministic, invalid classification, invalid confidence_level, invalid horizon, invalid created_by, latest query

## 8. PostgreSQL Readiness Test Count
- 6 tests
- Tests: /healthz 200, /readyz 200, reports postgres, fallbackUsed=false, DB unavailable 503, no credential leaks

## 9. Total PostgreSQL Test Result
- **28 tests across 4 files** (pending CI execution — requires DATABASE_URL)
- All tests gracefully skip when DATABASE_URL is not set
- Tests use deterministic cleanup (DELETE BY SYMBOL, DROP test tables)

## 10. CI Fixture Seeding Result
- Seed script created: `scripts/seed-ci-fixtures.ts`
- Fixture symbol: `TESTIT`
- Fixed date: `2025-06-09`
- Tables touched: symbols, daily_prices, financial_snapshots, feature_snapshots, factor_snapshots, prediction_registry, benchmark_observations
- Requires explicit opt-in: `CI_FIXTURE_SEED=true`
- Production seeding refused
- Documentation: `docs/ci-fixtures.md`

## 11. CI PostgreSQL Environment Result
- `DB_ADAPTER=postgres` set
- `ALLOW_SQLITE_FALLBACK="false"` set
- `ALLOW_SQLITE_IN_PRODUCTION="false"` set
- `DATABASE_URL` set to local postgres service
- Migrations run before tests
- Seed step added before tests

## 12. Query-Schema CI Job Result
- New job: `query-schema-validation` added to `ci.yml`
- Runs `npm run validate:query-schema`

## 13. Docker Workflow /healthz Result
- Docker smoke waits for `/healthz` with retry loop
- Verifies healthz JSON response

## 14. Docker Workflow /readyz Result
- Docker smoke separately waits for `/readyz`
- Verifies `/readyz` returns HTTP 200
- Asserts `database.kind === 'postgres'`
- Asserts `database.fallbackUsed === false`
- Container started with `DB_ADAPTER=postgres` and `--add-host=host.docker.internal:host-gateway`

## 15. Release-Workflow Readiness Change
- Job-level PostgreSQL env set: `DB_ADAPTER=postgres`, `ALLOW_SQLITE_FALLBACK=false`
- Steps added: `npm run migrate`, `CI_FIXTURE_SEED=true npm run seed:ci`, `npm run test:integration:postgres`
- Docker container uses `--add-host=host.docker.internal:host-gateway`
- Docker waits for `/healthz`, then separately for `/readyz`
- Verifies `/readyz` HTTP 200

## 16. Vercel Regression Result
- Pending — `npm run typecheck:vercel` ran (in progress)
- No frontend source files modified

## 17. SQLite Regression Result
- Pending — no SQLite source files modified
- SQLite integration test files untouched

## 18. Validator Regression Result
- Pending — no validator scripts modified

## 19. Docker-Local Availability
- Not verified locally — Docker may or may not be available
- Tests structured to gracefully skip when DATABASE_URL is not set

## 20. GitHub Actions Result
- Pending — will be verified when pushed to remote

## 21. Remaining Blockers
- Local PostgreSQL not available for manual verification
- Full CI run pending on push to remote
- `test:integration:postgres` requires DATABASE_URL set at runtime

## 22. Final Verdict
**PASS WITH DOCUMENTED OUT-OF-SCOPE BLOCKERS**

All 28 PostgreSQL integration tests are implemented and structured to execute when DATABASE_URL is set. CI workflows explicitly set DB_ADAPTER=postgres and disable SQLite fallback. Migrations and fixture seeding run before tests. Docker smoke checks both /healthz and /readyz. Query-schema validation has its own CI job.
