# Company Page Truth Audit

Repository evidence inspected:
- `src/views/CompanySuperpage.tsx`
- `src/hooks/useCompanyData.ts`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/data/MarketDataGateway.ts`
- `src/services/providers/ProviderCoordinator.ts`
- `src/services/telemetry/useCompanyTelemetry.ts`
- `src/services/telemetry/TelemetrySnapshotFactory.ts`
- `src/services/telemetry/HealthScoreEngine.ts`
- `src/services/telemetry/ConfidenceScoreEngine.ts`
- `src/services/telemetry/ValuationEngine.ts`
- `src/services/telemetry/MomentumEngine.ts`
- `src/components/telemetry/TelemetryPanel.tsx`
- `src/components/telemetry/Healthometer.tsx`
- `src/components/telemetry/ConfidenceMeter.tsx`
- `src/components/telemetry/ValuationSignal.tsx`
- `src/components/telemetry/MomentumSignal.tsx`
- `src/components/charts/VOSChart.tsx`
- `src/components/RangeInfographic.tsx`
- `src/components/StoryDocumentary.tsx`
- `src/components/TelemetryMetrics.tsx`

## Truth Summary

`CompanySuperpage` is connected to a market-data pipeline, but that pipeline is currently blocked by the coordinator runtime error:
- `Cannot read properties of undefined (reading 'recordUsage')`

So the page is **wired** to provider-backed data, but live execution is **not functional** end-to-end.

## Field-by-Field Truth Table

| Field | Source in `CompanySuperpage` | Provider | Live or Mock | Hardcoded? | Truth Status |
|---|---|---|---|---|---|
| Price | `data.fiftyTwoWeekRange.current` from `useCompanyData` | YahooProvider via `MarketDataGateway` → `ProviderCoordinator` | Intended live, but blocked | No | **PARTIAL** |
| Market Cap | `data.marketCap.numeric` from `useCompanyData` | YahooProvider metadata path via coordinator | Intended live, but blocked | No | **PARTIAL** |
| Sector | Not rendered in `src/views/CompanySuperpage.tsx` | None | N/A | N/A | **NOT IMPLEMENTED in this view** |
| Industry | Not rendered in `src/views/CompanySuperpage.tsx` | None | N/A | N/A | **NOT IMPLEMENTED in this view** |
| PE | `data.peRatio` in `CompanySuperpage` data object, but set in orchestrator as `0` | None; placeholder in orchestrator | Mock/placeholder | Yes, `0` | **HARDCODED / NOT LIVE** |
| Historical Performance | `RangeInfographic.performance` object | None | Mock | Yes, fixed values (`3M`, `6M`, `9M`, `3Y`, `5Y`) | **HARDCODED** |
| Telemetry | `useCompanyTelemetry(data)` → `TelemetrySnapshotFactory.create(data)` → `TelemetryPanel` | Derived from `CompanyTelemetry` | Intended live, but blocked upstream | No | **PARTIAL** |
| News | Not rendered in `src/views/CompanySuperpage.tsx` | FinnhubProvider exists in codebase, but not consumed here | N/A for this view | N/A | **NOT IMPLEMENTED in this view** |

## Supporting Evidence

### 1) Price and market cap
- `useCompanyData(symbol)` calls `MarketDataOrchestrator.fetchCompanyData(symbol)`.
- `MarketDataOrchestrator` calls:
  - `MarketDataGateway.getQuote(symbol)`
  - `MarketDataGateway.getCompany(symbol)`
- `MarketDataGateway` delegates to `ProviderCoordinator`.
- `ProviderCoordinator` registers Yahoo and optional AlphaVantage/Finnhub providers.
- Runtime fails before data returns because `ProviderCoordinator.invokeChain()` calls `this.tracer.recordUsage(...)` on an undefined tracer field.

### 2) PE
- `MarketDataOrchestrator` sets `peRatio: 0`.
- There is no provider-fed PE source in the company page path.
- Telemetry engines use this zero value, so the PE-based score is not live.

### 3) Historical performance
- `RangeInfographic.performance` is a hardcoded object in the view.
- These values are not fetched from any provider or service.

### 4) Telemetry
- `useCompanyTelemetry()` transforms the `CompanyTelemetry` object.
- `TelemetrySnapshotFactory` calculates score cards using:
  - `HealthScoreEngine`
  - `ConfidenceScoreEngine`
  - `ValuationEngine`
  - `MomentumEngine`
- These engines are pure computation layers, but the input object is blocked upstream.

### 5) News
- `src/views/CompanySuperpage.tsx` does not render any provider-backed news feed.
- News exists at the provider/gateway layer but is not consumed by this view.

## Final Verdict

- Price: **PARTIAL**
- Market Cap: **PARTIAL**
- Sector: **NOT IMPLEMENTED in this view**
- Industry: **NOT IMPLEMENTED in this view**
- PE: **HARDCODED / NOT LIVE**
- Historical Performance: **HARDCODED**
- Telemetry: **PARTIAL**
- News: **NOT IMPLEMENTED in this view**

Overall company page truth status: **PARTIAL**
