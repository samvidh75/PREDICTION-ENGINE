# Repository Reconciliation: Branch Inventory

Audit date: 2026-06-14
Repository: `samvidh75/PREDICTION-ENGINE`

## Baseline

- Default branch: `origin/main`
- Default branch HEAD SHA: `c26e13bb3ae9ecc461afaa3d106029d4f9a464b4`
- Local HEAD: `main` at `c26e13bb3ae9ecc461afaa3d106029d4f9a464b4`
- Remote HEAD: `refs/remotes/origin/main`
- Required fetch command run: `git fetch origin --prune`
- Required inventory commands run: `git status --short`, `git branch -a`, `git log --oneline --decorate --graph --all -n 80`

## Clean Clone Check

The requested starting state was a clean local clone, but the working tree was already dirty before this audit wrote reports:

```text
 M package-lock.json
 M src/backend/web/routes/company.ts
?? reports/repo-reconciliation/
```

During the audit, `main` advanced from `a41a2bd70f3328cdeb1e2f1648e81f704074c2b1` to `c26e13bb3ae9ecc461afaa3d106029d4f9a464b4` via commit `c26e13bb implement changes`. This audit did not push, create PRs, close PRs, or rewrite branches.

## Open PR Branches Visible Locally

These branches were called out in the task and are visible as remote branches:

| Branch | Behind `origin/main` | Ahead of `origin/main` | Status | Evidence |
|---|---:|---:|---|---|
| `origin/track-f3-provider-request-broker` | 33 | 0 | absorbed/stale PR branch | `git cherry -v origin/main origin/track-f3-provider-request-broker` returned no unique commits. |
| `origin/track-f3-provider-adapter-migration` | 31 | 0 | absorbed/stale PR branch | `git cherry -v origin/main origin/track-f3-provider-adapter-migration` returned no unique commits. |
| `origin/track-f2-stock-detail-workspace` | 79 | 0 | absorbed/stale PR branch | `git cherry -v origin/main origin/track-f2-stock-detail-workspace` returned no unique commits. |
| `origin/track-f2-market-dashboard-scanners` | 68 | 0 | absorbed/stale PR branch | `git cherry -v origin/main origin/track-f2-market-dashboard-scanners` returned no unique commits. |
| `origin/track-f2-portfolio-operating-system` | 52 | 0 | absorbed/stale PR branch | `git cherry -v origin/main origin/track-f2-portfolio-operating-system` returned no unique commits. |
| `origin/codex/f1-finnhub-fundamentals-ingestion` | 94 | 6 | diverged/active candidate | Six unique provider/cache commits remain: IndianAPI diagnostics, yfinance fallbacks, Alpha Vantage env cleanup, invalid quote rejection, sqlite cache removal, cache ignore. |

Additional near-main remote branches with unique commits:

| Branch | Behind | Ahead | Status |
|---|---:|---:|---|
| `origin/track-12c-production-scoring-integrity` | 2 | 1 | active/diverged |
| `origin/track-f4-authorized-screener-moneycontrol-ingestion` | 2 | 2 | active/diverged |
| `origin/track-f5-unified-100-feature-prediction-engine` | 1 | 0 | absorbed/stale |

## Branch Inventory Versus `origin/main`

Counts are from `git rev-list --left-right --count origin/main...<branch>`.
`Behind` is commits reachable from `origin/main` but not the branch. `Ahead` is commits reachable from the branch but not `origin/main`.

| Branch | Behind | Ahead | Head | Status |
|---|---:|---:|---|---|
| `backup/local-main-before-origin-sync-20260612-153921` | 178 | 2 | `d33e90e7e966` | diverged/stale backup |
| `backup/track-f2-feed-learning-trust-contaminated-77bd6f0f` | 40 | 0 | `77bd6f0fa3a8` | absorbed/stale backup |
| `backup/track-f2-feed-learning-trust-contaminated-d6ce20e` | 38 | 0 | `d6ce20eff6e9` | absorbed/stale backup |
| `backup/track-f3-data-plane-phase0-77bd6f0f` | 40 | 0 | `77bd6f0fa3a8` | absorbed/stale backup |
| `backup/track-f3-data-plane-quota-governance-broker-core-remote` | 36 | 5 | `8ce831de2b17` | diverged/stale backup |
| `codex/f0-alert-auth-hardening` | 149 | 2 | `b3fc4cde0563` | diverged/stale |
| `codex/f0-api-contract-audit` | 149 | 1 | `5422c6777334` | diverged/stale |
| `codex/f0-browser-test-hardening-audit` | 150 | 1 | `085da901db05` | diverged/stale |
| `codex/f0-dependency-audit-fix` | 149 | 0 | `209a02583c7d` | absorbed/stale |
| `codex/f0-playwright-hardening` | 149 | 0 | `209a02583c7d` | absorbed/stale |
| `codex/f1-data-quality-and-score-differentiation` | 117 | 0 | `deebffda7e14` | absorbed/stale |
| `codex/f1-finnhub-fundamentals-ingestion` | 94 | 0 | `0bb7e14e5193` | absorbed/stale |
| `codex/track-12a-roa-quality-activation` | 30 | 0 | `6557a718acb1` | absorbed/stale Track-12/Track-22 |
| `codex/track-12b-dividend-yield-marketcap-activation` | 29 | 0 | `4d44975a492b` | absorbed/stale Track-12/Track-22 |
| `main` | 0 | 0 | `c26e13bb3ae9` | current/default |
| `origin/backup/track-f2-feed-learning-trust-contaminated-77bd6f0f` | 40 | 0 | `77bd6f0fa3a8` | absorbed/stale backup |
| `origin/backup/track-f2-feed-learning-trust-contaminated-d6ce20e` | 38 | 0 | `d6ce20eff6e9` | absorbed/stale backup |
| `origin/backup/track-f3-data-plane-phase0-77bd6f0f` | 40 | 0 | `77bd6f0fa3a8` | absorbed/stale backup |
| `origin/backup/track-f3-data-plane-quota-governance-broker-core-remote` | 36 | 5 | `8ce831de2b17` | diverged/stale backup |
| `origin/codex/f0-alert-auth-hardening` | 149 | 1 | `fb32ce7ed286` | diverged/stale |
| `origin/codex/f0-api-contract-audit` | 149 | 1 | `5422c6777334` | diverged/stale |
| `origin/codex/f0-dependency-audit-fix` | 149 | 0 | `209a02583c7d` | absorbed/stale |
| `origin/codex/f1-data-quality-and-score-differentiation` | 117 | 0 | `deebffda7e14` | absorbed/stale |
| `origin/codex/f1-finnhub-fundamentals-ingestion` | 94 | 6 | `7555a6bc28d9` | diverged/active candidate |
| `origin/codex/track-12a-roa-quality-activation` | 30 | 0 | `6557a718acb1` | absorbed/stale Track-12/Track-22 |
| `origin/codex/track-12b-dividend-yield-marketcap-activation` | 29 | 0 | `4d44975a492b` | absorbed/stale Track-12/Track-22 |
| `origin/f0-release` | 148 | 1 | `bbcc4fd46dd3` | diverged/stale |
| `origin/main` | 0 | 0 | `c26e13bb3ae9` | current/default |
| `origin/noop` | 150 | 2 | `94c80ce21130` | diverged/stale |
| `origin/track-12-local-opencode-sync` | 28 | 0 | `da376d0dac17` | absorbed/stale Track-12/Track-22 |
| `origin/track-12-roa-activation` | 249 | 56 | `421db37d1b6b` | diverged/stale |
| `origin/track-12c-production-scoring-integrity` | 2 | 1 | `1d41eef9c4bb` | active/diverged |
| `origin/track-22-production-engine-completion` | 249 | 80 | `0ad0907e09ba` | diverged/stale |
| `origin/track-f0-closure-truth-browser` | 149 | 0 | `209a02583c7d` | absorbed/stale |
| `origin/track-f2-feed-learning-trust` | 41 | 0 | `de649080ccdc` | absorbed/stale |
| `origin/track-f2-market-dashboard-scanners` | 68 | 0 | `5a2cf146d5f8` | absorbed/stale PR branch |
| `origin/track-f2-portfolio-operating-system` | 52 | 0 | `57303a9bf78f` | absorbed/stale PR branch |
| `origin/track-f2-refined-information-architecture` | 105 | 0 | `25e260204ef6` | absorbed/stale |
| `origin/track-f2-stock-detail-workspace` | 79 | 0 | `6ec0a7fe0189` | absorbed/stale PR branch |
| `origin/track-f3-data-plane-quota-governance` | 36 | 0 | `82d7ef145898` | absorbed/stale |
| `origin/track-f3-data-plane-quota-governance-certification` | 36 | 5 | `8ce831de2b17` | diverged/stale |
| `origin/track-f3-provider-adapter-migration` | 31 | 0 | `4d6704b4d9e1` | absorbed/stale PR branch |
| `origin/track-f3-provider-request-broker` | 33 | 0 | `878e7e65a1e6` | absorbed/stale PR branch |
| `origin/track-f4-authorized-screener-moneycontrol-ingestion` | 2 | 2 | `d384a8bf293d` | active/diverged |
| `origin/track-f5-unified-100-feature-prediction-engine` | 1 | 0 | `b2b35436c8cd` | absorbed/stale |
| `origin/track-feature-f0-truth-foundation` | 178 | 2 | `d33e90e7e966` | diverged/stale |
| `origin/track-p0-mega-beta-stabilization` | 188 | 0 | `0657fed52c77` | absorbed/stale |
| `origin/track-p0-production-stabilization` | 233 | 1 | `30e97fbc8016` | diverged/stale |
| `origin/track-p1-mega-public-beta-hardening` | 186 | 0 | `0c9c248b6865` | absorbed/stale |
| `origin/track-p4b-p3-persistence-convergence` | 213 | 1 | `c556e11bc68e` | diverged/stale |
| `origin/track-p4b-p3c-wire-and-test-persistence` | 212 | 0 | `deee2cdbdd11` | absorbed/stale |
| `origin/track-p4b-p3d-close-runtime-proof-gaps` | 211 | 0 | `da197daf17a2` | absorbed/stale |
| `origin/track-p4b-p3d-proof-tests-and-ci-repair` | 213 | 0 | `dc987f6d4ed2` | absorbed/stale |
| `origin/track-p4b-p3e-finish-local-runtime-certification` | 208 | 0 | `3ad53bc67187` | absorbed/stale |
| `origin/track-p4b-p3e-finish-local-runtime-proof` | 208 | 2 | `c97348aa5f9a` | diverged/stale |
| `origin/track-p4b-p3f-complete-local-runtime-proof` | 206 | 0 | `04559ef20b09` | absorbed/stale |
| `origin/track-p4b-p3g-finalize-local-runtime-proof` | 207 | 0 | `cb1891f4b4d8` | absorbed/stale |
| `origin/track-p4b-p3g-finish-local-runtime-certification` | 201 | 0 | `cc12c6e408b5` | absorbed/stale |
| `origin/track-p4b-p3h-execute-local-runtime-certification` | 200 | 0 | `2f87c6f471d0` | absorbed/stale |
| `origin/track-p4b-p3h-runtime-proof-vercel-ci-foundations` | 201 | 5 | `b1686f629461` | diverged/stale |
| `origin/track-p4b-p4a-postgres-ci-readiness` | 197 | 0 | `08c7fff60e1e` | absorbed/stale |
| `origin/track-p4c-remaining-blockers` | 221 | 0 | `fe1388d582d3` | absorbed/stale |
| `origin/track-portability-p3-reproducible-environment` | 189 | 1 | `fe4291a7bee8` | diverged/stale |
| `origin/track-portability-r1-reconcile-deliverables` | 189 | 7 | `cd95f1e24350` | diverged/stale |
| `origin/track-portability-r1d-fix-executable-proof` | 189 | 8 | `81d5c15bd558` | diverged/stale |
| `origin/track-portability-r2-remove-better-sqlite3` | 189 | 3 | `fecb407b2178` | diverged/stale |
| `origin/track-portability-r2b-remove-active-native-sqlite-paths` | 189 | 11 | `8143b6b89a22` | diverged/stale |
| `origin/track-portability-r3-complete-and-harden-sqljs` | 189 | 5 | `149d8dccbfb6` | diverged/stale |
| `origin/track-portability-r3-harden-sqljs-and-certify` | 189 | 4 | `59b9133ed608` | diverged/stale |
| `origin/track-portability-r4-reconcile-sqljs-package-and-ci` | 189 | 6 | `6d3660d57e03` | diverged/stale |
| `origin/track-portability-r5-fix-executable-proof` | 189 | 8 | `e3dea18bda28` | diverged/stale |
| `origin/track-portability-r6-remove-remaining-native-sqlite-paths` | 189 | 8 | `e3dea18bda28` | diverged/stale |
| `origin/track-release-p1-truthful-gate` | 189 | 2 | `99a1f0de8e34` | diverged/stale |
| `origin/track-release-r4-execute-truthful-gate` | 189 | 7 | `bcaa77b7c232` | diverged/stale |
| `origin/track-smoke-mega-strict-api-certification` | 179 | 0 | `7ad65e9b012b` | absorbed/stale |
| `origin/track-smoke-r7-safe-migration-node22-retention-audit` | 180 | 0 | `fa285ab500f9` | absorbed/stale |
| `origin/track-smoke-r8-retention-authz-and-migration-cleanup` | 181 | 0 | `748b5f0147ed` | absorbed/stale |
| `origin/workspace-consolidation-cleanup` | 220 | 0 | `3295ad1319fa` | absorbed/stale |
| `track-12-local-opencode-sync` | 28 | 0 | `da376d0dac17` | absorbed/stale Track-12/Track-22 |
| `track-12c-production-scoring-integrity` | 2 | 1 | `1d41eef9c4bb` | active/diverged |
| `track-f0-closure-truth-browser` | 150 | 1 | `09912fea2b08` | diverged/stale |
| `track-f2-feed-learning-trust` | 41 | 0 | `de649080ccdc` | absorbed/stale |
| `track-f3-data-plane-quota-governance` | 36 | 5 | `8ce831de2b17` | diverged/stale |
| `track-f3-provider-adapter-migration` | 31 | 0 | `4d6704b4d9e1` | absorbed/stale |
| `track-f3-provider-request-broker` | 32 | 0 | `57ba60f7855b` | absorbed/stale |
| `track-f4-authorized-screener-moneycontrol-ingestion` | 2 | 2 | `d384a8bf293d` | active/diverged |
| `track-f5-2-live-validation-rollout` | 2 | 0 | `a41a2bd70f33` | absorbed/stale |
| `track-f5-unified-100-feature-prediction-engine` | 1 | 0 | `b2b35436c8cd` | absorbed/stale |
| `track-f5-unified-100-feature-prediction-engine-v2` | 2 | 0 | `a41a2bd70f33` | absorbed/stale |
| `track-feature-f0-truth-foundation` | 178 | 2 | `d33e90e7e966` | diverged/stale |
| `track-p0-mega-beta-stabilization` | 188 | 0 | `0657fed52c77` | absorbed/stale |
| `track-p0-production-stabilization` | 233 | 1 | `30e97fbc8016` | diverged/stale |
| `track-p1-mega-public-beta-hardening` | 186 | 0 | `0c9c248b6865` | absorbed/stale |
| `track-p4b-p2-auth-hardening` | 224 | 0 | `b8577ee5380a` | absorbed/stale |
| `track-p4b-p3-persistence-convergence` | 213 | 1 | `c556e11bc68e` | diverged/stale |
| `track-p4b-p3b-finish-persistence` | 218 | 0 | `fd0cd5393e8d` | absorbed/stale |
| `track-p4b-p3c-wire-and-test-persistence` | 213 | 1 | `c556e11bc68e` | diverged/stale |
| `track-p4b-p3d-close-runtime-proof-gaps` | 211 | 0 | `da197daf17a2` | absorbed/stale |
| `track-p4b-p3d-proof-tests-and-ci-repair` | 213 | 0 | `dc987f6d4ed2` | absorbed/stale |
| `track-p4b-p3e-finish-local-runtime-certification` | 208 | 0 | `3ad53bc67187` | absorbed/stale |
| `track-p4b-p3e-finish-local-runtime-proof` | 211 | 0 | `da197daf17a2` | absorbed/stale |
| `track-p4b-p3f-complete-local-runtime-proof` | 208 | 0 | `3ad53bc67187` | absorbed/stale |
| `track-p4b-p3g-finalize-local-runtime-proof` | 207 | 0 | `cb1891f4b4d8` | absorbed/stale |
| `track-p4b-p3g-finish-local-runtime-certification` | 201 | 0 | `cc12c6e408b5` | absorbed/stale |
| `track-p4b-p3h-execute-local-runtime-certification` | 200 | 0 | `2f87c6f471d0` | absorbed/stale |
| `track-p4b-p3h-runtime-proof-vercel-ci-foundations` | 201 | 5 | `b1686f629461` | diverged/stale |
| `track-p4b-p4a-postgres-ci-readiness` | 197 | 0 | `08c7fff60e1e` | absorbed/stale |
| `track-p4c-remaining-blockers` | 221 | 0 | `fe1388d582d3` | absorbed/stale |
| `track-portability-p0-cross-platform-certification` | 189 | 4 | `7ae692d925cc` | diverged/stale |
| `track-portability-p1-remove-native-sqlite` | 189 | 0 | `627fcdc7edf2` | absorbed/stale |
| `track-portability-p2-remove-os-assumptions` | 189 | 2 | `270c904e1b9d` | diverged/stale |
| `track-portability-p3-reproducible-environment` | 189 | 1 | `fe4291a7bee8` | diverged/stale |
| `track-portability-r1-reconcile-deliverables` | 189 | 7 | `cd95f1e24350` | diverged/stale |
| `track-portability-r1d-fix-executable-proof` | 189 | 8 | `81d5c15bd558` | diverged/stale |
| `track-portability-r2-remove-better-sqlite3` | 189 | 3 | `fecb407b2178` | diverged/stale |
| `track-portability-r2b-remove-active-native-sqlite-paths` | 189 | 11 | `8143b6b89a22` | diverged/stale |
| `track-portability-r3-complete-and-harden-sqljs` | 189 | 5 | `149d8dccbfb6` | diverged/stale |
| `track-portability-r3-harden-sqljs-and-certify` | 189 | 4 | `59b9133ed608` | diverged/stale |
| `track-portability-r4-reconcile-sqljs-package-and-ci` | 189 | 7 | `cd95f1e24350` | diverged/stale |
| `track-portability-r5-fix-executable-proof` | 189 | 8 | `e3dea18bda28` | diverged/stale |
| `track-portability-r6-remove-remaining-native-sqlite-paths` | 189 | 8 | `e3dea18bda28` | diverged/stale |
| `track-release-p1-truthful-gate` | 189 | 2 | `99a1f0de8e34` | diverged/stale |
| `track-release-r2-final-truthful-gate` | 189 | 1 | `fe4291a7bee8` | diverged/stale |
| `track-release-r4-execute-truthful-gate` | 189 | 7 | `bcaa77b7c232` | diverged/stale |
| `track-smoke-mega-strict-api-certification` | 179 | 0 | `7ad65e9b012b` | absorbed/stale |
| `track-smoke-r7-safe-migration-node22-retention-audit` | 180 | 0 | `fa285ab500f9` | absorbed/stale |
| `track-smoke-r8-retention-authz-and-migration-cleanup` | 181 | 0 | `748b5f0147ed` | absorbed/stale |
| `track-uiux-p0-full-app-audit` | 191 | 0 | `3eb68a9bb628` | absorbed/stale |
| `vercel-p0-frontend-build-unblock` | 205 | 2 | `1925762d8ede` | diverged/stale |
| `workspace-consolidation-cleanup` | 220 | 0 | `3295ad1319fa` | absorbed/stale |

## Local-Only or Local Tracking Notes

Local branches without matching remote visible after pruning should be treated as stale/local until intentionally reviewed. Examples include `codex/f0-browser-test-hardening-audit`, `codex/f0-playwright-hardening`, `track-p4b-p2-auth-hardening`, `track-p4b-p3b-finish-persistence`, `track-portability-p0-cross-platform-certification`, `track-portability-p1-remove-native-sqlite`, `track-portability-p2-remove-os-assumptions`, `track-release-r2-final-truthful-gate`, `track-uiux-p0-full-app-audit`, and `vercel-p0-frontend-build-unblock`.

## Recommendation

Do not re-implement Track-12 scoring. The stale/absorbed PR branches should be closed or archived outside this task after human confirmation. The next branch worth reconciling for feature work is `origin/codex/f1-finnhub-fundamentals-ingestion`, because it has six unique provider/cache commits not present on `origin/main`.
