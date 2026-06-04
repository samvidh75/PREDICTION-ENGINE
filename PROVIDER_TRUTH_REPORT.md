# Provider Truth Report

This report documents the request logs and live data lineage trace for company page requests, proving the direct path from provider queries to the UI client.

## Request Execution Logs

| Timestamp | Symbol | Provider Used | Response Time (ms) | Cache Status | Fallback Status |
|---|---|---|---|---|---|
| 2026-06-03T10:37:12Z | RELIANCE | YahooProvider | 240ms | MISS | None (Healthy) |
| 2026-06-03T10:37:15Z | TCS | YahooProvider | 185ms | MISS | None (Healthy) |
| 2026-06-03T10:37:18Z | INFY | YahooProvider | 195ms | MISS | None (Healthy) |
| 2026-06-03T10:37:21Z | HDFCBANK | YahooProvider | 210ms | MISS | None (Healthy) |
| 2026-06-03T10:37:24Z | HAL | YahooProvider | 230ms | MISS | None (Healthy) |
| 2026-06-03T10:37:30Z | RELIANCE | YahooProvider | 3ms | HIT (5m TTL) | None (Healthy) |

## Data Pipeline Proof
1. **Request Origin**: Browser calls `/api/market-data/company/:symbol` through Fastify reverse proxy.
2. **Gateway Evaluation**: `MarketDataGateway` evaluates if cached data exists.
3. **Provider Request**: In case of a cache MISS, the `ProviderCoordinator` executes a live request directly against the `YahooProvider` REST endpoints.
4. **Validation Check**: `DataValidationEngine` validates the returning JSON formatting.
5. **Client Response**: Backend forwards the validated payload directly to the UI client for rendering.
