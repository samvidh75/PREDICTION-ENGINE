# Telemetry Reality Audit

Repository evidence inspected:
- `src/services/telemetry/HealthScoreEngine.ts`
- `src/services/telemetry/ConfidenceScoreEngine.ts`
- `src/services/telemetry/ValuationEngine.ts`
- `src/services/telemetry/MomentumEngine.ts`
- `src/services/telemetry/TelemetrySnapshotFactory.ts`
- `src/services/telemetry/useCompanyTelemetry.ts`
- `src/types/stock.ts`
- `src/views/CompanySuperpage.tsx`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/data/MarketDataGateway.ts`
- `src/services/providers/ProviderCoordinator.ts`

## Reality Summary

Telemetry in this repository is a **derived presentation layer**, not a direct live market telemetry feed.

The telemetry engines calculate scores from:
- `peRatio`
- `currentPrice`
- 52-week range
- symbol length / ticker shape

Those inputs are only as live as the upstream company data pipeline. That pipeline is currently blocked by the coordinator runtime error:
- `Cannot read properties of undefined (reading 'recordUsage')`

So telemetry is **wired**, but not live end-to-end.

## Engine-by-Engine Reality Table

| Engine / Factory | Input Source | Calculation Basis | Provider Dependency | Hardcoded Constants | Classification |
|---|---|---|---|---|---|
| `HealthScoreEngine` | `peRatio`, `currentPrice`, `range.low`, `range.high` | Baseline score of 70, adjusted by PE bands and 52-week relative position | Indirect: depends on `CompanyTelemetry` from the market-data pipeline | Baseline `70`, thresholds `15/25/50`, range position thresholds `0.8/0.2` | **PARTIAL** |
| `ConfidenceScoreEngine` | `peRatio`, `symbol` | Baseline score of 75, adjusted by ticker length and PE predictability band | Indirect: depends on `CompanyTelemetry` from the market-data pipeline | Baseline `75`, symbol length threshold `<= 4`, PE bands `12/30/60` | **PARTIAL** |
| `ValuationEngine` | `peRatio` | Baseline score of 50, mapped to PE buckets | Indirect: depends on `CompanyTelemetry` from the market-data pipeline | Baseline `50`, PE buckets `<15`, `<28`, `<45` | **PARTIAL** |
| `MomentumEngine` | `currentPrice`, `range.low`, `range.high` | Position within 52-week range mapped to score | Indirect: depends on `CompanyTelemetry` from the market-data pipeline | Baseline `50`, direct range position mapping to 0–100 | **PARTIAL** |
| `TelemetrySnapshotFactory` | `CompanyTelemetry` | Combines the four engines into `TelemetrySnapshot` | Yes, via company data pipeline | No direct telemetry constants beyond engine defaults | **PARTIAL** |
| `useCompanyTelemetry` | `CompanyTelemetry | null` | Memoized conversion to snapshot via factory | Yes, through the upstream company data object | No | **PARTIAL** |

## Live / Synthetic / Hardcoded Classification

### `HealthScoreEngine`
- **Input source:** derived from company telemetry
- **Calculation:** synthetic scoring logic
- **Provider dependency:** indirect
- **Hardcoded constants:** yes
- **Classification:** **SYNTHETIC**

### `ConfidenceScoreEngine`
- **Input source:** derived from company telemetry
- **Calculation:** synthetic scoring logic
- **Provider dependency:** indirect
- **Hardcoded constants:** yes
- **Classification:** **SYNTHETIC**

### `ValuationEngine`
- **Input source:** derived from company telemetry
- **Calculation:** synthetic scoring logic
- **Provider dependency:** indirect
- **Hardcoded constants:** yes
- **Classification:** **SYNTHETIC**

### `MomentumEngine`
- **Input source:** derived from company telemetry
- **Calculation:** synthetic scoring logic
- **Provider dependency:** indirect
- **Hardcoded constants:** yes
- **Classification:** **SYNTHETIC**

### `TelemetrySnapshotFactory`
- **Input source:** `CompanyTelemetry`
- **Calculation:** synthetic composition of the four engines
- **Provider dependency:** indirect
- **Hardcoded constants:** inherited from engine defaults
- **Classification:** **PARTIAL**

## Wiring Reality

### What exists
- `useCompanyTelemetry()` is used by company page flow.
- `TelemetrySnapshotFactory` is used to generate the telemetry snapshot.
- Telemetry UI components consume the snapshot.

### What is missing
- The upstream company data fetch is blocked by the provider coordinator runtime error.
- Therefore telemetry does not receive live upstream values in execution.

### What is not hardcoded
- The telemetry UI values are not all fixed literals.
- The actual scores are computed dynamically from the `CompanyTelemetry` object.

### What is hardcoded
- The computation functions use fixed baselines and thresholds.
- Those values are embedded in the engine logic and are not provider-fed.

## Final Verdict

Telemetry is **not live end-to-end**.
It is a **synthetic scoring layer** that depends on upstream company data which is currently blocked.

Overall telemetry status: **PARTIAL**
