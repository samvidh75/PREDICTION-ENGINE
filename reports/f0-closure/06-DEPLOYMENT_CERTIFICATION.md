# Deployment Certification

Generated: 2026-06-11

## Local Acceptance Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | Passed | npm reported 7 audit findings: 6 moderate, 1 high. |
| `npm run lint` | Passed | Active lint scope passed. |
| `npm run typecheck` | Passed | Frontend and backend TypeScript passed. |
| `npm run test:unit` | Passed | 28 files, 256 tests. |
| `npm run test:integration:sqlite` | Passed | SQLite integration command exited 0. |
| `npm run test:integration:postgres:ci` | Passed | Command exited 0 in this environment. PostgreSQL-specific tests skip when `DATABASE_URL` is unavailable. |
| `npm run build:all` | Passed | Frontend and backend build passed. Vite emitted a chunk-size warning. |
| `npm run smoke:api` | Failed | Local backend started, but PostgreSQL was unavailable; strict smoke passed 8/14 and failed readiness plus seeded `TESTIT` contracts. |
| `npm run test:e2e:playwright:ci` | Passed | 6 browser journeys. |

## API Smoke Detail

The local backend was started on `127.0.0.1:4001`.

Passing checks:

- `/healthz`
- `/api/predictions/signals?limit=5`
- empty portfolio intelligence
- unauthenticated `/api/user/profile`
- unauthenticated `/api/investor-state`
- unauthenticated `/api/watchlists`
- invalid method handling
- malformed JSON handling

Failing checks:

- `/readyz` returned 503 because PostgreSQL was unavailable.
- `/api/stockstory/TESTIT?horizon=30` did not satisfy the seeded fixture contract.
- `/api/stockstory/UNKNOWNTEST?horizon=30` did not satisfy the expected unknown-symbol contract under the unavailable data state.
- `/api/predictions/explain/TESTIT` did not satisfy the seeded fixture contract.
- `/api/intelligence/company/TESTIT` did not satisfy the seeded fixture contract.
- `/api/plans` diagnostic returned 500.

Machine-readable smoke output is in `reports/release/api-smoke-report.json`.

## GitHub Actions

The workflow file has been updated to include the F0 closure gate, but a remote GitHub Actions run was not verified from this local workspace during this pass.

## Railway

Railway backend deployment health was not verified from this local workspace. Production `/healthz`, `/readyz`, stockstory, authenticated alert behavior, and frontend rendering checks remain blocked until deployment access/status is available and PostgreSQL-backed readiness is healthy.

## Certification Verdict

Local code, unit, build, and browser proof are green. Full deployment certification is blocked by the unavailable PostgreSQL-backed runtime and lack of verified Railway/GitHub Actions evidence.
