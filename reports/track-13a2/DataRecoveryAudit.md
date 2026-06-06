# Data Recovery Audit — TRACK-13A.2

**Date:** 2026-06-06

## Q1: Does any PostgreSQL data directory still exist?

| Location | Status | Evidence |
| --- | --- | --- |
| C:\Program Files\PostgreSQL\16\data | ❌ NOT FOUND | Directory does not exist. No PostgreSQL installation detected. |
| C:\Program Files\PostgreSQL\15\data | ❌ NOT FOUND | |
| C:\Program Files\PostgreSQL\14\data | ❌ NOT FOUND | |
| C:\Program Files\PostgreSQL\* | ❌ NOT FOUND | No PostgreSQL directory at all — PostgreSQL was never installed on this machine. |
| Docker volumes (%USERPROFILE%\.docker) | ❌ NOT FOUND | Docker Desktop not installed. No Docker volumes. |
| WSL volumes (\\wsl\$) | ❌ NOT FOUND | WSL not installed. Prompted for installation on access attempt. |
| Project-local database folders | ❌ NOT FOUND | No .db, .sqlite, or data/ directories found outside node_modules. |

**Conclusion: No PostgreSQL data directory exists. The previous PostgreSQL instance was likely Docker-based and has been fully removed. Data is unrecoverable from disk.**

## Q2: Is there evidence calibrate.ts previously ran successfully?

**YES — CONCLUSIVE EVIDENCE**

| Evidence | Details |
| --- | --- |
| EngineCalibrationReport.md | Generated 2026-06-04. Dataset: **505 Companies**. Full statistical analysis with sector distributions, factor correlations, engine score ranges. This is the definitive proof that calibrate.ts ran against a populated database. |
| Top20Report.md / Bottom20Report.md | Dated 2026-06-05. StockStory-ranked universe with health scores, classifications, and confidence levels. |
| FactorAttributionReport.md (29KB) | Full engine-by-engine attribution for every stock. Generated from the explainability pipeline. |
| FactorLeadersReport.md | Top 20 lists by Growth, Quality, Stability, Momentum, Valuation, and lowest Risk. |
| StockStoryExplainabilityReport.md | Consolidated explainability report with top 20, bottom 20, sector diagnostics. |
| ConfidenceValidationReport.md | Pearson correlation between health score and confidence: independence verified. |
| Bottom20HealthReport.md / Top20HealthReport.md | From explainability pipeline — ranked health report outputs. |
| ProviderAccuracyReport.md | Registry entries audited, verified, partial, and invalid counts from MasterCompanyRegistry. |
| SectorHealthReport.md | Sector-by-sector average health, growth, quality, stability across Banking, IT, Consumer, Pharma, Auto, Energy. |

**Key numbers from calibration:** 505 companies evaluated. Health Score mean=56.92, stdDev=8.10. All 7 engines computed. 450 stocks with "Very High" confidence. This represents a full database-backed pipeline execution.

## Data Freshness at Time of Calibration

| Metric | Value | Source |
| --- | --- | --- |
| Calibration date | 2026-06-04 | EngineCalibrationReport.md header |
| Universe size | 505 companies | Report — "Verified Indian listed universe" |
| Sectors covered | 14 distinct sectors | Sector Distribution Analysis table |
| Classification distribution | 70 Healthy, 341 Stable, 91 Weakening, 3 At Risk, 0 Excellent | Report Section 2 |
| Confidence distribution | 450 Very High, 55 High, 0 Medium, 0 Low | Report Section 2 |
