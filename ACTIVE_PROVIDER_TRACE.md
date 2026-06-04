# Active Provider Trace

Repository evidence inspected:
- `src/views/CompanySuperpage.tsx`
- `src/hooks/useCompanyData.ts`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/data/MarketDataGateway.ts`
- `src/services/providers/ProviderCoordinator.ts`
- `src/components/navigation/CommandCentreSearch.tsx`
- `src/components/navigation/CommandCentre.tsx`
- `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
- `src/components/dashboard/DashboardCommandSearchBar.tsx`
- `src/services/telemetry/useCompanyTelemetry.ts`
- `src/services/telemetry/TelemetrySnapshotFactory.ts`
- `scripts/liveProviderValidation.ts`

## Trace Legend

Format used:
`UI ↓ Hook ↓ Service ↓ Gateway ↓ ProviderCoordinator ↓ Provider`

If a capability does not reach a provider in the current repository state, the trace is marked **blocked** or **not wired**.

## Price

### Active path
`CompanySuperpage.tsx`
↓ `useCompanyData.ts`
↓ `services/api/MarketDataOrchestrator.ts`
↓ `services/data/MarketDataGateway.ts`
↓ `services/providers/ProviderCoordinator.ts`
↓ `services/providers/YahooProvider.ts`

### Evidence
- `useCompanyData` calls `orchestrator.fetchCompanyData(symbol)`.
- `MarketDataOrchestrator.fetchCompanyData()` calls `MarketDataGateway.getQuote(symbol)`.
- `MarketDataGateway.getQuote()` delegates to `ProviderCoordinator.getQuote(symbol)`.
- `ProviderCoordinator` registers `YahooProvider` in its constructor.
- Live execution is blocked by `this.tracer.recordUsage(...)` in `ProviderCoordinator.invokeChain()`.

### Status
**PARTIAL**

## Metadata

### Active path
`CompanySuperpage.tsx`
↓ `useCompanyData.ts`
↓ `services/api/MarketDataOrchestrator.ts`
↓ `services/data/MarketDataGateway.ts`
↓ `services/providers/ProviderCoordinator.ts`
↓ `services/providers/YahooProvider.ts`

### Evidence
- `MarketDataOrchestrator.fetchCompanyData()` calls `MarketDataGateway.getCompany(symbol)`.
- `MarketDataGateway.getCompany()` delegates to `ProviderCoordinator.getMetadata(symbol)`.
- `ProviderCoordinator` includes `YahooProvider` and conditionally `FinnhubProvider`.
- Execution is blocked by the coordinator tracer error.

### Status
**PARTIAL**

## Historical

### Active path
`scripts/liveProviderValidation.ts`
↓ `services/data/MarketDataGateway.ts`
↓ `services/providers/ProviderCoordinator.ts`
↓ `services/providers/YahooProvider.ts`
and
`services/providers/AlphaVantageProvider.ts`

### Evidence
- `liveProviderValidation.ts` directly calls `MarketDataGateway.getHistory(sym)`.
- `MarketDataGateway.getHistory()` delegates to `ProviderCoordinator.getHistory(symbol)`.
- `ProviderCoordinator` registers `YahooProvider` and conditionally `AlphaVantageProvider`.
- `YahooProvider.getHistory()` and `AlphaVantageProvider.getHistory()` both exist.
- Live validation fails before historical data returns.

### Status
**PARTIAL**

## Financials

### Active path
No active UI path in the inspected repository reaches financials through `MarketDataOrchestrator` or `CompanySuperpage`.

### Evidence
- `ProviderCoordinator.getFinancials()` exists.
- `FinnhubProvider.getFinancials()` exists.
- No inspected UI hook or page calls `MarketDataGateway.getFinancials()`; the inspected gateway also does not expose a `getFinancials()` method.
- Therefore financials are provider-capable in code, but not currently wired through the audited gateway/UI path.

### Status
**NOT IMPLEMENTED** for active UI path

## News

### Active path
No active UI path in the inspected repository reaches news through `CompanySuperpage`.

### Evidence
- `ProviderCoordinator.getNews()` exists.
- `FinnhubProvider.getNews()` exists.
- `MarketDataGateway.ts` exposes `getNews(symbol)`.
- No inspected company-page hook uses `getNews()`.
- `CompanySuperpage.tsx` does not render provider-backed news directly; its displayed story blocks are component-local.

### Status
**PARTIAL** at gateway level, **NOT IMPLEMENTED** in company-page UI path

## Search

### Active path
`CommandCentreSearch.tsx`
↓ `services/stocks/StockSearchEngine.ts`
↓ `services/stocks/StockRegistry.ts`

and
`CommandCentre.tsx`
↓ `services/stocks/StockSearchIndex.ts`
↓ `services/stocks/StockMetadata.ts`

### Evidence
- `CommandCentreSearch.tsx` imports `StockSearchEngine` from `services/stocks/StockSearchEngine.ts`.
- That engine queries `StockRegistry.getAllStocks()`.
- `CommandCentre.tsx` imports `StockSearchEngine` from `services/stocks/StockSearchIndex.ts`.
- That engine scans `INDIAN_STOCKS_DATABASE`.
- No provider or gateway is involved in search.

### Status
**NOT IMPLEMENTED** for provider-backed search
**PARTIAL** for search functionality in general

## Telemetry

### Active path
`CompanySuperpage.tsx`
↓ `useCompanyData.ts`
↓ `services/api/MarketDataOrchestrator.ts`
↓ `services/data/MarketDataGateway.ts`
↓ `services/providers/ProviderCoordinator.ts`
↓ `services/providers/YahooProvider.ts`
↓ `services/telemetry/useCompanyTelemetry.ts`
↓ `services/telemetry/TelemetrySnapshotFactory.ts`
↓ `HealthScoreEngine / ConfidenceScoreEngine / ValuationEngine / MomentumEngine`

### Evidence
- `useCompanyTelemetry()` converts `CompanyTelemetry` into `TelemetrySnapshot`.
- `TelemetrySnapshotFactory` derives telemetry scores from company data.
- The telemetry engines are pure calculation classes.
- Because `CompanyTelemetry` fetch is blocked, telemetry output is not live in execution.

### Status
**PARTIAL**

## Active Path Verdict

| Capability | Status |
|---|---|
| Price | PARTIAL |
| Metadata | PARTIAL |
| Historical | PARTIAL |
| Financials | NOT IMPLEMENTED for active UI path |
| News | PARTIAL at gateway level, NOT IMPLEMENTED in company-page UI |
| Search | PARTIAL |
| Telemetry | PARTIAL |

Primary runtime blocker across provider-backed paths:
- `ProviderCoordinator.invokeChain()` references `this.tracer.recordUsage(...)` even though `tracer` is not defined.
