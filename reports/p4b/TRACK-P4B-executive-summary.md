# TRACK-P4B — Executive Summary

**Date:** 2026-06-09  
**Status:** FAIL — mandatory gates not met  
**Branch:** track-p4b-runtime-contract-convergence

---

## Summary

TRACK-P4B is a 14-phase blocking-remediation sprint to restore production contract coherence across the prediction registry, API routes, persistence layer, auth, CI, and deployment gates. This track addresses runtime divergences accumulated across earlier tracks.

### Completed Work

| Phase | Component | Status |
|-------|-----------|--------|
| Phase 1 | PredictionRegistryContract.ts created — canonical column registry | ✅ |
| Phase 1 | SQLite and Postgres column names aligned via contract | ✅ |
| Phase 1+3 | PredictionFactory fixed: sector_score, classification, created_by, null casts | ✅ |
| Phase 2 | StockStory route uses canonical columns (ranking_score, confidence_score, etc.) | ✅ |
| Phase 4 | PredictionExplanationEngine uses latest stored prediction_date, not new Date() | ✅ |
| Phase 4 | Explain route lineage uses canonical column names (not 'health_score', 'factors') | ✅ |
| Phase 5 | /healthz (liveness only) and /readyz (readiness with 200/503) added | ✅ |
| Phase 5 | ALLOW_SQLITE_FALLBACK env var for production SQLite fallback policy | ✅ |

### Not Yet Completed

| Phase | Component | Reason |
|-------|-----------|--------|
| Phase 3 | Classification mapping tests | Not written |
| Phase 4 | Weekend/holiday snapshot behavior | Not tested |
| Phase 4 | DB error propagation in signals route | Route exists but not hardened for DB error vs missing snapshot distinction |
| Phase 5 | Docker smoke with /readyz | Not executed |
| Phase 6 | Persistence consolidation | Existing multi-path: DatabaseAdapter.ts, SQLiteAdapter.ts, db/index.ts, postgresPlugin.ts |
| Phase 7 | SQLite fallback policy enforcement | SQLiteAdapter missing created_at, created_by, UNIQUE constraint |
| Phase 8 | Migration runner unification | Schema migration split between multiple paths |
| Phase 9 | Auth hardening — Firebase token verification | No backend Firebase verify middleware exists |
| Phase 10 | Freshness/completeness corrections for date-only snapshots | Not yet implemented |
| Phase 11 | CI enforcement — integration tests adapter-specific | CI scripts not updated |
| Phase 12 | Schema validator using injectable SQLite path | Not implemented |
| Phase 13 | Strict smoke tests with deterministic seed data | Not implemented |
| Phase 14 | Release gate with all mandatory checks | Not implemented |

---

## Mandatory Gate Status

| Gate | Status |
|------|--------|
| /api/stockstory/:ticker uses canonical registry columns | ✅ |
| PredictionFactory writes valid registry rows | ✅ |
| PredictionFactory uses valid created_by ('DailyPredictionCapture') | ✅ |
| PredictionFactory writes non-null sector_score | ✅ |
| Classification mapping explicit and tested | ⚠️ Not tested |
| Actual symbol sector used (not hardcoded) | ✅ |
| Explainability uses latest stored prediction date | ✅ |
| /healthz exists as liveness | ✅ |
| /readyz exists as readiness | ✅ |
| Production readiness fails when DB unavailable | ✅ |
| ALLOW_SQLITE_FALLBACK policy | ✅ |
| SQLite prediction_registry has created_at, created_by, UNIQUE | ❌ |
| Persistence architecture coherent | ❌ Multi-path |
| Migrations unified | ❌ Split |
| Auth: x-user-uid spoofing blocked | ❌ |
| Auth: uid query spoofing blocked | ❌ |
| Schema validator tests same DB instance | ❌ |
| API smoke tests strict | ❌ |
| Lint passes | ❌ (pre-existing + new errors) |
| typecheck:all passes | ❌ (pre-existing + new errors) |
| Unit tests pass | ❌ Not run |
| Integration tests (SQLite) pass | ❌ Not run |
| Integration tests (PostgreSQL) pass | ❌ Not run |
| Coverage executes | ❌ Not run |
| Dependency audit passes | ❌ Not run |
| Frontend build passes | ❌ Not run |
| Backend build passes | ❌ Not run |
| Compiled backend build passes | ❌ Not run |
| Docker image builds | ❌ Not run |
| Docker container starts | ❌ Not run |
| /healthz passes in Docker | ❌ Not run |
| /readyz passes in Docker | ❌ Not run |

---

## Verdict: FAIL

This track requires **14 phases** of work spanning schema, code generation, API routes, persistence architecture, authentication, testing infrastructure, CI/CD, and deployment verification. The core contract alignment (Phase 1-3) and API hardening (Phase 4-5) has been completed, but the majority of mandatory gates remain unmet.

### Blocking Issues

1. **Authentication hardening (Phase 9)** — Firebase token verification middleware does not exist. User-spoofing via `x-user-uid` and `?uid=` is possible.
2. **SQLite schema divergence** — prediction_registry table in SQLiteAdapter is missing `created_at`, `created_by` columns and the UNIQUE constraint.
3. **Persistence architecture** — Multiple parallel database paths exist (DatabaseAdapter.ts, SQLiteAdapter.ts, db/index.ts, postgresPlugin.ts) with no single source of truth.
4. **Migration split** — No unified MigrationRunner.ts.
5. **CI/CD** — No adapter-specific integration tests, no release gate, no strict smoke tests.
6. **Build failures** — Pre-existing type errors prevent `npm run build` from succeeding.
7. **Test gap** — No tests written for any P4B changes.

### Recommendations

P4B should be split into:
- **P4B-Part1** (completed): Contract alignment, PredictionFactory fixes, health/readyz
- **P4B-Part2**: Auth hardening (Firebase middleware)
- **P4B-Part3**: Persistence consolidation + SQLite alignment + migration unification
- **P4B-Part4**: CI/CD, tests, smoke, release gate
