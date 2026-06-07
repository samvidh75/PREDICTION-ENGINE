# TRACK-18 — Calibration Data Lineage

## Q2: Exact Data Sources for Calibration Artifacts

---

### 1. `expand-market-coverage.ts` — Database Population

| Aspect | Detail |
|--------|--------|
| **Input source** | `generate500Stocks()` — real ticker list (505 stocks) |
| **Synthetic %** | **99.9%** — all OHLCV candles, financial ratios, ISINs are synthetic |
| **Real %** | **0.1%** — stock names, sectors, industries are real |
| **Output** | Populates: `symbols`, `daily_prices`, `financial_snapshots`, `feature_snapshots`, `factor_snapshots` |
| **Output consumers** | `calibrate.ts`, `calibrate_v2.ts`, `run-explainability-pipeline.ts`, `run-intelligence-validation.ts`, `generate-live-report.ts`, API routes |

**Data flow:** `Math.random()` → daily_prices → FeatureEngine → feature_snapshots → FactorEngine → factor_snapshots → API → rankings

---

### 2. `calibrate.ts` / `calibrate_v2.ts` — Engine Calibration

| Aspect | Detail |
|--------|--------|
| **Input source** | `feature_snapshots`, `factor_snapshots`, `financial_snapshots` from PostgreSQL |
| **Synthetic %** | **100%** (if seeded by `expand-market-coverage.ts`) or **0%** (if populated by `run-research-validation.ts`) |
| **Real %** | Depends on which script seeded the DB |
| **Output** | `EngineCalibrationReport.md`, `EngineCalibrationV2.md` |
| **Output consumers** | TRACK-13 calibration audit, TRACK-14 validation |

**Current state:** DB unreachable (ECONNREFUSED). Cannot determine if DB contains synthetic or real data. If `expand-market-coverage.ts` was the last script run, all calibration data is synthetic.

---

### 3. `generate-deliverables.ts` — Deliverable Reports

| Aspect | Detail |
|--------|--------|
| **Input source** | `MasterCompanyRegistry` (real tickers) + `bounded(seed)` synthetic engine inputs |
| **Synthetic %** | **100%** — ALL features, factors, financials, historical data |
| **Real %** | **0%** — only ticker symbols are real |
| **Output** | `Top20Report.md`, `Bottom20Report.md`, `FactorAttributionReport.md`, `PercentileValidationReport.md`, `ProviderAccuracyReport.md`, `ComplianceAudit.md` |
| **Output consumers** | Displayed as project reports in repository root |

**These reports are 100% fiction.** The "top 20 healthiest companies" are random. The "factor attributions" are random. The "percentile validations" are from hardcoded reference distributions, not from real data.

---

### 4. `run-research-validation.ts` — ML Research Pipeline

| Aspect | Detail |
|--------|--------|
| **Input source** | `ProviderCoordinator.getHistory()` → YahooProvider (REAL) for 7 symbols |
| **Synthetic %** | **0%** — fetches real 5-year price history from Yahoo API |
| **Real %** | **100%** — live provider data |
| **Output** | Research JSON reports (ML benchmarks, factor backtests, feature importance) |
| **Output consumers** | Research validation |

**This is the only calibration script that uses real data.** However, it only covers 7 symbols.

---

### 5. `SectorDistributionEngine.ts` — Percentile Distributions

| Aspect | Detail |
|--------|--------|
| **Input source** | Hardcoded `REFERENCE_DISTRIBUTIONS` — static object in code |
| **Synthetic %** | **0%** |
| **Real %** | **UNKNOWN** — claims "Indian market empirical reference data (2024-2025)" but is hardcoded |
| **Output** | Registered distributions in `SectorPercentileEngine` |
| **Output consumers** | StabilityEngine, QualityEngine (when `usePercentile = true`) |

---

## Lineage Summary

| Artifact | Input Source | Synthetic % | Real % | Trustworthy? |
|----------|-------------|-------------|--------|-------------|
| `EngineCalibrationReport.md` | Synthetic DB or synthetic EngineInputs | **100%** | 0% | **NO** |
| `EngineCalibrationV2.md` | Synthetic DB | **100%** | 0% | **NO** |
| `Top20Report.md` | `generate-deliverables.ts` | **100%** | 0% | **NO** |
| `Bottom20Report.md` | `generate-deliverables.ts` | **100%** | 0% | **NO** |
| `FactorAttributionReport.md` | `generate-deliverables.ts` | **100%** | 0% | **NO** |
| `PercentileValidationReport.md` | `generate-deliverables.ts` | **100%** | 0% | **NO** |
| `ProviderAccuracyReport.md` | `MasterCompanyRegistry` validation | N/A (validation logic) | Real tickers | **YES** (for metadata coverage) |
| `FACTOR_BACKTEST_REPORT.json` | `run-research-validation.ts` | 0% | **100%** | **YES** (7 symbols only) |
| `FEATURE_IMPORTANCE_REPORT.json` | `run-research-validation.ts` | 0% | **100%** | **YES** (7 symbols only) |
| Sector percentile distributions | Hardcoded reference | 0% | Claimed empirical | **PARTIAL** |

**Bottom line: All user-facing ranking reports (Top20, Bottom20, EngineCalibration) are generated from 100% synthetic data. They are mathematically valid (the engine works) but factually meaningless (the inputs are fake).**
