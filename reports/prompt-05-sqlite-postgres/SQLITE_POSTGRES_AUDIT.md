# Prompt 5 — SQLite Versus Postgres Audit

## Runtime Policy

PostgreSQL is the production persistence layer. SQLite is intentionally retained for:

- local development when no `DATABASE_URL` is configured
- explicit SQLite integration tests
- isolated migration/schema tests
- historical one-off audit scripts that read local `.db` files

Production defaults remain:

```text
DB_ADAPTER=postgres
ALLOW_SQLITE_FALLBACK=false
ALLOW_SQLITE_IN_PRODUCTION=false
```

## Runtime Gate

The canonical runtime path is:

- `src/db/DatabasePolicy.ts`
- `src/db/DatabaseAdapter.ts`
- `src/db/SQLiteAdapter.ts`

Important controls:

- `NODE_ENV=test` requires explicit `DB_ADAPTER`.
- `DB_ADAPTER=postgres` with `ALLOW_SQLITE_FALLBACK=false` never silently falls back.
- `/readyz` reports actual adapter kind and readiness.
- private user persistence (`userDb`, investor state, user profile) remains PostgreSQL-only.

## Intentional SQLite Use

| Area | Purpose | Status |
| --- | --- | --- |
| `src/db/SQLiteAdapter.ts` | Local/test adapter compatibility | Intentional |
| `npm run test:integration:sqlite` | SQLite integration lane | Intentional |
| `src/__tests__/integration/sqlite-*` | SQLite migration and registry tests | Intentional |
| `tests/e2e/uiux/*` | Isolated audit fixtures | Intentional |
| `scripts/track*.cjs` direct `better-sqlite3` | Historical/offline audit executors | Not runtime |

## Postgres Required Areas

| Area | Reason |
| --- | --- |
| `investor_state` | account isolation and private user state |
| `user_profiles` | authenticated private profile persistence |
| production API server | connection pooling, operational backups, multi-user concurrency |
| scheduler-backed persistence | reliable concurrent writes and production observability |

## Existing Documentation

Primary policy:

- `docs/sqlite-fallback-policy.md`

Related integrity policy:

- `docs/data-integrity-policy.md`

## Recommendation

Keep SQLite only as an explicit local/test adapter. Do not add new production routes that require SQLite-specific SQL or direct `better-sqlite3` imports. New runtime persistence code should use `src/db/index.ts` or a PostgreSQL-only decorated `userDb` where private authenticated user data is involved.
