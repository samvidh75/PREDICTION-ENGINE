# Removal Roadmap — TRACK-18

**Date:** 2026-06-06

## Synthetic Dependencies by Severity

| # | Source | Severity | Consumer Count | Production Risk | Replacement |
| --- | --- | --- | --- | --- | --- |
| 1 | expand-market-coverage.ts (full pipeline) | 🔴 CRITICAL | calibrate.ts, TRACK-13, TRACK-14, all ranking reports | 100% of calibration is synthetic | Real-data universe populator using ProviderCoordinator chain |
| 2 | generate-deliverables.ts (bounded() hash) | 🔴 CRITICAL | Top20, Bottom20, FactorAttribution, PercentileValidation | All deliverable reports are synthetic | Replace with real DB data reader (calibrate.ts already does this) |
| 3 | chartData.ts (getSyntheticChartSeries) | 🟡 MEDIUM | 3 UI components | UI display only — no ranking impact | Replace with real chart data from daily_prices |
| 4 | MockDataFetcher.ts (MOCK_COMPANIES) | 🟢 LOW | Demo/mock usage only | No production path | Keep for demo/testing; gate behind env flag |
| 5 | calibrate.ts (reads synthetic DB) | 🔴 CRITICAL | EngineCalibrationReport.md | The calibration report is synthetic-derived | Same script works with real DB — just needs real data |

## Removal Priority

### Phase 1: Create Real-Data Pipeline (NEW SCRIPT)
- Write `src/scripts/populate-real-universe.ts`
- Uses MasterCompanyRegistry verified entries (45 symbols initially)
- Calls ProviderCoordinator chain per symbol
- Handles Upstox rate limits (20 req/min)
- Computes features + factors
- Estimated: 45 symbols × 3 providers = ~10 minutes

### Phase 2: Rebuild Database From Real Data
- Run new script against fresh PostgreSQL
- Verify row counts match MasterCompanyRegistry size
- Run TRACK-13A to confirm data completeness

### Phase 3: Re-Run Calibration
- calibrate.ts now reads real data
- TRACK-13 and TRACK-14 now validate real companies
- Replace synthetic reports with real-data versions

### Phase 4: Remove Synthetic Sources (Optional)
- expand-market-coverage.ts: archive or gate behind --synthetic flag
- generate-deliverables.ts: archive or gate behind --demo flag
- chartData.ts: keep for UI placeholders during loading
- MockDataFetcher.ts: keep for tests

## Timeline Estimate

| Phase | Work | Duration |
| --- | --- | --- |
| Phase 1 | Write real-data populator | ~2 hours |
| Phase 2 | Run populator (API rate-limited) | ~10 min for 45 stocks, ~2 hrs for 500 |
| Phase 3 | Re-run calibrate + TRACK audits | ~10 min |
| Phase 4 | Archive synthetic scripts | ~30 min |
| **Total** | | **~3 hours** |

## Risk Mitigation
- Upstox rate limits (20 req/min): throttle with 3s delay between symbols
- Screener.in HTML parsing fragility: try/catch with Yahoo fallback
- Upstox ISIN requirement: only process symbols with known ISINs in MasterCompanyRegistry
