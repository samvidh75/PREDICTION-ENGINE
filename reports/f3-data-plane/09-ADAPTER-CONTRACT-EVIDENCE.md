# F3.1B — ADAPTER CONTRACT EVIDENCE

> Generated: 2026-06-13
> Branch: `track-f3-provider-adapter-migration`

## Deterministic Tests

Local focused verification:

| Command | Result |
|---------|--------|
| `npm run test:provider-broker` | 17 files, 77 tests passed |
| `npm run typecheck:frontend` | passed |
| `npm run typecheck:backend` | passed |
| `npm run typecheck:providers` | passed |
| `npm run typecheck:ingestion` | passed |
| `npm run typecheck:repo` | passed |
| `npm run lint` | passed |
| `npm run validate:broker-secret-hygiene` | passed |

## New Contract Coverage

| Area | Test file | Evidence |
|------|-----------|----------|
| Provider adapter contracts | `tests/providers/live-provider-adapter-contract.test.ts` | missing-key blocking, no synthetic OHLC, Upstox partial success, month ends, Yahoo single-flight, Google News cache/negative cache |
| Call amplification | `tests/providers/call-amplification.test.ts` | twenty fields produce one provider bundle fetch |
| Inbound rate limiting | `tests/providers/rate-limiter.test.ts` | query variants share counters, route-family limits, 429 `Retry-After` |
| Broker run metadata | `src/services/providers/broker/ProviderRequestBroker.test.ts` | run ID recorded without becoming request-key material |

## Determinism

All added tests use fake providers, mocked `fetch`, in-memory broker stores, or in-memory rate-limit stores. No live provider APIs are called.

## Remaining Gate

Before marking the draft PR ready, run the full verification gate:

- all typechecks;
- lint;
- unit tests;
- provider contract tests;
- SQLite integration;
- PostgreSQL integration;
- schema validation;
- data-integrity validation;
- hygiene validation;
- frontend build;
- backend build;
- Docker Smoke.
