# Artifact Inventory — TRACK-13A.2

**Date:** 2026-06-06

## Cached API Responses (Recoverable as Input Data)

These files contain the raw provider responses that feed into snapshot generation:

| Symbol | Upstox Key-Ratios | Upstox Balance Sheet | Screener | Yahoo | Finnhub |
| --- | --- | --- | --- | --- | --- |
| RELIANCE | ✅ 1.6KB | ✅ 1.6KB | ✅ 0.2KB | ✅ 65KB | ✅ 0.1KB |
| TCS | ✅ 1.6KB | ✅ 1.6KB | ✅ 0.2KB | ✅ 63KB | ✅ 0.1KB |
| INFY | ✅ 1.6KB | ✅ 1.6KB | ✅ 0.2KB | ✅ 66KB | ✅ 0.1KB |
| HDFCBANK | ✅ 1.6KB | ✅ 1.6KB | ✅ 0.2KB | ✅ 66KB | ✅ 0.1KB |
| ICICIBANK | ✅ 1.6KB | ✅ 1.6KB | ✅ 0.2KB | ✅ 67KB | ✅ 0.1KB |
| BHARTIARTL | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| ITC | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| HINDUNILVR | ✅ 0.8KB | ✅ 0.7KB | — | — | — |
| SBIN | ✅ 0.8KB | ✅ 0.7KB | — | — | — |
| KOTAKBANK | ✅ 0.1KB | ✅ 0.2KB | — | — | — |
| HAL | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| BEL | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| IRFC | ✅ 0.7KB | ✅ 0.2KB | — | — | — |
| SUZLON | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| GRANULES | ✅ 0.7KB | ✅ 0.7KB | — | — | — |
| CHENNPETRO | ✅ 0.7KB | ✅ 0.7KB | — | — | — |

## Generated Reports (Non-Recoverable as DB State)

| Report | Size | Recoverable as DB? |
| --- | --- | --- |
| EngineCalibrationReport.md | 4.8KB | ❌ No — contains aggregate statistics, not raw rows |
| FactorAttributionReport.md | 29KB | ❌ No — engine output per stock, not input data |
| FactorLeadersReport.md | 3.2KB | ❌ No — rankings only |
| Top20Report.md / Bottom20Report.md | ~1.7KB each | ❌ No — rankings only |
| SectorHealthReport.md | 0.6KB | ❌ No — sector aggregates |
| PROVIDER_CHAIN_REPORT.json | 35KB | ⚠️ Partial — provider responses, but without DB schema context |
| LIVE_INTELLIGENCE_EXECUTION_REPORT.json | 19KB | ⚠️ Partial — computed factor/feature values for subset |

## What Is Partially Recoverable

- **16 symbols** have Upstox key-ratios and balance-sheet data (can regenerate financial_snapshots)
- **5 symbols** have Yahoo price history (65-67KB each — can regenerate feature_snapshots via TechnicalIndicatorEngine)
- **0 symbols** have complete factor_snapshots stored as artifacts — these were computed in-memory and written to DB only
- **Report aggregates** (EngineCalibrationReport.md) can validate reconstituted data but cannot serve as source

## Verdict

**Database state is NOT recoverable from artifact files.** Cached provider responses could repopulate financial_snapshots for ~16 symbols, but the full 505-symbol universe reconstruction requires fresh API calls to Upstox, Screener, and Yahoo for all symbols.
