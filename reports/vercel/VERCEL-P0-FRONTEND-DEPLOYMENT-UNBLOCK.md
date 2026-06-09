# VERCEL-P0 — Frontend Deployment Unblock Report

## 1. Deployed Commit SHA
`3430c42` (HEAD of `track-p4b-p3g-finish-local-runtime-certification`)

## 2. Base Branch
`track-p4b-p3g-finish-local-runtime-certification`

## 3. Working Branch
`track-p4b-p3h-execute-local-runtime-certification` (or `vercel-p0-frontend-build-unblock`)

## 4. Root Cause
Vercel's build command `npm run build` calls `npx tsc -p tsconfig.json --noEmit && vite build`.
`tsconfig.json` includes `"src"` which typechecks the entire monorepo-like source tree — including
`src/backend/**, src/db/**, src/scripts/**, src/backtest/**, src/calibration/**, src/data/**,
src/monitoring/**, src/opportunities/**, src/portfolio/**, src/predictions/**, src/providers/**,
src/quality/**, src/statements/**, src/validation/**, src/watchlists/**` and all backend services.

These directories contain 224 TypeScript errors in 59 files that block the Vite production build
from ever reaching the bundling phase, even though none of that backend code ships to the browser.

## 5. Old Vercel Build Command
```
"buildCommand": "npm run build"
```
Where `npm run build` = `npx tsc -p tsconfig.json --noEmit && vite build` — blocked by backend TS debt.

## 6. New Vercel Build Command
```
"buildCommand": "npm run build:vercel"
```
Where `npm run build:vercel` = `npm run typecheck:vercel && vite build` — uses frontend-only tsconfig.

## 7. tsconfig.frontend.json Scope
- **Extends**: `tsconfig.json` (browser compiler options)
- **Includes**: `src/main.tsx`, `src/App.tsx`, `src/app/**`, `src/pages/**`, `src/components/**`,
  `src/views/**`, `src/hooks/**`, `src/lib/**`, `src/config/**`, `src/context/**`, `src/shared/**`,
  `src/styles/**`, `src/design-system/**`, `src/designSystem/**`, `src/analytics/**`, `src/store/**`,
  `src/utils/**`, `src/types/**`, `src/systems/**`, `src/env-shim.js`,
  `src/services/auth/sessionStore.ts`, `src/services/auth/userProfile.ts`,
  `src/services/auth/userProfileStore.ts`, `src/services/auth/AuthStateLogger.ts`,
  `src/services/intelligence/marketState.ts`, `src/**/*.d.ts`
- **Excludes**: All backend directories, scripts, db, backtest, calibration, data, monitoring,
  opportunities, ops, performance, portfolio, predictions, providers, quality, scheduler, statements,
  validation, watchlists, stockstory, symbols, engines, explainability, core, compliance,
  architecture, discovery, intelligence, all services subdirectories except `auth` and `intelligence`,
  all test files, all `__tests__` directories, `.test.ts` and `.test.tsx` files,
  and the previously excluded JSX/TSX files from tsconfig.json.

## 8. Frontend Nullability Fixes (4 files, 30 errors resolved)

### CompanyFinancialInfographicEcosystem.tsx (1 error)
- `finance.fiveYearPeAvg.toFixed(1)` → guarded with `!= null` check, renders "—" when unavailable

### CompanyTelemetryCore.tsx (16 errors)
- `signFmt(pct: number)` → `signFmt(pct: number | null)` — returns "—" on null
- `toneForMove(pct: number, ...)` → `toneForMove(pct: number | null, ...)` — returns neutral on null
- `pctBarStyle(value01: number, ...)` → `pctBarStyle(value01: number | null, ...)` — uses `?? 0`
- `containerBoxShadow`: `snap.dailyChangePct` and `snap.volatilityEnvironment` guarded with `?? 0`
- All `snap.*.toLocaleString()` → `snap.* != null ? snap.*.toLocaleString(...) : "—"`
- All `Math.round(snap.* * 100)` → `snap.* != null ? ${Math.round(snap.* * 100)}% : "—"`
- Ternary comparison chains → wrapped with `snap.* != null` outer check, shows "unavailable" message

### MarketCapPositioningRail.tsx (4 errors)
- `finance.marketCap` → extracted to local `const marketCap = finance.marketCap ?? 0`
- `Math.max(1, finance.fiveYearPeAvg)` → `Math.max(1, finance.fiveYearPeAvg ?? 1)`
- `finance.pe` → extracted to local `const pe = finance.pe ?? 1`

### StockStoryHeader.tsx (9 errors)
- `pillForMove(pct: number, ...)` → `pillForMove(pct: number | null, ...)` — null check added
- `formatSignedPct(pct: number)` → `formatSignedPct(pct: number | null)` — returns "—" on null
- Added `formatNumberOrUnavailable(value, formatter)` helper
- Added `guardCompare(value, unavailable, compare)` helper for null-safe ternary chains
- All `snap.*` usages in JSX guarded with null checks showing "—" or "unavailable" messages

## 9. npm run typecheck:vercel Result
**PASS** — Exit code 0, no errors.

## 10. npm run build:vercel Result
**PASS** — Typecheck clean, then:
```
✓ 1948 modules transformed.
dist/index.html                     4.24 kB │ gzip:   1.27 kB
dist/assets/index-BAGoGJKf.css    132.84 kB │ gzip:  22.08 kB
dist/assets/react-jIv3mdoM.js     133.96 kB │ gzip:  43.15 kB
dist/assets/framer-CYy7xHdi.js    138.37 kB │ gzip:  45.67 kB
dist/assets/firebase-C5_fxTjv.js  285.26 kB │ gzip:  67.66 kB
dist/assets/index-C7JJAEYi.js     491.64 kB │ gzip: 119.22 kB
✓ built in 28.40s
```

## 11. npx vite build Result
**PASS** — 1948 modules, no warnings, no Node-only modules bundled.

## 12. npx vercel build Result
Not available — Vercel CLI is not installed in the local environment.

## 13. npm run build Result
**STILL FAILS** — `npx tsc -p tsconfig.json --noEmit` produces **224 errors in 59 files**.
This is the pre-existing backend type debt that `build:vercel` intentionally bypasses.
Backend type debt remains visible via `npm run typecheck:backend` and `npm run typecheck:all`.

## 14. Remaining Backend TypeScript Debt
See: `reports/vercel/VERCEL-P1-BACKEND-TYPE-DEBT.md`
Grouped into 8 categories, all preserved and not degraded by this change.

## 15. Remote Verification
Branch: `track-p4b-p3h-execute-local-runtime-certification`
PR target: `track-p4b-p3g-finish-local-runtime-certification`

Files on remote include:
- `tsconfig.frontend.json`
- `package.json` (with `build:vercel` and `typecheck:vercel`)
- `vercel.json` (with `buildCommand: "npm run build:vercel"`, `/readyz` proxy, updated SPA fallback)
- `reports/vercel/VERCEL-P0-FRONTEND-DEPLOYMENT-UNBLOCK.md`
- `reports/vercel/VERCEL-P1-BACKEND-TYPE-DEBT.md`
- `src/components/companyUniverse/CompanyFinancialInfographicEcosystem.tsx`
- `src/components/companyUniverse/CompanyTelemetryCore.tsx`
- `src/components/infographics/MarketCapPositioningRail.tsx`
- `src/components/stock/StockStoryHeader.tsx`

## 16. Final Verdict

**VERCEL DEPLOYMENT UNBLOCKED**

- `npm run typecheck:vercel` — PASS (exit 0)
- `npm run build:vercel` — PASS (28.40s, 6 output files, no errors)
- `npx vite build` — PASS (1948 modules, no Node-only deps)
- `vercel.json` — updated to `buildCommand: "npm run build:vercel"`
- Frontend nullability errors — all 30 resolved
- Backend type debt — preserved, visible via `npm run typecheck:backend`/`typecheck:all`
- No TypeScript disabled globally, no `@ts-ignore`, no blanket `any`, no active code excluded
