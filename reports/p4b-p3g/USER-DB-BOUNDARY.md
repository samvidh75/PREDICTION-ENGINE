# USER-DB-BOUNDARY — app.postgres Removal Report

| File | Old Path | New Path | Reason |
|------|----------|----------|--------|
| persistenceCoordinator.ts | `app.postgres ?? null` | `app.userDb ?? null` | Canonical userDb interface |
| postgresPlugin.ts | `app.decorate("postgres", client)` | Removed | Legacy alias removed |
| migrationManager.ts | `app.postgres` | `app.userDb` | Canonical userDb interface |
| fastify.d.ts | `app.postgres?` (previously present) | Only `userDb?` | Legacy type removed in P4B-P3D |
| userProfile.ts | `(app as any).userDb` | `app.userDb` | Type-safe access |
| investorState.ts | `(app as any).userDb` | `app.userDb` | Type-safe access |

## Verification

- No active runtime `app.postgres` references remain in `src/`.
- `app.userDb` is the sole PostgreSQL-only private persistence boundary.
- Private persistence never falls back to SQLite.
- Historical markdown reports may retain old references (not modified).
