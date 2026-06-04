# API_AUDIT

Evidence-based audit of the provider layer and backend APIs.

## Provider audit

### YahooProvider
- Provider exists: **WORKING**
- HTTP requests implemented: **WORKING**
- Environment variables configured: **NOT REQUIRED**
- Response parsing implemented: **WORKING**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **PARTIAL**
- Called by coordinator: **WORKING**
- Called by gateway: **WORKING**
- Evidence:
  - `src/services/providers/YahooProvider.ts`
  - `src/services/providers/ProviderCoordinator.ts`
  - Live validation reports show successful quote, metadata, and historical fetches for RELIANCE/TCS/INFY/HDFCBANK/HAL.

### FinnhubProvider
- Provider exists: **WORKING**
- HTTP requests implemented: **WORKING**
- Environment variables configured: **WORKING**
- Response parsing implemented: **WORKING**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **PARTIAL**
- Called by coordinator: **WORKING**
- Called by gateway: **WORKING**
- Evidence:
  - `src/services/providers/FinnhubProvider.ts`
  - `src/services/providers/ProviderCoordinator.ts`
  - `reports/PROVIDER_CHAIN_REPORT.json` and `reports/PROVIDER_FAILURE_REPORT.json`
- Known runtime state:
  - Live calls returned `403 Forbidden`.
  - Circuit breaker opened during validation for news/financials.

### AlphaVantageProvider
- Provider exists: **WORKING**
- HTTP requests implemented: **WORKING**
- Environment variables configured: **WORKING**
- Response parsing implemented: **WORKING**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **PARTIAL**
- Called by coordinator: **WORKING**
- Called by gateway: **WORKING**
- Evidence:
  - `src/services/providers/AlphaVantageProvider.ts`
  - `src/services/providers/ProviderCoordinator.ts`
  - `reports/PROVIDER_FAILURE_REPORT.json`
- Known runtime state:
  - Prior validation reports show init failures when the key is missing or placeholder.
  - The current `.env` does contain a key, but live coordinator validation still failed on AlphaVantage initialization in earlier runs.

### IndianMarketProvider
- Provider exists: **WORKING**
- HTTP requests implemented: **WORKING**
- Environment variables configured: **WORKING**
- Response parsing implemented: **WORKING**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **PARTIAL**
- Called by coordinator: **WORKING**
- Called by gateway: **WORKING**
- Evidence:
  - `src/services/providers/IndianMarketProvider.ts`
  - `src/services/providers/ProviderCoordinator.ts`
  - `reports/PROVIDER_FAILURE_REPORT.json`
- Known runtime state:
  - Prior validation reports show quote/history failures for multiple symbols.

### ProviderCoordinator
- Provider exists: **WORKING**
- HTTP requests implemented: **WORKING**
- Environment variables configured: **WORKING**
- Response parsing implemented: **WORKING**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **WORKING**
- Called by coordinator: **N/A**
- Called by gateway: **WORKING**
- Evidence:
  - `src/services/providers/ProviderCoordinator.ts`
  - `src/services/data/MarketDataGateway.ts`
  - `reports/PROVIDER_CHAIN_REPORT.json`
- Notes:
  - Coordination chain order is explicit:
    - Quotes: Yahoo → IndianMarket → AlphaVantage
    - Metadata: Yahoo → Finnhub
    - Historical: Yahoo → IndianMarket → AlphaVantage
    - Financials: Finnhub
    - News: Finnhub

### RetryPolicy
- Provider exists: **WORKING**
- HTTP requests implemented: **N/A**
- Environment variables configured: **N/A**
- Response parsing implemented: **N/A**
- Retry logic implemented: **WORKING**
- Circuit breaker implemented: **N/A**
- Called by coordinator: **WORKING**
- Called by gateway: **INDIRECT**
- Evidence:
  - `src/services/providers/RetryPolicy.ts`
  - imported by YahooProvider, FinnhubProvider, AlphaVantageProvider, IndianMarketProvider

### ProviderHealthMonitor
- Provider exists: **WORKING**
- HTTP requests implemented: **N/A**
- Environment variables configured: **N/A**
- Response parsing implemented: **N/A**
- Retry logic implemented: **N/A**
- Circuit breaker implemented: **N/A**
- Called by coordinator: **WORKING**
- Called by gateway: **INDIRECT**
- Evidence:
  - `src/services/providers/ProviderHealthMonitor.ts`
  - `src/services/providers/ProviderCoordinator.ts`

### ProviderCircuitBreaker
- Provider exists: **WORKING**
- HTTP requests implemented: **N/A**
- Environment variables configured: **N/A**
- Response parsing implemented: **N/A**
- Retry logic implemented: **N/A**
- Circuit breaker implemented: **WORKING**
- Called by coordinator: **WORKING**
- Called by gateway: **INDIRECT**
- Evidence:
  - `src/services/providers/ProviderCircuitBreaker.ts`
  - `src/services/providers/ProviderCoordinator.ts`
  - `reports/PROVIDER_CHAIN_REPORT.json` shows `CircuitBreaker: Open`.

---

## Backend API audit

### GET /healthz
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe http://127.0.0.1:4001/healthz`
- Result:
  - `ok: true`
  - `service: stockstory-backend`
  - `db: null`
  - `cache.configured: true`
  - `_debug.hasPostgres: false`
- Interpretation:
  - Backend process is up.
  - Postgres is not attached inside the running server process.

### GET /api/market-data/company/:symbol
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe` for `RELIANCE`
- Result:
  - quote returned successfully
  - metadata returned successfully
- Interpretation:
  - Live market quote path is operational.

### GET /api/intelligence/company/:symbol
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe` for `RELIANCE`
- Result:
  - returns company insight, company outlook, sector outlook, narrative
  - sector fallback was `Technology`
- Interpretation:
  - API is operational.
  - Some outputs are fallback/snapshot-derived when DB fields are missing.

### GET /api/intelligence/market
- Exists: **WORKING**
- Runtime response: **NOT VERIFIED**
- Evidence:
  - route implementation exists in `src/backend/web/routes/intelligence.ts`
- Interpretation:
  - Route is present, but no direct live curl in this audit session.

### GET /api/intelligence/sector/:sector
- Exists: **WORKING**
- Runtime response: **PARTIAL**
- Evidence:
  - route implementation exists
  - UI calls it from SectorExplorer
- Interpretation:
  - Backend route exists and is used by UI; direct curl not captured in this session.

### GET /api/intelligence/portfolio
- Exists: **WORKING**
- Runtime response: **PARTIAL**
- Evidence:
  - route implementation exists
  - UI calls it from PortfolioPage
- Interpretation:
  - Route exists; not directly curl-tested in this session.

### POST /api/intelligence/portfolio
- Exists: **WORKING**
- Runtime response: **PARTIAL**
- Evidence:
  - route implementation exists in backend.
- Interpretation:
  - Available and used by PortfolioPage.

### GET /api/healthometer/state
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe` response
- Result:
  - returned healthometer state, rationale, confidence margin, and environment label.

### GET /api/healthometer/synthesis
- Exists: **WORKING**
- Runtime response: **NOT VERIFIED**
- Evidence:
  - route implementation exists; direct runtime call not captured.

### GET /api/discovery/index
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe` response
- Result:
  - returns discovery index entities.

### GET /api/discovery/related
- Exists: **WORKING**
- Runtime response: **NOT VERIFIED**
- Evidence:
  - route implementation exists in backend.

### GET /api/search/universal
- Exists: **WORKING**
- Runtime response: **WORKING**
- Evidence:
  - live `curl.exe` response for `banking`
- Result:
  - returned ranked discovery search results.

### GET /api/search/predictive
- Exists: **WORKING**
- Runtime response: **NOT VERIFIED**
- Evidence:
  - route implementation exists in backend.

---

## Provider wiring conclusions

- **Best functioning provider chain:** YahooProvider for quote/history/metadata.
- **Broken at runtime:** news and financials because Finnhub returns 403 and circuit breaker opens.
- **Brittle/missing support:** AlphaVantage and IndianMarket fail validation in earlier reports.
- **Gateway correctness:** `MarketDataGateway` and `ProviderCoordinator` are wired and reachable.
- **Main reliability gap:** live metadata quality is thin and fallback-heavy, and news/financial coverage is not reliable.
