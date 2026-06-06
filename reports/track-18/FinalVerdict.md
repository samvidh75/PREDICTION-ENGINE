# Final Verdict — TRACK-18

**Date:** 2026-06-06

## What Percentage of StockStory's Current Ranking Evidence Comes From Synthetic Data Versus Real Provider Data?

| Category | Synthetic | Real |
| --- | --- | --- |
| Calibration universe (505 companies) | 100% | 0% |
| Financial snapshots | 100% (Math.random) | 0% |
| Daily prices | 100% (random walk) | 0% |
| Feature snapshots | 100% (computed from synthetic prices) | 0% |
| Factor snapshots | 100% (computed from synthetic financials + features) | 0% |
| EngineCalibrationReport.md | 100% | 0% |
| All deliverable reports (Top20, Bottom20, etc.) | 100% | 0% |
| API production rankings (when DB is from expand-market-coverage) | 100% | 0% |

## VERDICT

**100% of StockStory's current ranking evidence is synthetic.**
**0% comes from real provider data.**

This is because:
1. The database was built by `expand-market-coverage.ts` which generates all data via Math.random()
2. The real provider infrastructure (UpstoxFundamentalsProvider, ScreenerProvider, YahooProvider) exists and functions — but has never been used to build the calibration universe
3. Every report, every ranking, every score trace, every TRACK audit — all measure engine behavior against synthetic random data

## What This Means

- **Engine architecture is validated:** The pipeline computes without crashing. All 7 engines work. Factor correlations and distributions are understood.
- **Financial accuracy is UNVALIDATED:** We do not know whether StockStory actually ranks good businesses above bad businesses in the real world.
- **Provider infrastructure is ready but unused for calibration:** The real-data path exists. It just hasn't been used for universe building.

## Path Forward

1. Write a real-data universe populator using ProviderCoordinator → MasterCompanyRegistry verified symbols
2. Build a 45-company universe from verified NIFTY 50 companies with real financials
3. Re-run calibrate.ts, TRACK-13, TRACK-14 against real data
4. Compare synthetic vs real calibration results to measure the gap
