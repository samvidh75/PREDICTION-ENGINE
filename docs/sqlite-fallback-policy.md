# SQLite Fallback Policy

**Version**: 1.0  
**Track**: TRACK-P4B-P3  
**Last Updated**: 2026-06-09

---

## 1. Purpose

This document defines the supported and unsupported usage of SQLite within the StockStory prediction engine. SQLite is a zero-configuration embedded database used for local development and testing. It is **not** a production persistence layer.

---

## 2. Supported Usage

SQLite is explicitly supported for:

| Use Case | Environment | Notes |
|----------|-------------|-------|
| Local development | `NODE_ENV=development` | Default when no DATABASE_URL is set |
| Unit tests | `NODE_ENV=test`, vitest | `DB_ADAPTER=sqlite` required |
| Isolated integration tests | `NODE_ENV=test` | Must use `SQLITE_DB_PATH=tmp/integration-sqlite.db` |
| Schema validation | `scripts/validate-*` | Uses temporary DB at `tmp/schema-contract-*.db` |
| Prediction registry fixture tests | `vitest` | Read/write to isolated SQLite DB |
| Basic StockStory fixture tests | `vitest` | Ranking, scoring, factor calculations |

---

## 3. Unsupported Usage

SQLite is **not certified** for:

| Use Case | Reason |
|----------|--------|
| Production persistence | No replication, no connection pooling, no backup |
| User profile persistence | Requires PostgreSQL (`userDb` only) |
| Investor state persistence | Multi-user concurrency, JSONB validation |
| Distributed concurrency | No row-level locking comparable to PostgreSQL |
| Scheduler-backed operations | No advisory locks, no reliable cron-state tracking |
| JSONB parity | SQLite stores JSON as TEXT, no indexing |
| Complete PostgreSQL feature parity | Missing: window functions, lateral joins, full UPSERT, CTE recursion |

---

## 4. Production Restrictions

SQLite may be used in production **only** when all of the following are explicitly set:

```
DB_ADAPTER=sqlite
ALLOW_SQLITE_FALLBACK=true
ALLOW_SQLITE_IN_PRODUCTION=true
```

This is an **exceptional degraded mode** — not a normal operating state.

**Default production configuration:**

```
DB_ADAPTER=postgres
ALLOW_SQLITE_FALLBACK=false
ALLOW_SQLITE_IN_PRODUCTION=false
```

When `ALLOW_SQLITE_FALLBACK=false` in production:
- PostgreSQL failure → `kind: unavailable` (no silent SQLite fallback)
- `/readyz` returns HTTP 503
- Private user routes (`userProfile`, `investorState`) return HTTP 503

---

## 5. Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `DB_ADAPTER` | `auto`, `postgres`, `sqlite` | `auto` | Requested database adapter |
| `ALLOW_SQLITE_FALLBACK` | `true`, `false` | `true` | Allow fallback when PostgreSQL unavailable |
| `ALLOW_SQLITE_IN_PRODUCTION` | `true`, `false` | `false` | Permit SQLite in production env |
| `SQLITE_DB_PATH` | File path | `data/stockstory.db` | Path to SQLite database file |
| `DATABASE_URL` | PostgreSQL URL | — | PostgreSQL connection string |

---

## 6. Readiness Behavior

### `/readyz` when SQLite is active:

```json
{
  "database": {
    "kind": "sqlite",
    "requestedAdapter": "auto",
    "fallbackUsed": true,
    "fallbackAllowed": true,
    "sqliteProductionAllowed": false,
    "ok": true,
    "detail": "PostgreSQL unavailable; fell back to SQLite"
  }
}
```

- Development: `/readyz` returns HTTP 200 with SQLite
- Test: `/readyz` returns HTTP 200 with SQLite (when `DB_ADAPTER=sqlite`)
- Production: `/readyz` returns HTTP 503 when PostgreSQL unavailable and fallback disabled

---

## 7. Test Behavior

In test environment (`NODE_ENV=test`), the adapter is **never** chosen silently.

```
# SQLite integration tests
NODE_ENV=test DB_ADAPTER=sqlite ALLOW_SQLITE_FALLBACK=true SQLITE_DB_PATH=tmp/integration-sqlite.db

# PostgreSQL integration tests
NODE_ENV=test DB_ADAPTER=postgres ALLOW_SQLITE_FALLBACK=false
```

Tests must use an **isolated** SQLite DB path. Never mutate the developer's `data/stockstory.db`.

---

## 8. Upgrade Path

If full PostgreSQL → SQLite parity is required in the future:

1. Audit all queries for PostgreSQL-specific features (CTEs, window functions, lateral joins)
2. Add SQLite-native implementations for each
3. Add JSONB emulation layer (parse/serialize TEXT)
4. Add connection-level advisory lock simulation
5. Run full integration test suite against SQLite in CI
6. Document remaining gaps explicitly

**Current recommendation**: defer full SQLite parity. PostgreSQL is the production persistence layer. SQLite is a development/test convenience.
