# USER-DB-BOUNDARY — app.postgres Removal Report

## Summary

All active runtime references to `app.postgres` have been removed.
Private persistence now exclusively uses `app.userDb`.

## Migration Table

| File | Old Path | New Path | Reason |
|------|----------|----------|--------|
| `src/backend/persistence/postgres/postgresPlugin.ts` | `app.decorate("postgres", client)` | Removed (legacy alias) | userDb is the canonical decoration |
| `src/backend/persistence/persistenceCoordinator.ts` | `app.postgres ?? null` | `app.userDb ?? null` | PersistenceCoordinator consumes userDb |
| `src/backend/persistence/migrations/migrationManager.ts` | `app.postgres` | `app.userDb` | Migration manager uses typed FastifyInstance |
| `src/backend/web/routes/userProfile.ts` | `(app as any).userDb` | `app.userDb` (typed) | Removed any-cast |
| `src/backend/web/routes/investorState.ts` | `(app as any).userDb` | `app.userDb` (typed) | Removed any-cast |
| `src/backend/web/routes/__tests__/userProfile.auth.test.ts` | Mocked `app.postgres` | Uses `app.decorate("userDb", mockDb)` | Tests use actual production plugins |
| `src/backend/web/routes/__tests__/investorState.auth.test.ts` | Mocked `app.postgres` | Uses `app.decorate("userDb", mockDb)` | Tests use actual production plugins |

## Design Rules

1. **userDb is PostgreSQL-only.** Never falls back to SQLite.
2. **Private routes return HTTP 503** (`PERSISTENCE_UNAVAILABLE`) when userDb is absent.
3. **Analytical persistence** uses app.db or the canonical dbAdapter (not userDb).
4. **No any-casts** for private persistence access.
5. **Migration manager** uses typed FastifyInstance.userDb directly.

## Verification

- `app.decorate("postgres", ...)` removed from postgresPlugin.ts
- `app.postgres ?? null` replaced with `app.userDb ?? null` in persistenceCoordinator.ts
- `app.postgres` replaced with `app.userDb` in migrationManager.ts
- Route auth tests rewritten to use actual production plugin registration
- No `(app as any).userDb` remains in production route code
