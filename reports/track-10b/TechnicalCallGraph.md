# TRACK-10B Technical Call Graph

## Actual Runtime Chain

```text
YahooProvider.getHistorical()
  src/services/providers/YahooProvider.ts:140-163
    returns HistoricalPoint[]

ProviderCoordinator.getHistory()
  src/services/providers/ProviderCoordinator.ts:101-103
    calls invokeChain(..., p.getHistory(symbol, range), "history", symbol)

intelligence route fallback
  src/backend/web/routes/intelligence.ts:780-785
    const coordinator = new ProviderCoordinator()
    const history = await coordinator.getHistory(sym, "1Y")
    const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history)

TechnicalIndicatorEngine.latestComplete()
  src/services/TechnicalIndicatorEngine.ts:171-178
    calls calculate(symbol, history)
    returns latest snapshot with RSI/MACD/ATR/momentum/volatility populated

TechnicalIndicatorEngine.calculate()
  src/services/TechnicalIndicatorEngine.ts:4-169
    calculates RSI, MACD, ADX, ATR, Bollinger width, momentum, volatility,
    relative strength, moving average distance, trend strength

EngineInputs.features
  src/backend/web/routes/intelligence.ts:812-825
    maps feat/liveFeat into rsi, macd, macdSignal, macdHistogram, adx, atr,
    bollingerWidth, momentum, volatility, relativeStrength,
    movingAverageDistance, trendStrength

StockStoryEngine.evaluate(engineInputs)
  src/backend/web/routes/intelligence.ts:879-880
  src/stockstory/StockStoryEngine.ts:52-60
    calls momentumEngine.evaluate(inputs) at :57

MomentumEngine.evaluate(inputs)
  src/stockstory/engines/MomentumEngine.ts:18-141
```

## Requested Chain Check

Requested:

```text
Yahoo history -> ProviderCoordinator -> MarketDataGateway -> TechnicalIndicatorEngine
```

Current code:

```text
Yahoo history -> ProviderCoordinator -> TechnicalIndicatorEngine
```

`MarketDataGateway.getHistory()` exists at `src/services/data/MarketDataGateway.ts:52-59`, but it only calls `this.coordinator.getHistory(symbol)` and returns raw `HistoricalPoint[]`. It does not import or call `TechnicalIndicatorEngine`.

`MarketDataGateway` import/reference evidence:

| File | Evidence |
|---|---|
| `src/services/data/MarketDataGateway.ts:4` | imports `ProviderCoordinator` |
| `src/services/data/MarketDataGateway.ts:11` | creates static coordinator |
| `src/services/data/MarketDataGateway.ts:52-59` | returns history from coordinator |

## Yahoo History Evidence

`YahooProvider.getHistory()` delegates to `getHistorical()`:

`src/services/providers/YahooProvider.ts:136-138`

`YahooProvider.getHistorical()` fetches Yahoo chart API and maps candles:

`src/services/providers/YahooProvider.ts:140-163`

Runtime RELIANCE evidence:

| Source | Range | Count | Last candle |
|---|---:|---:|---|
| `ProviderCoordinator.getHistory("RELIANCE", "1Y")` | 1Y | 249 | `2026-06-04`, close `1303.699951171875` |
| `MarketDataGateway.getHistory("RELIANCE")` | default 1M | 23 | `2026-06-04`, close `1303.699951171875` |

The gateway path returned history, but it did not calculate indicators.
