# Failover Report

This report documents the simulation audits of provider network crashes to verify the integrity of the failover orchestration chain.

## Simulated Provider Failures

### 1. Yahoo Provider Outage Simulation
- **Trigger**: Simulated API timeout (exceeded 3,000ms boundary).
- **Result**: `ProviderCoordinator` successfully caught `YahooProvider` exception.
- **Failover Action**: Routed request to `IndianMarketProvider` for NSE/BSE quotes.
- **UI Degradation**: None. Price coordinates resolved successfully.

### 2. Finnhub Provider Outage Simulation
- **Trigger**: Mock credentials rejection (401 Unauthorized status code).
- **Result**: Coordinator caught error and accessed secondary snapshot fallback logic.
- **Failover Action**: Returned the last verified database-backed financial snapshot.
- **UI Degradation**: Handled gracefully by displaying timestamped cached snapshots.

### 3. AlphaVantage Provider Rate-Limit Simulation
- **Trigger**: 429 Too Many Requests response code.
- **Result**: Healthy status indicator degraded to `RateLimited`.
- **Failover Action**: Coordinator dynamically re-ordered routing chain to prioritize cached entries and bypass future AV calls for 5 minutes.
- **UI Degradation**: No user-facing impact.

## Provider Routing Sequence Rules
- **Quotes**: `YahooProvider` (Primary) -> `IndianMarketProvider` (Secondary) -> `AlphaVantageProvider` (Tertiary)
- **Metadata**: `YahooProvider` (Primary) -> `FinnhubProvider` (Secondary)
- **Historical**: `YahooProvider` (Primary) -> `IndianMarketProvider` (Secondary) -> `AlphaVantageProvider` (Tertiary)
