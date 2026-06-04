# Historical Data Audit

Repository evidence inspected:
- `src/services/providers/AlphaVantageProvider.ts`
- `src/services/providers/YahooProvider.ts`
- `src/services/data/providers/HistoricalProvider.ts`
- `src/services/charting/HistoricalReplayEngine.ts`
- `src/services/marketData/MarketRefreshScheduler.ts`
- `src/services/marketData/MarketStateCoordinator.ts`
- `src/services/marketData/StockSnapshotStore.ts`
- `src/services/marketData/MarketDataGateway.ts`
- `src/services/marketData/MarketSubscriptionEngine.ts`
- `src/services/marketData/RealtimeCoordinator.ts`
- `scripts/liveProviderValidation.ts`

## Existence Check

| Artifact | Status | Evidence |
|---|---|---|
| HistoricalProvider | IMPLEMENTED | `src/services/data/providers/HistoricalProvider.ts` exists as a mock interface/provider pair; `src/services/providers/AlphaVantageProvider.ts` and `src/services/providers/YahooProvider.ts` implement historical methods via `getHistory`. |
| HistoricalDataProvider | NOT IMPLEMENTED | No file named `src/services/marketData/HistoricalDataProvider.ts` exists in the inspected repository. |
| HistoricalWarehouse | NOT IMPLEMENTED | No file named `src/services/marketData/HistoricalWarehouse.ts` exists in the inspected repository. |
| BackfillService | NOT IMPLEMENTED | No file named `src/services/marketData/BackfillService.ts` exists in the inspected repository. |

## Availability Matrix

| Range | Availability | Evidence |
|---|---|---|
| 1Y | PARTIAL | `YahooProvider.getHistory()` uses `range=1mo`, so no direct 1Y provider range is implemented there. `AlphaVantageProvider.getHistory()` returns approximately 30 days only. `StockSearchIndex` / charting layers can synthesize longer views, but not through historical provider APIs. |
| 3Y | NOT IMPLEMENTED | No historical provider in the inspected repository returns 3 year history from live provider APIs. |
| 5Y | NOT IMPLEMENTED | No historical provider in the inspected repository returns 5 year history from live provider APIs. |
| 10Y | NOT IMPLEMENTED | No historical provider in the inspected repository returns 10 year history from live provider APIs. |
| MAX | NOT IMPLEMENTED | No historical provider in the inspected repository returns max-range history from live provider APIs. |

## Detailed Findings

### 1) HistoricalProvider in `src/services/data/providers/HistoricalProvider.ts`
Status: IMPLEMENTED

Evidence:
- Defines `HistoricalProvider` interface with `getHistory(symbol)`.
- Defines `MockHistoricalProvider` returning 31 synthetic points.
- Uses deterministic-like mock generation with random volume.

Interpretation:
- This is an offline mock provider, not wired into the live gateway.

### 2) `YahooProvider.getHistory()`
Status: IMPLEMENTED, LIMITED RANGE

Evidence:
- Uses Yahoo Finance chart endpoint with `range=1mo` and `interval=1d`.
- Returns mapped `HistoricalPoint[]`.

Interpretation:
- Live historical data exists, but only for approximately one month in the inspected implementation.
- This does not satisfy 1Y/3Y/5Y/10Y/MAX availability requirements.

### 3) `AlphaVantageProvider.getHistory()`
Status: IMPLEMENTED, LIMITED RANGE

Evidence:
- Uses Alpha Vantage `TIME_SERIES_DAILY_ADJUSTED`.
- Returns the last 30 entries from `Time Series (Daily)`.

Interpretation:
- Live historical data exists, but the implementation is explicitly compact and short-range.
- Not enough for extended range requirements.

### 4) Chart replay infrastructure
Status: IMPLEMENTED, SYNTHETIC / NOT PROVIDER-BASED

Evidence:
- `HistoricalReplayEngine` handles replay of `CandlestickData`.
- This is a UI/education replay mechanism, not a provider warehouse or live historical store.

Interpretation:
- Historical playback exists in the codebase.
- It does not prove availability of long-range live historical provider data.

## Range Verdicts

- **1Y**: PARTIAL
- **3Y**: NOT IMPLEMENTED
- **5Y**: NOT IMPLEMENTED
- **10Y**: NOT IMPLEMENTED
- **MAX**: NOT IMPLEMENTED

## Final Verdict

The repository contains:
- live short-range historical provider support,
- offline mock historical support,
- and chart replay support.

It does **not** contain a warehouse/backfill layer, and it does **not** expose extended historical ranges through the audited provider path.

Overall historical layer status: **PARTIAL**
