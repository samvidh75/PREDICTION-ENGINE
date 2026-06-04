# Provider Wiring Audit

Repository evidence inspected:
- `src/services/providers/YahooProvider.ts`
- `src/services/providers/AlphaVantageProvider.ts`
- `src/services/providers/FinnhubProvider.ts`
- `src/services/providers/ProviderCoordinator.ts`
- `src/services/data/MarketDataGateway.ts`
- `src/views/CompanySuperpage.tsx`
- `src/hooks/useCompanyData.ts`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/telemetry/useCompanyTelemetry.ts`
- `src/services/telemetry/TelemetrySnapshotFactory.ts`
- `src/components/navigation/CommandCentreSearch.tsx`
- `src/components/navigation/CommandCentre.tsx`

## Method-by-Method Wiring Status

Status legend:
- **COMPLETE** = exists, registered, called, and consumed by UI
- **PARTIAL** = exists and is wired, but blocked or not fully consumed
- **DEAD CODE** = exists, but not registered or not consumed by the active UI path

### YahooProvider

| Method | Exists | Registered | Called | Consumed by UI | Status |
|---|---|---|---|---|---|
| `getQuote(symbol)` | Yes | Yes, via `ProviderCoordinator` | Yes, via `MarketDataGateway.getQuote()` | Yes, via `useCompanyData` → `CompanySuperpage` | PARTIAL |
| `getMetadata(symbol)` | Yes | Yes, via `ProviderCoordinator` | Yes, via `MarketDataGateway.getCompany()` | Yes, via `useCompanyData` → `CompanySuperpage` | PARTIAL |
| `getHistory(symbol)` | Yes | Yes, via `ProviderCoordinator` | Yes, via `MarketDataGateway.getHistory()` and live validation script | Yes, indirectly via validation and chart/history surfaces | PARTIAL |

### AlphaVantageProvider

| Method | Exists | Registered | Called | Consumed by UI | Status |
|---|---|---|---|---|---|
| `getQuote(symbol)` | Yes | Yes, conditionally via `ProviderCoordinator` | Yes, via gateway quote path if selected by coordinator | Yes, indirectly through company page data path | PARTIAL |
| `getHistory(symbol)` | Yes | Yes, conditionally via `ProviderCoordinator` | Yes, via gateway history path if selected by coordinator | Yes, indirectly through validation/history path | PARTIAL |

### FinnhubProvider

| Method | Exists | Registered | Called | Consumed by UI | Status |
|---|---|---|---|---|---|
| `getMetadata(symbol)` | Yes | Yes, conditionally via `ProviderCoordinator` | Yes, via `MarketDataGateway.getCompany()` if selected | Yes, indirectly through company page data path | PARTIAL |
| `getNews(symbol)` | Yes | Yes, conditionally via `ProviderCoordinator` | Yes, via `MarketDataGateway.getNews()` | No active company-page consumer in inspected UI | PARTIAL |
| `getFinancials(symbol)` | Yes | Yes, conditionally via `ProviderCoordinator` | Yes, via coordinator method | No inspected active UI consumer | PARTIAL |

### ProviderCoordinator

| Method | Exists | Registered | Called | Consumed by UI | Status |
|---|---|---|---|---|---|
| `getQuote(symbol)` | Yes | N/A | Yes, via gateway | Yes, via company page/validation path | PARTIAL |
| `getMetadata(symbol)` | Yes | N/A | Yes, via gateway | Yes, via company page/validation path | PARTIAL |
| `getHistory(symbol)` | Yes | N/A | Yes, via gateway | Yes, via validation/history path | PARTIAL |
| `getNews(symbol)` | Yes | N/A | Yes, via gateway | No active company-page consumer | PARTIAL |
| `getFinancials(symbol)` | Yes | N/A | Not observed through active UI path | No active UI consumer | DEAD CODE for active UI path |

### MarketDataGateway

| Method | Exists | Registered | Called | Consumed by UI | Status |
|---|---|---|---|---|---|
| `getQuote(symbol)` | Yes | N/A | Yes, from orchestrator and validation script | Yes, company page UI | PARTIAL |
| `getCompany(symbol)` | Yes | N/A | Yes, from orchestrator | Yes, company page UI | PARTIAL |
| `getHistory(symbol)` | Yes | N/A | Yes, from validation script | Indirect only | PARTIAL |
| `getNews(symbol)` | Yes | N/A | Yes, at gateway level | No active company-page consumer | PARTIAL |

## Wiring Conclusions

### COMPLETE
None of the audited provider methods are complete end-to-end because runtime execution is blocked by the coordinator tracer error.

### PARTIAL
Most provider methods are structurally wired:
- providers exist
- coordinator registers them
- gateway calls them
- UI depends on the gateway path

But the path is not executable end-to-end because:
- `ProviderCoordinator.invokeChain()` calls `this.tracer.recordUsage(...)`
- `tracer` is not defined or initialized

### DEAD CODE
`ProviderCoordinator.getFinancials()` is the clearest dead path for the active UI surface:
- it exists
- Finnhub supports it
- but no inspected active UI path consumes financials from the gateway

## UI Consumption Notes

### CompanySuperpage
- consumes quote and metadata indirectly through `useCompanyData`
- consumes telemetry through `useCompanyTelemetry`
- does not consume provider-backed news or financials directly

### CommandCentreSearch / CommandCentre
- consume registry/index search, not provider-backed search
- do not touch provider methods

## Final Verdict

Provider wiring exists, but the active provider stack is not operational because the coordinator runtime path fails before results can return.

Overall wiring status: **PARTIAL**
