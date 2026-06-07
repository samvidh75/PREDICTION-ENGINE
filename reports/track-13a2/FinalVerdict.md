# Final Verdict — TRACK-13A.2

**Date:** 2026-06-06

## Key Questions Answered

| Q | Answer |
| --- | --- |
| Q1: Does PostgreSQL data exist on disk? | **NO.** No PostgreSQL installation, no Docker volumes, no WSL volumes, no project-local databases found. |
| Q2: Did calibrate.ts previously run? | **YES.** EngineCalibrationReport.md (2026-06-04) evaluated 505 companies with full engine pipeline. |
| Q3: Can state be reconstructed from artifacts? | **PARTIALLY.** 16 symbols have cached Upstox data. 5 have Yahoo OHLCV. But 0 have factor_snapshots. Full reconstruction impossible from artifacts alone. |
| Q4: Which tables need repopulation? | **ALL 4 core tables** (symbols, financial_snapshots, feature_snapshots, factor_snapshots). |
| Q5: Estimated rebuild? | **~3 hours** (~2,000 provider API calls, $0 cost, constrained by Upstox rate limits). |
| Q6: Fastest path? | **Fresh PostgreSQL → Migrations → Symbols from code → Provider backfill (NIFTY 50 first = 15 min, then expand)** |

## Can TRACK-13 run today after PostgreSQL installation?

**NO.** PostgreSQL installation provides the schema but not the data.
After installation: run `npm run migrate` → schema is ready. But **all 4 core tables will be empty.**
Data population requires: 
1. Insert symbols (from code — 5 min)
2. Run provider chain for each symbol (API calls — 3 hrs for 500 symbols, 15 min for NIFTY 50)
3. Compute feature_snapshots (TechnicalIndicatorEngine)
4. Compute factor_snapshots (FactorEngine)

## Minimum Viable TRACK-13 Execution

To run TRACK-13 with statistically meaningful results (50+ stocks with factor_snapshots):
1. Install PostgreSQL → run migrations → insert 50 NIFTY 50 symbols
2. Run provider backfill for these 50 symbols (~15 min of API calls)
3. Compute feature + factor snapshots (~1 min compute)
4. Execute TRACK-13A → verify 50 stocks have complete data
5. Execute TRACK-13 and TRACK-14 (sample size: 50 stocks, adequate for initial calibration)

**Verdict: Database was populated and functional on June 4, 2026 (505 companies). It has since been lost. A full rebuild is required before TRACK-13/14 can execute. Minimum rebuild: 50 stocks (NIFTY 50), ~20 minutes. Full rebuild: 500 stocks, ~3 hours.**
