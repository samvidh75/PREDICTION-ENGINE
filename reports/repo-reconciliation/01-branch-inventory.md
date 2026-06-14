# 01 - Branch Inventory & Reconciliation (F0-Recon)

Date: 2026-06-14
Repo: samvidh75/PREDICTION-ENGINE
Local working tree: `/Users/samvidhmehta/Desktop/PREDICTION-ENGINE`

## 1. Default branch and HEAD

- Default branch: `main` (`refs/remotes/origin/HEAD -> origin/main`)
- Current local HEAD: `a41a2bd70f3328cdeb1e2f1648e81f704074c2b1`
- `origin/main` HEAD: `a41a2bd70f3328cdeb1e2f1648e81f704074c2b1`
- `git status --short`: working tree has 2 uncommitted modifications
  - `package-lock.json` (29 lines, +28/-1)
  - `src/backend/web/routes/company.ts` (+1/-1, local tweak: alias `roce AS roic` in a SELECT)
- No staged changes; not on a feature branch (current branch is `main`).

## 2. Branch counts

- 60 local branches
- 65 remote refs (excluding `origin/HEAD`)

The "ahead / behind" numbers are taken from `git rev-list --left-right --count origin/main...BRANCH` and mean `<commits-only-on-branch> <commits-only-on-main>`.

## 3. Full per-branch inventory

### 3a. Active / diverged (unique code on top of main, NOT in main history)

| Branch | HEAD commit | ahead / behind vs origin/main | Why it matters |
|---|---|---|---|
| `track-f4-authorized-screener-moneycontrol-ingestion` (local + remote) | d384a8b | 2 / 0 | Tip `F4: Authorized Screener.in & Moneycontrol ingestion providers` is not in main. Branched from `track-12c-production-scoring-integrity` (1d41eef). |
| `track-f5-unified-100-feature-prediction-engine` (local + remote) | b2b3543 | 1 / 0 | Tip `feat(prediction): unify scoring engines with 100+ feature registry` is not in main. Branched from main HEAD `a41a2bd7`. This is the F5-A consolidation target branch. |
| `track-12c-production-scoring-integrity` (local + remote) | 1d41eef | 0 / 1 | Tip is one commit ahead of origin/main (the Track-12c commit itself, not yet merged). |
| `origin/codex/f1-finnhub-fundamentals-ingestion` | 7555a6b | 6 / 92 | Remote head is NOT an ancestor of main. 6 unique commits ahead. Contains the only remaining diverged provider work flagged by the prompt. |
| `origin/track-12-roa-activation` | 421db37 | 247 / 56 | Old line, pre-Track-12 merge. Not the canonical track-12a. Treat as historical artifact. |
| `origin/track-22-production-engine-completion` | 0ad0907 | 247 / 80 | Old line. Contains `feat(stockstory): add confidence engine v2`, `feat(quality): add anomaly detection engine`, `feat(metrics): add derived metrics engine with validation`, `feat(providers): promote Finnhub and resolve financial fields by precedence`, `feat(population): add replay service / failure queue / checkpoint manager`. Diverged historical. |

### 3b. Absorbed (HEAD reachable from origin/main via existing merges, usually `df68aad5`)

- `track-12-local-opencode-sync` (local + remote) - 26 / 0
- `codex/track-12a-roa-quality-activation` (local + remote) - 28 / 0
- `codex/track-12b-dividend-yield-marketcap-activation` (local + remote) - 27 / 0
- `codex/f1-finnhub-fundamentals-ingestion` (local) - 0 / 0 (local tip `0bb7e14` is an ancestor of main; only the remote ref is diverged)
- `track-f2-feed-learning-trust` (local + remote) - 39 / 0
- `track-f2-market-dashboard-scanners` (remote) - 66 / 0
- `track-f2-portfolio-operating-system` (remote) - 50 / 0
- `track-f2-stock-detail-workspace` (remote) - 77 / 0
- `track-f2-refined-information-architecture` (remote) - 103 / 0
- `track-f3-data-plane-quota-governance` (local + remote) - 34 / 0 (local 8ce831d is 5 ahead of origin's 82d7ef1, but both ancestors of main)
- `track-f3-data-plane-quota-governance-certification` (remote) - 34 / 5
- `track-f3-provider-adapter-migration` (local + remote) - 29 / 0
- `track-f3-provider-request-broker` (local + remote) - 30 / 0 / 31 / 0

### 3c. Stale (deep behind main, no overlap with F4/F5 work)

- `codex/f0-alert-auth-hardening` (local + remote) - 147 / 2, 147 / 1
- `codex/f0-api-contract-audit` (local + remote) - 147 / 1
- `codex/f0-browser-test-hardening-audit` - 148 / 1
- `codex/f0-dependency-audit-fix` (local + remote) - 147 / 0
- `codex/f0-playwright-hardening` - 147 / 0
- `codex/f1-data-quality-and-score-differentiation` (local + remote) - 115 / 0
- `track-f0-closure-truth-browser` (local + remote) - 148 / 1, 147 / 0
- `track-feature-f0-truth-foundation` (local + remote) - 176 / 2
- `track-p0-mega-beta-stabilization` (local + remote) - 186 / 0
- `track-p0-production-stabilization` (local + remote) - 231 / 1
- `track-p1-mega-public-beta-hardening` (local + remote) - 184 / 0
- `track-p4b-p2-auth-hardening` - 222 / 0
- `track-p4b-p3-persistence-convergence` (local + remote) - 211 / 1
- `track-p4b-p3b-finish-persistence` - 216 / 0
- `track-p4b-p3c-wire-and-test-persistence` (local + remote) - 211 / 1, 210 / 0
- `track-p4b-p3d-close-runtime-proof-gaps` (local + remote) - 209 / 0
- `track-p4b-p3d-proof-tests-and-ci-repair` (local + remote) - 211 / 0
- `track-p4b-p3e-finish-local-runtime-certification` (local + remote) - 206 / 0
- `track-p4b-p3e-finish-local-runtime-proof` (local + remote) - 209 / 0, 206 / 2
- `track-p4b-p3f-complete-local-runtime-proof` (local + remote) - 206 / 0, 204 / 0
- `track-p4b-p3g-finalize-local-runtime-proof` (local + remote) - 205 / 0
- `track-p4b-p3g-finish-local-runtime-certification` (local + remote) - 199 / 0
- `track-p4b-p3h-execute-local-runtime-certification` (local + remote) - 198 / 0
- `track-p4b-p3h-runtime-proof-vercel-ci-foundations` (local + remote) - 199 / 5
- `track-p4b-p4a-postgres-ci-readiness` (local + remote) - 195 / 0
- `track-p4c-remaining-blockers` (local + remote) - 219 / 0
- `track-portability-p0-cross-platform-certification` - 187 / 4
- `track-portability-p1-remove-native-sqlite` - 187 / 0
- `track-portability-p2-remove-os-assumptions` - 187 / 2
- `track-portability-p3-reproducible-environment` (local + remote) - 187 / 1
- `track-portability-r1-reconcile-deliverables` (local + remote) - 187 / 7
- `track-portability-r1d-fix-executable-proof` (local + remote) - 187 / 8
- `track-portability-r2-remove-better-sqlite3` (local + remote) - 187 / 3
- `track-portability-r2b-remove-active-native-sqlite-paths` (local + remote) - 187 / 11
- `track-portability-r3-complete-and-harden-sqljs` (local + remote) - 187 / 5
- `track-portability-r3-harden-sqljs-and-certify` (local + remote) - 187 / 4
- `track-portability-r4-reconcile-sqljs-package-and-ci` (local + remote) - 187 / 6 / 7
- `track-portability-r5-fix-executable-proof` (local + remote) - 187 / 8
- `track-portability-r6-remove-remaining-native-sqlite-paths` (local + remote) - 187 / 8
- `track-release-p1-truthful-gate` (local + remote) - 187 / 2
- `track-release-r2-final-truthful-gate` - 187 / 1
- `track-release-r4-execute-truthful-gate` (local + remote) - 187 / 7
- `track-smoke-mega-strict-api-certification` (local + remote) - 177 / 0
- `track-smoke-r7-safe-migration-node22-retention-audit` (local + remote) - 178 / 0
- `track-smoke-r8-retention-authz-and-migration-cleanup` (local + remote) - 179 / 0
- `track-uiux-p0-full-app-audit` - 189 / 0
- `vercel-p0-frontend-build-unblock` - 203 / 2
- `workspace-consolidation-cleanup` (local + remote) - 218 / 0
- `f0-release` (remote) - 146 / 1
- `noop` (remote) - 148 / 2

### 3d. Backups (quarantined / pre-sync safety)

- `backup/local-main-before-origin-sync-20260612-153921` - 176 / 2
- `backup/track-f2-feed-learning-trust-contaminated-77bd6f0f` (local + remote) - 38 / 0
- `backup/track-f2-feed-learning-trust-contaminated-d6ce20e` (local + remote) - 36 / 0
- `backup/track-f3-data-plane-phase0-77bd6f0f` (local + remote) - 38 / 0
- `backup/track-f3-data-plane-quota-governance-broker-core-remote` (local + remote) - 34 / 5

### 3e. Alias-of-main (no unique code)

- `main`, `track-f5-2-live-validation-rollout`, `track-f5-unified-100-feature-prediction-engine-v2` - all 0 / 0 vs origin/main.

## 4. Confirmation against the prompt's expectations

The four F2/F3 branches called out in the prompt are confirmed absorbed:

- `track-f3-provider-request-broker` - ahead 30, behind 0. Local tip `57ba60f implemented changes` is an ancestor of main via `878e7e6 -> ... -> df68aad5 (merge of track-12-local-opencode-sync)`. No unique code.
- `track-f3-provider-adapter-migration` - ahead 29, behind 0. Local tip `4d6704b refactor: introduce request broker for provider API calls` is an ancestor of main via the same merge chain. No unique code.
- `track-f2-stock-detail-workspace` - exists only as `origin/track-f2-stock-detail-workspace`; tip `6ec0a7f test(telemetry): refuse scoring from missing source inputs` is an ancestor of main. No unique code.
- `track-f2-market-dashboard-scanners` - exists only as `origin/track-f2-market-dashboard-scanners`; tip `5a2cf14 test(dashboard): reject malformed market action envelopes` is an ancestor of main. No unique code.
- `track-f2-portfolio-operating-system` - exists only as `origin/track-f2-portfolio-operating-system`; tip `57303a9 test(playwright): assert full portfolio doctor disclosure sentence` is an ancestor of main. No unique code.

The prompt's caveat about `codex/f1-finnhub-fundamentals-ingestion` is confirmed for the remote ref: `origin/codex/f1-finnhub-fundamentals-ingestion` at 7555a6b is NOT an ancestor of main; 6 unique commits (visible above). The local `codex/f1-finnhub-fundamentals-ingestion` at 0bb7e14 IS an ancestor of main; the local divergence is already merged. The unique provider work to evaluate lives on the remote ref only.

The diverged branch's unique files vs main (sample, all paths are from `git diff --name-only origin/main origin/codex/f1-finnhub-fundamentals-ingestion`):

- `src/services/providers/IndianMarketProvider.ts` (massive change: -164 / +59 lines)
- `src/services/providers/MetadataProviderCoordinator.ts` and test
- `src/services/providers/ProviderCoordinator.ts`
- `src/services/providers/ScreenerProvider.ts`
- `src/services/providers/UpstoxFundamentalsProvider.ts`
- `src/services/providers/YahooProvider.ts` and test
- `src/services/providers/YahooFinancePriceProvider.ts`
- `src/backend/data/providers/DatabaseSnapshotProvider.ts` (5 lines changed)
- `src/backend/data/providers/types.ts` (1 line removed)
- `src/backend/data/scoring/scoreEngine.ts` (1 line removed)
- `src/backend/web/routes/dailyFeed.ts` (25 lines removed)
- `src/backend/web/routes/marketData.ts` (15 lines removed)
- `src/stockstory/engines/StabilityEngine.ts` (15 lines changed)
- `src/stockstory/engines/ValuationEngine.ts` (7 lines changed)
- `src/stockstory/__tests__/ScoringIntegrity.test.ts` (76 lines changed)
- `src/stockstory/__tests__/StockStoryEngine.test.ts` (70 lines changed)
- `src/services/telemetry/TelemetrySnapshotFactory.ts` (40 lines changed)
- `src/services/universe/MasterSymbolUniverse.ts` (21 lines changed)
- `src/views/DashboardHub.tsx` (28 lines changed)
- `src/app/PageRenderer.tsx` (154 lines changed)
- `src/app/router.ts` (65 lines changed)
- `src/backend/persistence/cache/cacheHierarchyEngine.ts` (172 lines changed)
- New files: `scripts/provider-healthcheck.ts`, `scripts/yfinance_bridge.py`, `yfinance_cache.sqlite`

These represent provider work that the remote branch is carrying but main does not have. None of this is reflected in local `main` and it should NOT be auto-merged.

## 5. Local working-tree state (recorded but not touched per prompt)

- `M package-lock.json` - minor drift, no source impact.
- `M src/backend/web/routes/company.ts` - local alias `roce AS roic` in a SELECT (1 line). Stays as-is for this audit per the "do not edit source code" rule. Documented here so it is not lost.

## 6. Output: stale vs active vs diverged vs absorbed

- Stale: every branch in section 3c (about 50 branches).
- Active on top of main: `track-f4-authorized-screener-moneycontrol-ingestion` (2 ahead), `track-f5-unified-100-feature-prediction-engine` (1 ahead), and `track-12c-production-scoring-integrity` (1 ahead).
- Diverged: `origin/codex/f1-finnhub-fundamentals-ingestion` (the only branch with code not reachable from main), and the historical `origin/track-12-roa-activation` and `origin/track-22-production-engine-completion`.
- Absorbed: every branch in section 3b (about 12 branches including the F2/F3 subtracks the prompt called out).
