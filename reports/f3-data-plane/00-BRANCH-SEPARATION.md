# F3 — BRANCH SEPARATION RECORD

> Generated: 2026-06-13

## Problem

After Phase 0 commit `77bd6f0fa3a8581057080b43e5ff0be3c2918552`, both `track-f2-feed-learning-trust` and `track-f3-data-plane-quota-governance` pointed to the same commit, leaking F3 Phase 0 files into draft PR #18 (F2.4).

## Solution

1. **Created backup refs** (before any mutation):
   - `backup/track-f2-feed-learning-trust-contaminated-77bd6f0f` (at 77bd6f0f)
   - `backup/track-f3-data-plane-phase0-77bd6f0f` (at 77bd6f0f)

2. **Reset track-f2-feed-learning-trust** to pre-Phase 0 parent:
   - Parent: `de649080ccdccccf30d8fd3132cc78851f354bcd`
   - Commit contains only: type fixes cherry-picked from main
   - Force-pushed with lease

3. **Kept track-f3-data-plane-quota-governance** at Phase 0 commit + closure work.

## Final Commit SHAs

| Branch | Commit | Purpose |
|--------|--------|---------|
| `track-f2-feed-learning-trust` | `de649080` | F2.4 baseline — type fixes only |
| `track-f3-data-plane-quota-governance` | `173ab613` | F3.0 — Phase 0 + Screener quarantine + tests |
| `backup/track-f2-feed-learning-trust-contaminated-77bd6f0f` | `77bd6f0f` | Backup of contaminated F2 |
| `backup/track-f3-data-plane-phase0-77bd6f0f` | `77bd6f0f` | Backup of initial Phase 0 |

## Diff: F2 vs F3

```
git diff track-f2-feed-learning-trust..track-f3-data-plane-quota-governance
```
Contains only:
- `reports/f3-data-plane/*` — Phase 0 reports (5 files)
- `src/services/providers/ScreenerProvider.ts` — Quarantine stub
- `src/services/providers/ProviderCoordinator.ts` — Screener removed from runtime + cleaned comments
- `src/providers/v2/ProviderCapabilityRegistry.ts` — Screener capabilities removed
- `src/providers/v2/ProviderPriorityResolver.ts` — Screener precedence removed
- `src/providers/v2/ProviderAnalyticsEngine.ts` — Screener removed from weights/cost
- `src/providers/yfinance/ProviderFailoverConfig.ts` — Screener removed from provider list
- `tests/providers/screener-quarantine.test.ts` — Quarantine regression tests
- `package.json` — typecheck:repo added to typecheck:all
- Minor F2 base type fixes (DailyFeedResponseService, PersonalInsightsEngine)
