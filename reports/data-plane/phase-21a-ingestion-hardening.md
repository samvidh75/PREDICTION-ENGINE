# Phase 21A — Ingestion Pipeline Hardening Report

**Date**: 2026-07-01
**Commit**: `206407bb`

## Pipeline Architecture

```
Raw candles → normalize → resolve → validate → dedupe → store (EodDataCacheService)
```

## Components

| Stage | Implementation | Status |
|-------|---------------|--------|
| Normalize | `IndianSymbolNormalizer.normalizeTicker()` | ✅ |
| Resolve | `IndianSymbolResolver.resolve()` | ✅ |
| Validate | `validateEodCandle()` / `validateEodCandleBatch()` | ✅ |
| Dedupe | Ingest pipeline checks existing keys before insert | ✅ |
| Store | `EodDataCacheService.set()` with batch support | ✅ |

## Hardening Measures

### 1. Symbol Normalization
- Strips `.NS`, `.BO`, `-EQ`, `NSE:`, `BSE:` suffixes/prefixes
- Handles BSE numeric codes
- Uppercases and trims whitespace

### 2. Symbol Resolution
- ISIN matching
- BSE code lookup
- Alias resolution (multiple tickers → canonical symbol)
- Returns explicit `ResolutionStatus` (resolved/unresolved/ambiguous)

### 3. EOD Validation
- OHLC consistency constraint check
- Volume sanity (non-negative, non-zero warning)
- Date sanity (no future dates, no weekend dates)
- Batch-level statistics (accepted/rejected/sample rejections)

### 4. Deduplication
- `EodDataCacheService` upserts by `symbol:YYYY-MM-DD` key
- Duplicate candles are silently dropped (counted in result)
- No duplicate provider calls

### 5. Quality Reporting
- `DataQualityReportBuilder.buildSymbolDataQualityReport()` per symbol
- `buildCalendarCoverageSummary()` for calendar integrity
- All computations deterministic

## Tests

- **IndianEodIngestionPipeline test**: Full end-to-end (accept → reject → dedupe → cache)
- **IndianEodCandle test**: OHLC constraints, all quality issue types
- **IndianEodIngestionTypes test**: Contract validation
- **DataQualityReportBuilder test**: Report structure and metrics

## Remaining Hardening (Future)

- Symbol master store DB integration (placeholder `runQuery`)
- Scheduled ingestion job wiring to `EodRefreshScheduler`
- Production CSV/file ingestion entrypoint
