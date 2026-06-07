# TRACK-25B Phase 5: Nightly Pipeline Truth

## Two Pipelines

### 1. populate-real-universe.ts
- **Entry point:** manual/cron: `tsx src/scripts/populate-real-universe.ts`
- **What it does:** Fetches financials + prices from providers, computes features + factors, writes ALL tables
- **Scheduled?** Manual execution (not cron-scheduled currently)
- **Writes:** symbols, financial_snapshots, daily_prices, feature_snapshots, factor_snapshots
- **Calls NPO?** YES — at the end for advanced stages (TTM, Derived, Quality, Confidence)
- **Status:** ✅ PRIMARY pipeline

### 2. NightlyPopulationOrchestrator
- **Entry point:** `tsx src/scripts/NightlyPopulationOrchestrator.ts`
- **What it does:** Orchestrates 10 stages (Registry → Financials → TTM → Derived → Prices → Features → Factors → Rankings → Quality → Telemetry)
- **Scheduled?** Can be cron-scheduled standalone
- **Writes:** TTM data, derived metrics, quality reports, provider health
- **Status:** ✅ SECONDARY orchestrator — called by populate-real-universe.ts

## Truth
✅ **Both are active.** populate-real-universe.ts is the PRIMARY pipeline that handles ALL data fetching and basic computation. NightlyPopulationOrchestrator is the SECONDARY orchestrator that handles advanced stages (TTM, Derived Metrics, Quality, Provider Health).

❌ **Neither is cron-scheduled** in the current codebase (no cron/crontab/scheduler config found).

⚠️ **NightlyPopulationOrchestrator standalone** would fail to get financials because it delegates prices/features to "FeatureEngine" and "FactorEngine" which are not imported in the orchestrator (stages 5-8 are marked "Delegated to...").
