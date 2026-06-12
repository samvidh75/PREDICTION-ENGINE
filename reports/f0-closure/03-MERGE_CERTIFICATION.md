# F0 Merge Certification

The F0 closure release has been merged to `main` through release PR #9.

## Delivered scope

- URL-backed StockStory horizon selection for 7, 30, 90, 180, and 365 days.
- Horizon propagation to StockStory and explanation endpoints.
- Honest `Data unavailable` rendering for absent exchange metadata and analytical inputs.
- Trust Centre regression tests.
- Authenticated alert integration tests.
- Playwright browser journeys.
- GitHub Actions CI and Docker Smoke verification.
- Production lockfile refresh for `@grpc/grpc-js` to version `1.9.16`.

## Hosted verification

The merged release passed:

- `npm ci`
- `npm audit --omit=dev --audit-level=high`
- lint
- typecheck
- unit tests
- SQLite integration tests
- PostgreSQL integration tests
- schema validation
- distribution validation
- data-integrity and hygiene validation
- frontend build
- backend build
- backend compilation
- coverage
- Playwright browser journeys
- Docker Smoke image build, startup, liveness, readiness, and strict API smoke checks

## Remaining external verification

Railway deployment health was not independently verified from the repository connector session. Track that as a separate deployment-validation task before declaring production deployment certification complete.
