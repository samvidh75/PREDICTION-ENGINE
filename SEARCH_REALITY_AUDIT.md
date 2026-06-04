# Search Reality Audit

Repository evidence inspected:
- `src/services/stocks/StockSearchIndex.ts`
- `src/services/stocks/StockSearchEngine.ts`
- `src/services/search/companyNameTickerResolver.ts`
- `src/services/discovery/discoveryIndex.ts`
- `src/services/discovery/discoveryTypes.ts`
- `src/services/search/UniversalIntelligenceSearchEngine.ts`
- `src/services/search/PredictiveDiscoveryArchitecture.ts`
- `src/services/search/index.ts`

## Verification Summary

| Requirement | Status | Evidence |
|---|---|---|
| Search uses StockRegistry? | IMPLEMENTED | `src/services/stocks/StockSearchEngine.ts` imports `StockRegistry` and searches `StockRegistry.getAllStocks()`. |
| Search uses MetadataStore? | NOT IMPLEMENTED | No `StockMetadataStore` file exists in the inspected repository, and no search implementation imports or references it. |
| Search index size? | IMPLEMENTED | `StockSearchIndex.ts` uses `INDIAN_STOCKS_DATABASE` with a fixed static list; `StockRegistry.ts` also has a fixed master registry. |
| Dynamic? | PARTIAL | `PredictiveDiscoveryArchitecture` and `UniversalIntelligenceSearchEngine` support runtime updates in memory, but the stock search surfaces themselves are backed by static in-repo datasets. |

## Search Surface Findings

### 1) `StockSearchEngine` in `src/services/stocks/StockSearchEngine.ts`
Status: IMPLEMENTED

Evidence:
- Imports `StockRegistry` from `./StockRegistry`.
- `search(query: string)` calls `StockRegistry.getAllStocks()`.
- Filters by symbol, name, and sector with direct/prefix/contains matching.

Interpretation:
- This is a registry-backed static search over the in-repo master stock list.
- It is not connected to a metadata store.

### 2) `StockSearchEngine` in `src/services/stocks/StockSearchIndex.ts`
Status: IMPLEMENTED

Evidence:
- Imports `INDIAN_STOCKS_DATABASE` from `./StockMetadata`.
- `search(query, limit)` scans the static array and returns ranked matches.

Interpretation:
- This is a second static stock search implementation.
- It is backed by the in-repo dataset, not a live metadata service.

### 3) `companyNameTickerResolver.ts`
Status: IMPLEMENTED

Evidence:
- Imports `StockSearchEngine` from `../stocks/StockSearchIndex`.
- `resolveStockCandidatesFromCompanyQuery(query)` returns candidates from that engine.

Interpretation:
- Company-name search resolution is routed through the static stock search index.

### 4) `UniversalIntelligenceSearchEngine`
Status: IMPLEMENTED

Evidence:
- Maintains an in-memory `Map<string, SearchResult[]>`.
- Supports `initializeIndex`, `addToIndex`, `removeFromIndex`, `updateInIndex`, and `search`.

Interpretation:
- This is dynamic in-memory search infrastructure.
- It is not the same as the stock search registry/index used by the company and command-centre flows.

### 5) `PredictiveDiscoveryArchitecture`
Status: IMPLEMENTED

Evidence:
- Uses `getDiscoveryIndex()` from `discoveryIndex.ts`.
- Generates predictions from sectors and ticker heuristics.

Interpretation:
- This layer is dynamic in memory, but still relies on a static in-repo discovery index.
- It does not use a metadata store.

## Explicit Non-Existence Findings

### `StockMetadataStore`
Status: NOT IMPLEMENTED

Evidence:
- No file named `src/services/stocks/StockMetadataStore.ts` exists in the inspected repository.
- No search module imports `StockMetadataStore`.

### `CommandCentreSearch`
Status: NOT IMPLEMENTED

Evidence:
- No file named `src/services/stocks/CommandCentreSearch.ts` exists in the inspected repository.
- No search module imports such a module.

## Search Index Size

Observed static datasets:
- `INDIAN_STOCKS_DATABASE` in `StockMetadata.ts` is fixed in source.
- `MASTER_STOCK_REGISTRY` in `StockRegistry.ts` is fixed in source.
- `discoveryIndex.ts` contains a fixed list of discovery entities.

Conclusion:
- Search is **static at the stock registry/index layer**.
- Search is **dynamic in memory** in the universal discovery layer.

## Final Verdict

- Search uses `StockRegistry`: **IMPLEMENTED**
- Search uses `MetadataStore`: **NOT IMPLEMENTED**
- Search index size: **static**
- Dynamic: **PARTIAL**

Overall search layer status: **PARTIAL**
