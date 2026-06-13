# F3.1A — BROKER TEST EVIDENCE

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## Local Verification

| Command | Result |
|---------|--------|
| `npm run test:provider-broker` | ✅ 14 test files, 58 tests passed |
| `npm run validate:broker-secret-hygiene` | ✅ 7 files scanned, passed |
| `npm run typecheck:providers` | ✅ 0 errors |
| `npm run typecheck:ingestion` | ✅ 0 errors |
| `npm run typecheck:repo` | ✅ 0 errors |

## Deterministic Test Files

| File | Coverage |
|------|----------|
| `tests/providers/provider-request-key.test.ts` | Parameter ordering, symbol normalization, secret-stripped debug material, non-secret hash differences. |
| `tests/providers/provider-request-broker.test.ts` | Twenty-consumer single-flight, quota charged once, ledger follower count, stale revalidation, negative cache. |
| `tests/providers/provider-error-classifier.test.ts` | Permanent 4xx no retry, transient retry, 429 Retry-After/cooldown, timeout retry, sanitized errors. |
| `tests/providers/provider-quota-policy.test.ts` | Per-minute, per-day, burst, concurrent, run-level, release, remaining budget. |
| `tests/providers/provider-broker-redis-contract.test.ts` | Namespaced Redis keys, TTL-backed quota/cooldown/negative keys, lock acquire/release, fail-closed config. |
| `tests/providers/cache-hierarchy-singleflight.test.ts` | Miss coalescing, stale revalidation coalescing, stale expiry, negative-cache expiry, reset. |

Additional module-local tests under `src/services/providers/broker/*.test.ts` and `src/backend/persistence/cache/cacheHierarchyEngine.test.ts` are included in `npm run test:provider-broker`.

## CI Wiring

`.github/workflows/ci.yml` now includes:

- explicit `npm run typecheck:providers`;
- explicit `npm run typecheck:ingestion`;
- explicit `npm run typecheck:repo`;
- `provider-broker-tests` job with Redis 7 service container;
- `npm run test:provider-broker`;
- `npm run validate:broker-secret-hygiene`.

CI broker tests use deterministic fixtures/fakes only and do not call live provider APIs.

## Workflow IDs

GitHub Actions run IDs require authenticated GitHub access after this branch is pushed. Local `gh` is not authenticated in this workspace (`gh auth login` required), so exact CI workflow IDs and Docker Smoke ID are pending post-push verification.

| Workflow | ID |
|----------|----|
| CI provider broker tests | Pending post-push |
| CI typecheck | Pending post-push |
| Docker Smoke | Pending post-push |

## Redis Contract Mode

The Redis contract test uses a real Redis client when `REDIS_URL` is set by CI. Without `REDIS_URL`, it falls back to a deterministic in-memory Redis double for local development.
