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
