# TRACK-10C Technical Pipeline Proof

Audited commit: `eebb77d1b875927057782791fa6f962d7b20fbe8`

## TechnicalIndicatorEngine Existence

HEAD check:

```text
git show HEAD:src/services/TechnicalIndicatorEngine.ts
```

Result:

```text
fatal: path 'src/services/TechnicalIndicatorEngine.ts' exists on disk, but not in 'HEAD'
```

Conclusion: `src/services/TechnicalIndicatorEngine.ts` is absent from current HEAD.

## Imports and References

HEAD check:

```text
git grep -n "TechnicalIndicatorEngine" HEAD -- .
```

Result: no matches.

Conclusion: current HEAD has no tracked import or reference to `TechnicalIndicatorEngine`.

## Requested Path

Requested:

```text
YahooProvider
-> ProviderCoordinator
-> MarketDataGateway
-> TechnicalIndicatorEngine
-> EngineInputs
-> MomentumEngine
-> StockStoryEngine
```

Current HEAD result: this path does not exist because `TechnicalIndicatorEngine` is absent from HEAD and has no references.

## Existing HEAD Paths

### YahooProvider History Path

`src/services/providers/YahooProvider.ts:136-163`

```text
getHistory() -> getHistorical() -> Yahoo chart API -> HistoricalPoint[]
```

Line evidence:

- `getHistory()` delegates to `getHistorical()` at `src/services/providers/YahooProvider.ts:136-138`.
- `getHistorical()` fetches Yahoo chart data at `src/services/providers/YahooProvider.ts:140-147`.
- It maps Yahoo candles to `HistoricalPoint[]` at `src/services/providers/YahooProvider.ts:153-162`.

### ProviderCoordinator History Path

`src/services/providers/ProviderCoordinator.ts:101-103`

```text
getHistory(symbol, range) -> invokeChain(historicalProviders, p.getHistory(...))
```

### MarketDataGateway History Path

`src/services/data/MarketDataGateway.ts:1-60`

Evidence:

- imports `ProviderCoordinator` at `src/services/data/MarketDataGateway.ts:4`
- creates static coordinator at `src/services/data/MarketDataGateway.ts:10-11`
- `getHistory()` calls `this.coordinator.getHistory(symbol)` at `src/services/data/MarketDataGateway.ts:52-58`
- returns raw `HistoricalPoint[]` at `src/services/data/MarketDataGateway.ts:59`

No `TechnicalIndicatorEngine` import or call exists in `MarketDataGateway` at HEAD.

### StockStory Route Input Path

HEAD `/api/stockstory/:symbol` does not use Yahoo history or `MarketDataGateway` to build technical features. It reads database snapshots:

- feature snapshot query: `src/backend/web/routes/intelligence.ts:743-747`
- historical feature query: `src/backend/web/routes/intelligence.ts:761-766`
- `EngineInputs.features` mapping: `src/backend/web/routes/intelligence.ts:779-800`
- `stockStoryEngine.evaluate(engineInputs)`: `src/backend/web/routes/intelligence.ts:879-880`

Actual HEAD production path for StockStory technical features:

```text
feature_snapshots table
-> EngineInputs.features
-> StockStoryEngine.evaluate()
-> MomentumEngine.evaluate()
```

There is no HEAD path:

```text
YahooProvider -> ProviderCoordinator -> MarketDataGateway -> TechnicalIndicatorEngine -> EngineInputs
```
