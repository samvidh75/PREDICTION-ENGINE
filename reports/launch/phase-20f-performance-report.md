# Phase 20F — Performance Sanity Report

**Date:** 2026-07-01
**Baseline commit:** `ef9623f4`

---

## Areas Assessed

### 1. Bundle Size

No new npm dependencies added in Phase 20A–F. Bundle impact is limited to:
- Audit/test files (excluded from production build)
- Report markdown files (excluded from production build)

### 2. Provider Call Reduction

Phase 20A introduced a 3-layer cache (L1 in-memory → L2 DB → L3 provider).
Phase 20B added precomputed snapshots for all research routes.

| Route | Before | After | Savings |
|---|---|---|---|
| Scanner | Provider call per row | Precomputed snapshot | ~100% reduction |
| Rankings | Price fetch per symbol | Precomputed snapshot | ~100% reduction |
| Stock Detail | 3+ provider calls | Cached EOD → snapshot | ~90% reduction |
| Watchlist | Watchlist data per refresh | Precomputed thesis snapshot | ~100% reduction |
| Alerts | Event fetch per symbol | Precomputed evidence snapshot | ~100% reduction |
| Portfolio | Provider call per holding | Precomputed thesis snapshot | ~100% reduction |

### 3. Data State Performance

`ResearchDataState` pattern ensures:
- DataEmpty renders immediately (no waiting)
- DataLoading shows skeleton (no layout shift)
- DataPartialWarning renders available data
- DataError shows cached/fallback content

### 4. Test Performance

| Suite | Files | Tests | Duration |
|---|---|---|---|
| Unit tests | 238 | 2412 | Fast |
| E2E audits | 5 | 112 | <1s combined |
| Provider amplification | 1 | 4 | <1s |

### 5. Bundle Impact Analysis

Phase 20F artifacts added:
- `tests/e2e/investor-workflow-smoke.test.ts` — 18 tests, test-only
- `tests/e2e/data-state-fallback-audit.test.ts` — audit, test-only  
- `tests/e2e/ai-readiness-audit.test.ts` — audit, test-only
- `reports/launch/` — documentation only

**Total production bundle impact: 0 bytes.**

## Verdict

**Satisfactory.** All performance concerns addressed by Phase 20A–B architecture.
Phase 20F adds only test/documentation artifacts.
