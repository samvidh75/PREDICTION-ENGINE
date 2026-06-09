# TRACK-P4B — Persistence Convergence Report

**Date:** 2026-06-09  
**Status:** NOT CONVERGED — FAIL

---

## Current State: Multi-Path

| Path | File | Role |
|------|------|------|
| 1 | `src/db/DatabaseAdapter.ts` | Abstract adapter interface |
| 2 | `src/db/index.ts` | Database pool export (`pool`) |
| 3 | `src/db/SQLiteAdapter.ts` | SQLite fallback adapter |
| 4 | `src/backend/persistence/postgres/postgresPlugin.ts` | Fastify Postgres plugin |
| 5 | `src/backend/persistence/postgres/postgresClient.ts` | Direct Postgres client |
| 6 | `src/backend/persistence/persistencePlugin.ts` | Fastify persistence plugin |
| 7 | `src/backend/persistence/persistenceCoordinator.ts` | Multi-adapter coordinator |
| 8 | `src/backend/persistence/migrations/migrationManager.ts` | Migration manager (skeleton) |

## What Must Converge

One canonical persistence interface for production routes:
- `app.db.query(sql, params)` → result
- `app.db.ping()` → health
- `app.db.shutdown()` → cleanup
- `app.db.kind` → 'postgres' | 'sqlite'

If user-state tables remain Postgres-only:
- Use `app.userDb` explicitly
- Return HTTP 503 when unavailable
- No silent SQLite fallback for user-state

## What Was Not Done

- Paths not consolidated
- No single `app.db` interface wired through all routes
- SQLite still imports directly in some paths
- `ALLOW_SQLITE_FALLBACK` env var created but not enforced in adapter selection
