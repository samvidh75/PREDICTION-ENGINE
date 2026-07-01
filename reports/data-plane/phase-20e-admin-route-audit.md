# Phase 20E — Admin Route Audit

> **Internal audit document.** Not for public distribution.
> Audit date: 2026-07-01

## Audit Objective

Verify that no admin/internal data-plane route is exposed to public users,
and that existing operational endpoints do not leak provider/quota/cache wording.

## Existing Operational Endpoints

| Endpoint    | Purpose                        | Exposes Internal Wording? | Notes                              |
|-------------|--------------------------------|---------------------------|------------------------------------|
| `/metrics`  | System metrics (uptime, reqs)  | ❌ No                     | Returns uptime, req count, db      |
| `/healthz`  | Liveness check                 | ❌ No                     | Returns `{ok, status, db}`         |
| `/readyz`   | Readiness check                | ❌ No                     | Returns `{ok, status, database}`   |
| `/version`  | Build version info             | ❌ No                     | Returns version, env               |

## Admin Data-Plane Code

All data-plane admin code resides in `src/data-plane/admin/` and is consumed
exclusively by CLI scripts in `scripts/data-plane/`. **None of it is exposed
as a Fastify route.**

| Module                        | Purpose                                  |
|-------------------------------|------------------------------------------|
| `dataPlaneHealthContracts.ts` | Types for health reporting               |
| `dataPlaneHealthBuilder.ts`   | Assembles health report from subsystems  |
| `quotaReportGenerator.ts`     | Generates quota usage report             |
| `routeFallbackConfig.ts`      | Route → snapshot dependency mapping      |
| `routeReadinessMatrix.ts`     | Route readiness matrix builder           |
| `providerCallSavingsReport.ts`| Provider call savings reporter           |
| `snapshotReadiness.ts`        | Per-snapshot readiness checker           |

## CLI Scripts (admin-only, no web route)

| Script                                | Purpose                          |
|---------------------------------------|----------------------------------|
| `scripts/data-plane/run-health-report.mjs` | Health report (stdout)      |
| `scripts/data-plane/run-quota-report.ts`   | Quota report (stdout)       |
| `scripts/data-plane/run-data-plane-cycle.ts` | Full cycle orchestration   |
| `scripts/data-plane/run-precompute-cycle.ts` | Precompute only            |
| `scripts/data-plane/run-scheduled-eod-cycle.ts` | EOD refresh only          |
| `scripts/data-plane/run-cache-cleanup.ts` | Cache cleanup                  |

## Security Assessment

| Criterion                                    | Status |
|----------------------------------------------|--------|
| No admin data-plane route exposed publicly   | ✅     |
| No provider/quota/cache wording in public UI | ✅     |
| Operational endpoints return safe copy       | ✅     |
| Error messages sanitized (≥500 = generic)    | ✅     |
| Admin code cannot be accessed without CLI    | ✅     |

## Recommendation

The current architecture is **secure by design**: admin data-plane code lives in TypeScript
modules that are consumed by CLI scripts and never registered as Fastify routes.
No changes needed.
