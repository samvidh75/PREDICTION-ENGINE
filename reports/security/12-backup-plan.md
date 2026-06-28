# Phase 16 — Backup & Restore Plan

## Current State

The application uses PostgreSQL (Neon) with automated point-in-time recovery (PITR) provided by the Neon platform. Schema migrations are managed via idempotent SQL scripts in `src/db/migrations/`.

## Database Backup Strategy

| Item | Status | Details |
|------|--------|---------|
| Platform backup | ✅ Neon-provided | Automated PITR, 7-day retention (Neon Free/Launch plan) |
| Schema migrations | ✅ Versioned | 20+ migration files in `src/db/migrations/`, all idempotent |
| Data export | ❌ Not implemented | No automated export of user data |
| Config backup | ⚠️ Partial | `.env.prod` was committed to git (now removed from tracking) |

## Restore Procedures

### Schema Restore
```bash
# Rebuild schema from scratch (all migrations are idempotent)
npm run migrate
```

### Data Restore (Neon PITR)
```bash
# Use Neon dashboard or CLI to restore to a point in time
# Then update DATABASE_URL in .env to point to restored instance
```

## Recommendations

1. **Add nightly pg_dump** — Export to cloud storage (S3-compatible) for independent backup
2. **Document restore runbook** — Include Neon branch-based restore for schema changes
3. **Test restore quarterly** — Verify backups are restorable
4. **Backup .env manually** — Store production secrets in a password manager or vault, not in git
