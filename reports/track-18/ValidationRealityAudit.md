# Validation Reality Audit — TRACK-18

**Date:** 2026-06-06

## TRACK-13 and TRACK-14: What Would They Validate?

### TRACK-13 (Score Calibration & Ranking Reality Audit)

Script: `scripts/track13_calibration_audit.cjs`

Reads from:
- `symbols` → from expand-market-coverage (mixed real/generated names)
- `financial_snapshots` → 100% synthetic (Math.random())
- `feature_snapshots` → computed from synthetic prices
- `factor_snapshots` → computed from synthetic data

**Would audit:** Score distributions, engine contributions, sector biases, ROA impact, technical signals — ALL measured against synthetic random data.

**Would NOT audit:** Real-world ranking quality. The correlations it finds are between random numbers and other random numbers.

### TRACK-14 (Ranking Reality & Ground Truth Validation)

Script: `scripts/track14_audit.cjs`

Same data sources as TRACK-13.

Would answer "Does StockStory rank good businesses above bad businesses?" by comparing engine scores against synthetic random fundamentals. The answer would be statistically meaningless for real-world validation.

### Prior Reports Also Synthetic

| Report | Source | Synthetic? |
| --- | --- | --- |
| EngineCalibrationReport.md | calibrate.ts → DB | 100% synthetic |
| Top20Report.md | generate-deliverables.ts | 100% synthetic |
| Bottom20Report.md | generate-deliverables.ts | 100% synthetic |
| FactorAttributionReport.md | generate-deliverables.ts or run-explainability-pipeline.ts | 100% synthetic |
| FactorLeadersReport.md | run-explainability-pipeline.ts | 100% synthetic |
| PercentileValidationReport.md | generate-deliverables.ts | 100% synthetic |
| SectorHealthReport.md | run-explainability-pipeline.ts | 100% synthetic |
| ConfidenceValidationReport.md | run-explainability-pipeline.ts | 100% synthetic |
| PenaltyAnalysisReport.md | run-explainability-pipeline.ts | 100% synthetic |

## What Validation Already Exists With Real Data

- Provider-level audits (Upstox, Screener, Yahoo response validation) — these validated API responses for individual symbols
- Upstox OAuth validation — validated authentication flow
- ProviderCoordinator merge logic — validated tiered financial merging

**None of these feed into calibration or ranking validation.**

## VERDICT

**0% of ranking validation uses real company data.** All ranking evidence is synthetic. TRACK-13 and TRACK-14 would measure engine calibration quality, not financial ranking quality.
