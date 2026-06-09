# CI Fixtures — Deterministic Test Data

## Fixture Symbol

**TESTIT** — A synthetic symbol used exclusively for CI and integration tests.

## Tables Touched

| Table | Operation | Cleanup |
|-------|-----------|---------|
| `symbols` | INSERT ON CONFLICT UPDATE | Not cleaned — reused across test runs |
| `daily_prices` | INSERT ON CONFLICT UPDATE | Not cleaned — reused across test runs |
| `financial_snapshots` | INSERT ON CONFLICT DO NOTHING | Not cleaned |
| `feature_snapshots` | INSERT ON CONFLICT DO NOTHING | Not cleaned |
| `factor_snapshots` | INSERT ON CONFLICT DO NOTHING | Not cleaned |
| `prediction_registry` | INSERT ON CONFLICT DO NOTHING | Not cleaned |
| `benchmark_observations` | INSERT ON CONFLICT DO NOTHING | Not cleaned |

## Fixed Timestamps

All fixture data uses a single fixed date: **2025-06-09**

No `NOW()`, `CURRENT_TIMESTAMP`, or date-dependent values are used.

## CI-Only Use

Seeding requires explicit opt-in via environment variable:

```
CI_FIXTURE_SEED=true
```

Without this variable, the seeder will throw an error and refuse to seed.
Production seeding is also blocked via `NODE_ENV` check.

## Rerun Behavior

All inserts use upserts (`ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`).
Re-running the seeder is safe — it will not create duplicate rows or error out.

## Cleanup Behavior

Fixtures are deliberately NOT cleaned between test runs in CI.
This allows multiple test suites to share the same fixture data without
re-seeding. Individual PostgreSQL integration tests clean their own
test rows using deterministic DELETE BY SYMBOL patterns.

If full cleanup is needed:
```sql
DELETE FROM daily_prices WHERE symbol = 'TESTIT';
DELETE FROM financial_snapshots WHERE symbol = 'TESTIT';
DELETE FROM feature_snapshots WHERE symbol = 'TESTIT';
DELETE FROM factor_snapshots WHERE symbol = 'TESTIT';
DELETE FROM prediction_registry WHERE symbol = 'TESTIT';
DELETE FROM benchmark_observations WHERE date = '2025-06-09';
DELETE FROM symbols WHERE symbol = 'TESTIT';
```

## Usage

```bash
# Seed fixtures (requires DATABASE_URL + DB_ADAPTER=postgres)
DATABASE_URL=postgresql://... DB_ADAPTER=postgres ALLOW_SQLITE_FALLBACK=false CI_FIXTURE_SEED=true npm run seed:ci
