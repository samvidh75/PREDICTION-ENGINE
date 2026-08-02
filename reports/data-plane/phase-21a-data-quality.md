# Phase 21A — Data Quality Report

**Date**: 2026-07-01
**Commit**: `206407bb`

## Overview

Phase 21A introduces a structured data quality framework for the Indian equity data plane. All quality checks are deterministic — no network calls, no LLM evaluation.

## Quality Framework

| Component | File | Status |
|-----------|------|--------|
| EOD candle validation | `src/data-plane/eod/IndianEodCandle.ts` | ✅ Built |
| Candle batch validation | `validateEodCandleBatch()` | ✅ Built |
| Data quality report builder | `src/data-plane/reporting/DataQualityReportBuilder.ts` | ✅ Built |
| Calendar coverage summary | `buildCalendarCoverageSummary()` | ✅ Built |
| Symbol data quality report | `buildSymbolDataQualityReport()` | ✅ Built |

## Validation Checks (IndianEodCandle)

| Check | What it validates |
|-------|------------------|
| `EOD_OHLC_CONSTRAINT` | High >= Open, High >= Close, Low <= Open, Low <= Close |
| `EOD_VOLUME_NEGATIVE` | Volume must not be negative |
| `EOD_VOLUME_ZERO` | Zero volume flagged (tolerated but noted) |
| `EOD_MISSING_PRICE` | Open/High/Low/Close must be finite numbers |
| `EOD_FUTURE_DATE` | Date must not exceed today |
| `EOD_WEEKEND_DATE` | Date must be a weekday |

## Calendar Quality

- `IndiaTradingCalendar.STATIC_HOLIDAYS` contains only weekday dates
- Weekend dates have been removed (previous audit found 5 weekend entries)
- `buildCalendarCoverageSummary` tracks `weekendSkipsCorrect` as a quality metric

## Fixture Data Quality

- 24 symbols spanning large/mid/small/ETF/micro/SME categories
- All have valid ISINs, exchanges, segments, listing statuses
- ETF symbols have `marketCapCategory: null` (not equity instruments)
- All large-cap fixtures have marketCapCr > 100,000

## Current Status

- **2664/2671 tests pass** (7 skipped)
- **0 lint errors** across all data-plane code
- All quality computations are deterministic
- No external dependencies in the quality pipeline
