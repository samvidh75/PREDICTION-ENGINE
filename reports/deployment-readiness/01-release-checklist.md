# Deployment Readiness Checklist

**Date:** 2026-06-15
**Final Main SHA:** `07aa320`

---

## Summary

All release-readiness actions are complete. Main is certified and build-clean. No open PRs remain. This checklist documents the gates and assumptions for deployment.

---

## Merged PRs in This Closure Sequence

| PR | Title | Status |
|----|-------|--------|
| #23 | Fix main health gate regressions | ✅ Merged |
| #24 | Add final release certification report | ✅ Merged |
| #25 | Audit remaining open PR backlog | ✅ Merged |

---

## Final Main Gate Results (`07aa320`)

| # | Gate | Result | Detail |
|---|------|--------|--------|
| 1 | `npm run typecheck:all` | ✅ PASS | 0 TypeScript errors across all 5 tsconfig targets |
| 2 | `npm run test:unit` | ✅ PASS | 781/781 tests pass |
| 3 | `npm run test:provider-broker` | ✅ PASS | 78/78 tests pass |
| 4 | `npm run test:integration:sqlite` | ✅ PASS | 28/28 tests pass |
| 5 | `npm run validate:schema` | ✅ PASS | 26 schema assertions validated |
| 6 | `npm run validate:data-integrity` | ✅ PASS | 0 critical errors |
| 7 | `npm run validate:hygiene` | ✅ PASS | 0 secrets detected |
| 8 | `npm run build:frontend` | ✅ PASS | Vite build ✓ in 1.10s |
| 9 | `npm run build:backend` | ✅ PASS | Backend compiles, ESM imports fixed |

**All gates pass.** No blockers remain.

---

## Open PR Count After Merge

**0** — The repository has zero open pull requests.

---

## Unresolved Blockers

**None.** All pre-existing blockers have been resolved:
- Orphaned `src/components/src/` artifact directory — documented; `.gitignore` entry added
- FinnhubProvider constructor test — made hermetic

---

## Deployment Environment Assumptions

### Node.js
- Engine constraint must be satisfied (see `package.json` `engines` field; currently `.nvmrc` specifies Node version)
- The project uses TypeScript 5.x with `tsx` for script execution

### Required Secrets / Environment Variables
The following must be set in the deployment environment (values must NOT be in the repository):

| Variable | Provider | Required |
|----------|----------|----------|
| `FINNHUB_KEY` or `FINNHUB_API_KEY` | Finnhub API | Yes for Finnhub provider |
| `INDIANAPI_KEY` | IndianAPI.in | Yes for Indian Market provider |
| `VITE_FINNHUB_API_KEY` | Finnhub (Vite) | Yes for frontend Finnhub integration |
| `YFINANCE_ENABLED` | yfinance bridge | Only if using yfinance data |
| `UPSTOX_ACCESS_TOKEN` | Upstox API | Only if using Upstox provider |
| `DATABASE_URL` | Database | Required for production persistence |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub API | Only if using `gh` CLI in CI |

### No Live Provider APIs in Tests
All provider tests mock `fetch`. The test suite can run entirely offline without any provider credentials.

### External Service Dependencies
The following services are called at runtime (not in tests):
- Finnhub.io API (`finnhub.io`)
- IndianAPI.in API (`stock.indianapi.in`)
- Yahoo Finance (via Python `yfinance` bridge)
- Upstox API (if configured)
- Google News RSS (if configured)

The deployment environment must have network access to these endpoints.

### Redis / Postgres Availability
- The codebase includes PostgreSQL integration paths (tests are skipped when PG is not configured)
- SQLite is used as the fallback persistence layer (via sql.js adapter)
- Production should verify the configured database adapter matches the deployment environment

---

## Stale PR Closure Status

| PR | Title | Status |
|----|-------|--------|
| #15 | F2.1 stock workspace | ✅ Closed (absorbed) |
| #16 | F2.2 market dashboard | ✅ Closed (absorbed) |
| #17 | F2.3 portfolio OS | ✅ Closed (absorbed) |
| #19 | F3.1A broker core | ✅ Closed (absorbed) |
| #20 | F3.1B adapter migration | ✅ Closed (absorbed) |

---

## Release Verdict

**DEPLOY_READY** ✅

| Criterion | Status |
|-----------|--------|
| All main gates pass | ✅ |
| No unresolved blockers | ✅ |
| No open PRs | ✅ |
| All absorbed PRs verified and closed | ✅ |
| No production code modified in cleanup | ✅ |
| No synthetic provider values | ✅ |
| No guessed exchange/fiscal-period/OHLC fields | ✅ |
| Missing credentials fail before outbound calls | ✅ |
| No inactive provider config resurrected | ✅ |
| No committed cache/database artifacts | ✅ |
| No live provider APIs called by tests | ✅ |
| Provider broker architecture preserved | ✅ |
| sql.js migration preserved | ✅ |
| F2/F3/F4/Track-12 work preserved | ✅ |
| Deployment assumptions documented | ✅ |

**Current main `07aa320` is ready for deployment.**
