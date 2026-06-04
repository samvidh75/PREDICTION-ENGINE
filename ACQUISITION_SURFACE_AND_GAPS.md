# Indian Market Data Acquisition Surface and Gaps

Repository evidence inspected:
- `src/services/data/MarketDataGateway.ts`
- `src/services/data/types.ts`
- `src/services/data/cache/DataCache.ts`
- `src/services/data/providers/HistoricalProvider.ts`
- `src/services/data/providers/MetadataProvider.ts`
- `src/services/data/providers/NewsProvider.ts`
- `src/services/data/providers/PriceProvider.ts`
- `src/services/db/userProfileService.ts`
- `src/services/stocks/StockRegistry.ts`
- `src/services/stocks/StockMetadata.ts`
- `src/services/stocks/ExchangeMapper.ts`
- `src/services/stocks/ExchangeResolver.ts`
- `src/services/marketData/MarketDataGateway.ts`
- `src/backend/persistence/persistenceCoordinator.ts`
- `src/backend/persistence/persistencePlugin.ts`
- `src/backend/persistence/cache/cacheHierarchyEngine.ts`
- `src/backend/persistence/cache/cachePlugin.ts`
- `src/backend/persistence/migrations/migrationManager.ts`
- `src/backend/persistence/postgres/postgresClient.ts`
- `src/backend/persistence/postgres/postgresPlugin.ts`
- `src/backend/web/routes/discovery.ts`
- `src/backend/web/routes/search.ts`
- `src/backend/web/routes/health.ts`
- `src/backend/web/routes/healthometer.ts`

## Executive Summary

The repository has:
- a static stock universe,
- a short-range market-data gateway,
- a cache hierarchy skeleton,
- a Postgres client and migration skeleton,
- and backend routes for discovery/search/health.

What it does **not** have is a complete acquisition pipeline for the Indian market.

Missing from the current repository:
- complete symbol universe
- historical ingestion pipeline
- financial statement ingestion pipeline
- data quality engine
- automated backfill engine
- warehouse schema for acquisition data
- long-range market data coverage
- acquisition validation for live symbols

## Existing Acquisition/Storage Surface

### 1) Static symbol universe
Files:
- `src/services/stocks/StockRegistry.ts`
- `src/services/stocks/StockMetadata.ts`
- `src/services/stocks/ExchangeMapper.ts`
- `src/services/stocks/ExchangeResolver.ts`

Observed state:
- `StockRegistry` contains a fixed `MASTER_STOCK_REGISTRY` of 9 symbols.
- `StockMetadata` contains a fixed `INDIAN_STOCKS_DATABASE` of 10 symbols.
- No loader from NSE/BSE/SME feeds exists.
- No ETFs or indices universe loader exists.
- No ISIN field exists in the current stock universe model.
- No listing status field exists in the current stock universe model.

Coverage reality:
- This is a seed dataset, not a complete universe.
- It is far below the required 1000+ symbol target.

### 2) Data gateway and cache
Files:
- `src/services/data/MarketDataGateway.ts`
- `src/services/data/cache/DataCache.ts`
- `src/services/marketData/MarketDataGateway.ts`
- `src/services/marketData/StockCacheManager.ts`

Observed state:
- `MarketDataGateway` provides quote, company, history, and news methods.
- It uses `DataCache` for memory/sessionStorage caching.
- The `marketData` gateway exposes only latest snapshot access from `StockRegistry`.
- There is no acquisition warehouse, no persistence to acquisition tables, and no backfill orchestration.

Coverage reality:
- Caching exists.
- Acquisition storage does not.

### 3) Provider interfaces
Files:
- `src/services/data/providers/PriceProvider.ts`
- `src/services/data/providers/MetadataProvider.ts`
- `src/services/data/providers/HistoricalProvider.ts`
- `src/services/data/providers/NewsProvider.ts`

Observed state:
- Mock provider interfaces exist in the data layer.
- These are local offline mocks, not a complete ingestion system.
- They are not sufficient for acquisition, storage, or validation at scale.

Coverage reality:
- Provider abstraction exists.
- Ingestion pipeline does not.

### 4) Backend persistence skeleton
Files:
- `src/backend/persistence/persistenceCoordinator.ts`
- `src/backend/persistence/persistencePlugin.ts`
- `src/backend/persistence/cache/cacheHierarchyEngine.ts`
- `src/backend/persistence/cache/cachePlugin.ts`
- `src/backend/persistence/migrations/migrationManager.ts`
- `src/backend/persistence/postgres/postgresClient.ts`
- `src/backend/persistence/postgres/postgresPlugin.ts`

Observed state:
- Postgres client exists and can query a configured database.
- Migration manager exists and can apply SQL migrations.
- Cache hierarchy exists in memory and skeleton form.
- No acquisition tables are defined.
- No schema for symbols, prices, financial snapshots, news, or provider logs exists.
- No warehouse write/read repositories exist.

Coverage reality:
- The backend can support persistence.
- It does not yet implement the acquisition warehouse.

### 5) Backend API surface
Files:
- `src/backend/web/routes/discovery.ts`
- `src/backend/web/routes/search.ts`
- `src/backend/web/routes/health.ts`
- `src/backend/web/routes/healthometer.ts`

Observed state:
- Routes exist for discovery, search, health, and healthometer.
- No acquisition API routes exist for:
  - symbol universe ingestion
  - historical ingestion
  - financial ingestion
  - backfill jobs
  - data quality validation
  - warehouse inspection
- The backend routes are not acquisition-oriented.

Coverage reality:
- API surface exists.
- Acquisition API does not.

### 6) User profile persistence
File:
- `src/services/db/userProfileService.ts`

Observed state:
- Firestore is used for user profile persistence.
- This is unrelated to acquisition of market data.
- It does not provide warehouse functionality for symbol/history/financial/news acquisition.

Coverage reality:
- Storage exists in the app.
- Not relevant to market acquisition pipeline.

## Required Sprint 6.3 Layers vs Current State

### Phase A — Symbol Universe Engine
Required:
- `SymbolUniverseService.ts`
- `ExchangeUniverseLoader.ts`
- `UniverseValidator.ts`
- symbol coverage across NSE/BSE/SME/ETFs/indices

Current state:
- **NOT IMPLEMENTED**
- only static registry/database seed sets exist
- no loader/validator/universe service exists

### Phase B — Historical Data Ingestion
Required:
- `HistoricalIngestionService.ts`
- `HistoricalValidator.ts`
- `HistoricalNormalizer.ts`
- range support from 1D to MAX

Current state:
- **NOT IMPLEMENTED**
- short-range provider history exists
- no ingestion, normalization, or validator service exists
- no long-range support exists

### Phase C — Financial Statement Ingestion
Required:
- `FinancialIngestionService.ts`
- `FinancialNormalizer.ts`
- `FinancialValidator.ts`
- revenue/profit/EPS/ROE/ROCE/debt/cash/margins

Current state:
- **NOT IMPLEMENTED**
- no financial ingestion layer exists
- provider methods for financials are not wired into an active acquisition pipeline

### Phase D — Data Quality Engine
Required:
- `DataQualityEngine.ts`
- `GapDetector.ts`
- `DuplicateDetector.ts`
- `AnomalyDetector.ts`

Current state:
- **NOT IMPLEMENTED**
- no data-quality pipeline exists
- no acquisition-quality report generator exists

### Phase E — Historical Warehouse
Required:
- PostgreSQL schema
- tables for symbols, daily_prices, financial_snapshots, news_articles, provider_logs

Current state:
- **NOT IMPLEMENTED**
- Postgres infrastructure exists, but the acquisition schema does not

### Phase F — Backfill Engine
Required:
- `BackfillCoordinator.ts`
- `BackfillJobRunner.ts`
- `BackfillCheckpointStore.ts`
- retry/resume/checkpoint support

Current state:
- **NOT IMPLEMENTED**
- no backfill job orchestration exists

### Phase G — Provider Cost & Usage Optimisation
Required:
- request estimates
- cache hit rates
- fallback frequencies
- cost projections
- rate-limit mitigation

Current state:
- **NOT IMPLEMENTED**
- no acquisition usage-strategy reporting exists

### Phase H — Live Acquisition Validation
Required:
- live symbol validation for RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, HAL.NS, IRFC.NS, BEL.NS
- metadata, price, history, financials checks

Current state:
- **FAILED / NOT IMPLEMENTED**
- the current live validation path is blocked by the provider coordinator runtime error

## Concrete Gaps by Data Domain

### Complete symbol universe
Missing:
- NSE Mainboard loader
- BSE Mainboard loader
- NSE SME loader
- BSE SME loader
- ETFs
- Indices
- ISIN
- listing status
- full sector/industry normalization
- 1000+ symbol coverage

### Historical ingestion
Missing:
- normalized ingestion jobs
- time-range backfill logic
- history validation
- warehouse writes
- long-range support

### Financial ingestion
Missing:
- statement ingestion jobs
- normalization
- validation
- warehouse storage
- provider fallback strategy for financial data

### Data quality
Missing:
- candle gap detection
- duplicate candle detection
- anomaly detection
- invalid volume checks
- financial consistency checks
- missing metadata checks

### Warehouse / persistence
Missing:
- acquisition schema
- symbol table
- daily price table
- financial snapshot table
- news table
- provider log table
- indexing strategy for acquisition queries

### Backfill
Missing:
- resumable jobs
- checkpoints
- retry policy
- symbol-level progress tracking
- 10-year history backfill

## Final Assessment

The repository already has:
- a static symbol seed,
- a short-range market-data gateway,
- a cache layer,
- and a Postgres persistence skeleton.

But it does **not** yet have the acquisition program required for Sprint 6.3.

Overall acquisition-program readiness: **NOT READY**
