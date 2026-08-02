# Phase 21A — Symbol and EOD Data Model Audit

**Date**: 2026-06-17
**Baseline commit**: `84b5eb45` (Phase 20F)

## Current Symbol/Ticker Shape

- **`src/stockstory/data/universe/UniverseTypes.ts`** — `IndianEquitySymbol` with fields: `symbol`, `isin`, `nseSymbol`, `bseCode`, `companyName`, `sector`, `industry`, `exchange` (`NSE|BSE|both`), `listingStatus`, `listingDate`, `delistingDate`, `faceValue`, `marketCap`, `marketCapCategory`, `lastVerified`, `sourceIds`
- **`src/stockstory/data/universe/IndianEquityUniverseTypes.ts`** — `IndianEquityEntry` with similar fields plus `indexMembership`, `isTrading`
- **`src/services/data/MasterCompanyRegistry.ts`** — `RegistryEntry` with `symbol`, `companyName`, `sector`, `industry`, `exchange`, `marketCap`, `isin`, `bseCode`, `nseSymbol`, `currency`, `website`. Contains ~58+ hardcoded NSE entries.
- **`src/services/stocks/StockMetadata.ts`** — `IndianStock` type used by UI: `ticker`, `companyName`, `exchange`, `bseCode`, `sector`, `industry`, `price`, `dailyChangePct`, `healthScore`, `marketCapCr`, `high52Week`, `low52Week`, `peRatio`, `divYield`, `story`

## Exchange Assumptions

- Exchange is typed as `"NSE" | "BSE" | "SME"` in `StockMetadata` or `"NSE" | "BSE" | "both"` in `UniverseTypes`
- Default exchange is `NSE` when unspecified
- MasterCompanyRegistry only has NSE entries (BSE codes are stored as `bseCode` fields)
- BSE-specific equities (not cross-listed) are not represented
- SME segment is mentioned in exchange type but not populated

## Current EOD Candle Shape

- **No dedicated EOD candle contract exists** — Daily price data is stored as raw rows in `daily_prices` DB table
- Existing reports reference `daily_prices` rows (15,467 rows for 31 symbols reported historically)
- No typed `IndianEodCandle` interface in the codebase
- Price is stored as numeric values in the `daily_prices` table via `PriceRealAdapter`

## Current Storage/Caching Path

1. **L1**: In-memory `DataCache` (30s–5min, per-page-session) — `src/services/data/cache/DataCache.ts`
2. **L2**: DB-backed `EodDataCacheService` (24h–7d TTL) — `src/services/marketData/EodDataCacheService.ts`, uses `cache` DB table with `key`/`value`/`expires_at` columns
3. **L3**: `ProviderCoordinator` (budgeted fallback) — existing

## Current Scanner/Ranking Universe Source

- **Scanner** uses a hardcoded list (`NIFTY_50` or full DB-backed universe)
- **PrecomputeScheduler** (`src/services/scheduler/PrecomputeScheduler.ts`) runs deterministic engines over active symbols
- **Rankings** are price-sorted from available EOD data
- No formal `IndianUniverseKind` definitions exist

## Current Duplicate Symbol Risks

- Some symbols exist in both `MasterCompanyRegistry` and `stockstory` universe without deduplication
- `SymbolNormalizationEngine` (services) and `SymbolNormalizer` (stockstory) are separate implementations — potential inconsistency
- BSE numeric codes may be confused with NSE tickers for companies with numeric names

## Current NSE/BSE Suffix Risks

- `.NS`, `.BO`, `-EQ`, `NSE:`, `BSE:` suffixes are stripped by `SymbolNormalizer.normalize()`
- `SymbolNormalizationEngine.normalize()` strips `NSE:|BSE:` prefixes and `.NS|.BO|.NSE|.BSE` suffixes
- No canonical symbol contract to ensure suffix stripping is consistent
- BSE codes (numeric) could be mistaken for volume or price values

## Current ISIN Availability

- `MasterCompanyRegistry` has ISIN for all ~58+ entries
- `IndianEquityEntry` has nullable ISIN
- No ISIN validation or format checks

## Current Corporate Action Handling

- **No corporate action handling** — No adjusted close, no split/dividend adjustment, no corporate action flag on candles
- `EodCandleQualityIssue` does not exist yet — no quality validation of any kind
- Existing price data is assumed clean

## Current Missing-Data Behavior

- `EodDataCacheService.get()` returns `null` for cache miss/expiry → falls through to provider
- `MarketDataGateway.getLatestSnapshot()` returns `null` when no cached data available
- `IndianStock` type defaults price/PE/high52Week/low52Week/dailyChangePct to `0` and story to "Data unavailable."
- No `DataEmpty`/`DataPartialWarning` state in the data layer itself (these exist in UI components)

## Current Test Coverage Gaps

- `SymbolNormalizationEngine` has no tests
- `SymbolNormalizer` (stockstory) has no tests
- `IndianEquityUniverseBuilder` has no tests
- `EodDataCacheService` has no unit tests
- No EOD candle validation tests
- No trading calendar tests
- No universe definition tests
- No ingestion pipeline tests
- No symbol master store tests

## Summary

| Area | Status | Action |
|------|--------|--------|
| Symbol shape | Multiple overlapping types | Unify under canonical contracts |
| Exchange handling | Incomplete (no BSE-only, no SME/ETF) | Add IndianInstrumentSegment |
| EOD candle shape | Nonexistent (raw DB rows) | Create IndianEodCandle interface |
| EOD storage | EodDataCacheService + daily_prices | Use EodDataCacheService for ingestion |
| Universe source | Hardcoded / ad-hoc | Create formal universe definitions |
| Duplicate risk | Medium (two normalizer implementations) | Create single canonical resolver |
| ISIN | Available for major symbols | Add ISIN validation |
| Corp actions | None | Add corporate-action-aware flags |
| Missing data | nulls/zeros propagate | Add quality validation |
| Test coverage | Near-zero for data-plane | Build comprehensive test suite |
