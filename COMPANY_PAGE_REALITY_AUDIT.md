# Company Page Reality Audit

Repository evidence inspected:
- `src/views/CompanySuperpage.tsx`
- `src/hooks/useCompanyData.ts`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/data/MarketDataGateway.ts`
- `src/services/telemetry/useCompanyTelemetry.ts`
- `src/services/telemetry/TelemetrySnapshotFactory.ts`
- `src/components/telemetry/TelemetryPanel.tsx`
- `src/components/telemetry/Healthometer.tsx`
- `src/components/telemetry/ConfidenceMeter.tsx`
- `src/components/telemetry/ValuationSignal.tsx`
- `src/components/telemetry/MomentumSignal.tsx`
- `src/services/dna/CompanyDNAEngine` usage in page
- `src/types/stock.ts`

## Reality Summary

`CompanySuperpage` is structurally wired to a live company data path:

`CompanySuperpage -> useCompanyData -> MarketDataOrchestrator -> MarketDataGateway -> ProviderCoordinator -> providers`

But live execution is blocked by the coordinator runtime error:
- `Cannot read properties of undefined (reading 'recordUsage')`

So the page is **wired**, but the live provider-backed data path is **not currently operational**.

## Field Reality Table

| Field Name | Data Source | Provider | Gateway | Mock? | Hardcoded? | Live? |
|---|---|---|---|---|---|---|
| `data.symbol` | `useCompanyData(symbol)` -> `MarketDataOrchestrator.fetchCompanyData()` | YahooProvider via coordinator path | Yes | No | No | No, blocked by coordinator error |
| `data.marketCap.numeric` | `CompanyTelemetry` from orchestrator | YahooProvider metadata path | Yes | No | No | No, blocked by coordinator error |
| `data.marketCap.formatted` | derived in orchestrator | YahooProvider metadata path | Yes | No | No | No, blocked by coordinator error |
| `data.peRatio` | orchestrator placeholder | none | Yes | No | Yes, `0` placeholder | No |
| `data.fiftyTwoWeekRange.current` | orchestrator derived from quote price | YahooProvider quote path | Yes | No | No | No, blocked by coordinator error |
| `data.fiftyTwoWeekRange.low/high` | orchestrator derived from quote price | YahooProvider quote path | Yes | No | No | No, blocked by coordinator error |
| `data.healthStatus` | orchestrator placeholder | none | Yes | No | Yes, `'stable' as any` | No |
| `data.lastUpdated` | quote timestamp | YahooProvider quote path | Yes | No | No | No, blocked by coordinator error |
| `telemetry.healthScore` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No, because source company data is blocked |
| `telemetry.healthStatus` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.confidenceScore` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.confidenceStatus` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.valuationScore` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.valuationStatus` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.momentumScore` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| `telemetry.momentumStatus` | `TelemetrySnapshotFactory.create(data)` | derived from company data | Indirect | No | No | No |
| Company title `"{data.symbol} Corp."` | JSX literal | none | No | No | Yes | No |
| Exchange label `NSE: {data.symbol}` | JSX literal + symbol | none | No | No | Yes | No |
| Current price display `₹{data.fiftyTwoWeekRange.current}` | orchestrator quote-derived value | YahooProvider quote path | Yes | No | No | No, blocked by coordinator error |
| DNA cards (`businessQuality`, `growth`, `stability`, `risk`, `sentiment`) | `CompanyDNAEngine.compute(data)` | derived from `CompanyTelemetry` | No direct gateway call | No | No | No, because source data is blocked |
| `RangeInfographic.performance` values | hardcoded object in page | none | No | No | Yes | No |
| `TelemetryMetrics.peIndustry` | hardcoded `28.2` | none | No | No | Yes | No |
| `StoryDocumentary` content | component-internal rendering | none | No | No | Likely yes / static | No |
| `BrokerRedirector` | component-internal navigation | none | No | No | No | N/A |

## Component Reality Notes

### `CompanySuperpage`
- Uses `useCompanyData`.
- The page is not reading directly from a mock dataset.
- Its live company telemetry is supposed to come from the market data gateway.
- The page includes several hardcoded UI values:
  - `peRatio: 0`
  - `healthStatus: 'stable' as any`
  - hardcoded range performance values
  - hardcoded industry PE `28.2`

### `TelemetryPanel`
- Pure presentation layer.
- Receives a `TelemetrySnapshot` and delegates to subcomponents.
- Data is synthetic/derived, not directly provider raw data.

### `Healthometer`, `ConfidenceMeter`, `ValuationSignal`, `MomentumSignal`
- These render derived telemetry values.
- They are not mock widgets.
- They are not directly live provider widgets either; they reflect factory-generated telemetry.

### `TelemetrySnapshotFactory`
- Converts `CompanyTelemetry` into `TelemetrySnapshot`.
- It depends on `HealthScoreEngine`, `ConfidenceScoreEngine`, `ValuationEngine`, and `MomentumEngine`.
- Because the upstream `CompanyTelemetry` fetch fails at runtime, these values are not live in practice.

## Final Verdict

- `CompanySuperpage` is **wired** to the provider stack.
- Several displayed fields are **hardcoded** or **derived**.
- The live provider-backed fields are **not live** today because the coordinator crashes before completion.

Overall company page status: **PARTIAL**
