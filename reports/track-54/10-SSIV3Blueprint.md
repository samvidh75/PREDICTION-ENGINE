# Agent J — SSI-V3 Research Blueprint

## Architecture
### dataLayer
Historical universe registry (100+ stocks including removed constituents), data_date verification on every join, segregated outcome table

### validationLayer
Walk-forward with annual train/test splits, out-of-sample only, sector-stratified sampling

### rankingLayer
Quality+Value composite (proven by TRACK-48), sector-specific calibration, confidence bands from historical hit rates

### reproducibility
All scripts versioned, SQLite database as single source of truth, replication guide published

## Retired (Do Not Rebuild)
- ❌ Future Health V1 (disproven)
- ❌ Quality grade A+/D comparison (disproven)
- ❌ Equal-weight factor composite (old engine beats V2)

## Retained (Build Around)
- ✅ Cheap Quality (PE<15, ROE>15) — 59% hit rate
- ✅ 365d directional signal — 69.8% hit rate
- ✅ Quality factor at 365d — 0.16 correlation
- ✅ Calibrated confidence bands

## Minimum Viable Upgrade
Add 20 stocks from NIFTY 100 to test signal robustness. Re-run walk-forward with 50 stocks. If alpha survives, expand to 100.
