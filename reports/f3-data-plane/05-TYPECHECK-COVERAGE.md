# F3 — TYPECHECK COVERAGE REPORT

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## Current Typecheck Status

| Command | Status | 
|---------|--------|
| `tsc --noEmit` (default) | ✅ 0 errors |
| `tsc -p tsconfig.all.json` (src/ only) | ✅ 0 errors |
| `tsc -p tsconfig.all.json` (scripts/) | ⚠️ 127 errors (pre-existing script bugs) |
| `tsc -p tsconfig.frontend.json` | ✅ 0 errors |
| `tsc -p tsconfig.backend.json` | ✅ 0 errors |
| `npm run typecheck:repo` (new) | ✅ Newly enforced as part of `typecheck:all` |
| `npm run typecheck:providers` | ✅ 0 errors — rerun for F3.1A |
| `npm run typecheck:ingestion` | ✅ 0 errors — rerun for F3.1A |
| `npm run typecheck:repo` | ✅ 0 errors — rerun for F3.1A |

## F3.1A CI Additions

CI now runs provider, ingestion, and repo typechecks explicitly, in addition to the existing frontend/backend checks. A new provider broker test job runs deterministic broker tests with a Redis service container and secret-hygiene validation.

Local verification on 2026-06-13:

| Command | Result |
|---------|--------|
| `npm run test:provider-broker` | ✅ 14 test files, 58 tests |
| `npm run validate:broker-secret-hygiene` | ✅ Passed |
| `npm run typecheck:providers && npm run typecheck:ingestion && npm run typecheck:repo` | ✅ Passed |

GitHub workflow IDs and Docker Smoke ID are pending post-push because this workspace has no authenticated GitHub Actions access.

## TypeScript Exclusions

The following exclusions exist in `tsconfig.json` (default) and `tsconfig.all.json` (repo-wide).

### Files excluded from default tsconfig.json

| Path | Reason | Owner | Removal Condition | Runtime-Reachable? |
|------|--------|-------|-------------------|---------------------|
| `src/components/HealthometerWidget.jsx` | JSX — not compiled | Frontend | Remove when converted to TSX | Yes (UI) |
| `src/components/MarketHydrator.jsx` | JSX — not compiled | Frontend | Remove when converted to TSX | Yes (UI) |
| `src/views/PracticeTerminal.jsx` | JSX — not compiled | Frontend | Remove when converted to TSX | Yes (UI) |
| `src/scripts/calibrate.ts` | Script — legacy | Backend | Fix type errors | No (CLI) |
| `src/scripts/calibrate_v2.ts` | Script — legacy | Backend | Fix type errors | No (CLI) |
| `src/scripts/run-explainability-pipeline.ts` | Script — legacy | Backend | Fix type errors | No (CLI) |
| `src/intelligence` | Directory — excluded from default | Backend | Fix when type errors resolved | Partial |
| `src/components/intelligence/ResponsiveUIScalingLayer.tsx` | TSX — type errors | Frontend | Fix type errors | Yes (UI) |

### Additional exclusions in tsconfig.all.json

`tsconfig.all.json` extends exclusions with `**/*.bak.ts` and `**/*.deprecated.ts` (pattern-only, no existing files).

### Exclusions in tsconfig.frontend.json

`tsconfig.frontend.json` excludes all backend, script, and data-plane directories. This is correct — the frontend project should only compile frontend code.

## Key Findings

1. **src/scripts/ has 127 type errors** in `tsconfig.all.json` — all pre-existing bugs in standalone scripts (`roa` missing from types, undeclared variables in `rc-upstox-001.ts`). These are **not runtime-reachable** — they're CLI-only scripts.

2. **src/intelligence/** is excluded from default `tsconfig.json` but compiled by `tsconfig.all.json`. A single remaining error in `PredictionEngineAdapter.ts` was already fixed.

3. **JSX files** excluded are legitimate — they're `.jsx` files without TypeScript compilation.

## Recommended Actions

1. Fix `roa` type mismatch in ingestion scripts (script-level issue, not runtime)
2. Convert `.jsx` files to `.tsx` progressively
3. After F3 completion, remove `src/intelligence` from default exclusions
