# Calibration Reality Audit — TRACK-18

**Date:** 2026-06-06

## Calibration Scripts: Real vs Synthetic

| Script | Symbol Source | Financial Source | Feature Source | Factor Source | Verdict |
| --- | --- | --- | --- | --- | --- |
| expand-market-coverage.ts | generate500Stocks() (hardcoded) | Math.random() — ALL 22 metrics | Computed from synthetic prices | Computed from synthetic financials + features | 🔴 100% SYNTHETIC |
| calibrate.ts | DB (from expand-market-coverage) | DB (from expand-market-coverage) | DB (from expand-market-coverage) | DB (from expand-market-coverage) | 🔴 100% SYNTHETIC |
| generate-deliverables.ts | MasterCompanyRegistry (real) | bounded() hash — synthetic | bounded() hash — synthetic | bounded() hash — synthetic | 🔴 100% SYNTHETIC |
| run-explainability-pipeline.ts | DB (from expand-market-coverage) | DB (from expand-market-coverage) | DB (from expand-market-coverage) | DB (from expand-market-coverage) | 🔴 100% SYNTHETIC |
| run-research-validation.ts | DB | DB | DB | DB | 🔴 100% SYNTHETIC |

## What Is Real in Calibration?

- **MasterCompanyRegistry** (src/services/data/MasterCompanyRegistry.ts): Contains ~45 real company entries with verified names, sectors, ISINs, and market caps. These are REAL.
- **generate500Stocks()**: Expands the verified registry to 500 symbols with generated names/sectors. Partially real (verified companies mixed with generated ones).
- **ProviderCoordinator**: Can fetch real data from Upstox/Screener/Yahoo — BUT IS NOT USED in calibration.

## What the Calibration Actually Measured

EngineCalibrationReport.md (dated 2026-06-04, 505 companies) measured:
- Correlation between engine scores and mathematically random input data
- Sector distributions across synthetically generated sectors
- Factor importance on a dataset where all fundamentals were random

These results are valid for **engine architecture validation** (does the pipeline compute without crashing?) but are NOT valid for **financial reality validation** (do rankings reflect real company quality?).

## VERDICT

**0% of calibration results come from real company data.** The calibration validated engine mechanics, not financial accuracy.
