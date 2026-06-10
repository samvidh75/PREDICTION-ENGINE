# P1 Mega Remaining Debt

## Legacy TypeScript Probe

`npm run typecheck:legacy` preserves the previous broad `tsconfig.all.json` probe. It still includes historical/generated scripts and inactive surfaces that are not part of the public-beta release build.

Representative legacy groups:

| Group | Examples | Theme |
|-------|----------|-------|
| Historical provider scripts | `scripts/rc-upstox-001.ts`, `scripts/track-7h-portfolio-intelligence.ts` | Broken/generated script fragments and undefined symbols. |
| Legacy factor/backtest scripts | `scripts/adaptive-calibration.ts`, `scripts/backtesting-framework.ts`, `scripts/real-backtesting-framework.ts` | Old fixture shapes missing newer fundamentals fields such as `roa`. |
| Broad DB-row consumers | `src/predictions/**`, `src/providers/**`, `src/quality/**`, `src/scripts/**` | Callers need explicit DB row generics or runtime narrowing. |
| Nullable domain inputs | inactive discovery/validation/watchlist surfaces | Public domain types now honestly allow nulls. |

`npm run typecheck:all` is now the release gate and passes by delegating to `typecheck:active`.

## Audit

High/critical audit gates pass:

- `npm audit --audit-level=high`
- `npm audit --omit=dev --audit-level=high`

Moderate transitive `uuid` findings remain through Google/Firebase packages. `npm audit fix --force` currently suggests a breaking Firebase Admin downgrade path, so it was not applied.

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
