# P1 Mega Remaining Debt

## TypeScript

`npm run typecheck:all` still fails. The failures are concentrated in historical scripts, validation runners, provider/backfill tooling, and legacy modules that are outside the current `typecheck:frontend` and `typecheck:backend` active gates.

Representative groups:

| Group | Examples | Theme |
|-------|----------|-------|
| Historical provider scripts | `scripts/rc-upstox-001.ts`, `scripts/track-7h-portfolio-intelligence.ts` | Broken/generated script fragments and undefined symbols. |
| Legacy factor/backtest scripts | `scripts/adaptive-calibration.ts`, `scripts/backtesting-framework.ts`, `scripts/real-backtesting-framework.ts` | `roa` now required by fundamentals shape. |
| Broad DB-row consumers | `src/predictions/**`, `src/providers/**`, `src/quality/**`, `src/scripts/**` | `DatabaseAdapter.query` now returns `Record<string, unknown>` unless callers provide row generics. |
| Nullable domain inputs | `src/services/discovery/DiscoveryEngine.ts`, similar inactive surfaces | Public domain types now honestly allow nulls. |

## Audit

Production high/critical audit passes with:

`npm audit --omit=dev --audit-level=high`

Full audit still fails because the dev toolchain reports advisories through `esbuild -> vite -> vitest -> @vitest/coverage-v8`. `npm audit fix --force` would install breaking major versions, so no forced dependency upgrade was applied.

`firebase-admin` also retains moderate transitive `uuid` findings; the suggested fix is a breaking upgrade to `firebase-admin@14`.

## Data Integrity And Hygiene Warnings

The validators now fail only on critical findings, but warnings remain:

| Validator | Remaining Warnings |
|-----------|--------------------|
| `validate:data-integrity` | Demo/cache leakage wording in `src/backend/web/routes/intelligence.ts`; live-claim wording in several data freshness/explainability files. |
| `validate:hygiene` | Console output of potential secret-bearing values in provider scripts; self-referential warning strings in `validate-data-integrity.ts`. |

## Environment-Gated Verification

The following should be executed in CI or a fully provisioned environment:

| Check | Requirement |
|-------|-------------|
| PostgreSQL integration | `DATABASE_URL`, PostgreSQL service, production-like migration state. |
| Docker smoke | Docker daemon available; build image, run container, hit health/readiness endpoints. |
| Browser/accessibility flows | Playwright/browser tooling and stable app fixture data. |
| Live providers | Real provider credentials and rate-limit-safe test symbols. |

## Security Follow-Up

Real-looking provider credentials were removed from source in this branch. If any of those values were live at any point, rotate the corresponding Finnhub, IndianAPI, and Upstox credentials because they remain in repository history.
