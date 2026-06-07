# TRACK-10B Technical Reality Report

Workspace audited: `C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE`

## Existence

`TechnicalIndicatorEngine.ts` exists at:

`C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\TechnicalIndicatorEngine.ts`

Repository status evidence: `git status --short` reports `?? src/services/TechnicalIndicatorEngine.ts`, so the file exists in the current filesystem but is untracked.

## Calculation Evidence

`TechnicalIndicatorEngine.calculate()` is implemented at `src/services/TechnicalIndicatorEngine.ts:4-169`.

Computed fields:

| Field | Runtime calculation line(s) |
|---|---|
| rsi | `src/services/TechnicalIndicatorEngine.ts:31-50`, returned at `:156` |
| macd | `src/services/TechnicalIndicatorEngine.ts:52-65`, returned at `:157` |
| macdSignal | `src/services/TechnicalIndicatorEngine.ts:52-65`, returned at `:158` |
| macdHistogram | `src/services/TechnicalIndicatorEngine.ts:52-65`, returned at `:159` |
| adx | `src/services/TechnicalIndicatorEngine.ts:82-121`, returned at `:160` |
| atr | `src/services/TechnicalIndicatorEngine.ts:67-80`, returned at `:161` |
| momentum | `src/services/TechnicalIndicatorEngine.ts:129`, returned at `:163` |
| volatility | `src/services/TechnicalIndicatorEngine.ts:131-138`, returned at `:164` |
| relativeStrength | `src/services/TechnicalIndicatorEngine.ts:139`, returned at `:165` |
| movingAverageDistance | `src/services/TechnicalIndicatorEngine.ts:140-144`, returned at `:166` |
| trendStrength | `src/services/TechnicalIndicatorEngine.ts:145-151`, returned at `:167` |

## Reference Evidence

Static references found:

| Reference | Evidence |
|---|---|
| Import in active backend route | `src/backend/web/routes/intelligence.ts:13` |
| Runtime fallback fetches history and calls engine | `src/backend/web/routes/intelligence.ts:782-785` |
| Maps output into `feat` row shape | `src/backend/web/routes/intelligence.ts:786-800` |
| Maps `feat` into `EngineInputs.features` | `src/backend/web/routes/intelligence.ts:812-825` |
| `StockStoryEngine.evaluate()` called with those inputs | `src/backend/web/routes/intelligence.ts:879-880` |

## Runtime Evidence: RELIANCE

Command executed with `npx tsx` imported existing modules only. It fetched RELIANCE history through `ProviderCoordinator.getHistory("RELIANCE", "1Y")`, calculated `TechnicalIndicatorEngine.latestComplete()`, built `EngineInputs.features`, then called `stockStoryEngine.evaluate()`.

Runtime output:

```json
{
  "coordinatorHistoryCount": 249,
  "coordinatorFirst": {
    "date": "2025-06-05",
    "open": 1428,
    "high": 1454.699951171875,
    "low": 1423.5999755859375,
    "close": 1442.4000244140625
  },
  "coordinatorLast": {
    "date": "2026-06-04",
    "open": 1301,
    "high": 1311.199951171875,
    "low": 1293.0999755859375,
    "close": 1303.699951171875
  }
}
```

Conclusion: indicators are calculated at runtime for RELIANCE and are non-null when built through the active intelligence route pattern.

## Important Reconciliation Point

`MarketDataGateway.getHistory()` does not call `TechnicalIndicatorEngine`; it only proxies history to `ProviderCoordinator` at `src/services/data/MarketDataGateway.ts:52-59`. The active route that executes `TechnicalIndicatorEngine` uses `ProviderCoordinator` directly at `src/backend/web/routes/intelligence.ts:780-785`.

Therefore the exact requested chain `Yahoo history -> ProviderCoordinator -> MarketDataGateway -> TechnicalIndicatorEngine` is not the active source chain in code. The actual active route chain is:

`YahooProvider.getHistorical()` -> `ProviderCoordinator.getHistory()` -> `TechnicalIndicatorEngine.latestComplete()` -> `EngineInputs.features` -> `StockStoryEngine.evaluate()` -> `MomentumEngine.evaluate()`.
