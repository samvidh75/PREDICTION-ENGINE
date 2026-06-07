# TRACK-10B EngineInputs Snapshot

Runtime probe target: RELIANCE

Execution path used:

`ProviderCoordinator.getHistory("RELIANCE", "1Y")` -> `TechnicalIndicatorEngine.latestComplete("RELIANCE", history)` -> `EngineInputs.features` -> `stockStoryEngine.evaluate(inputs)`.

Relevant source references:

| Step | File line(s) |
|---|---|
| Coordinator history call in route | `src/backend/web/routes/intelligence.ts:780-784` |
| Technical fallback calculation | `src/backend/web/routes/intelligence.ts:782-785` |
| Live feature mapping | `src/backend/web/routes/intelligence.ts:786-800` |
| EngineInputs.features mapping | `src/backend/web/routes/intelligence.ts:812-825` |
| StockStory evaluate call | `src/backend/web/routes/intelligence.ts:879-880` |

## Raw `EngineInputs.features` Immediately Before `StockStoryEngine.evaluate()`

```json
{
  "rsi": 34.70677733394581,
  "macd": -18.014188611238296,
  "macdSignal": -12.842867790644243,
  "macdHistogram": -5.171320820594053,
  "adx": 21.86106965754889,
  "atr": 25.81132019865621,
  "bollingerWidth": 0.08680196384558135,
  "momentum": -0.034010095764957844,
  "volatility": 0.19270252460867718,
  "relativeStrength": 0.00207528914056495,
  "movingAverageDistance": -0.04428391981777342,
  "trendStrength": -0.020706183052043605
}
```

## StockStory Output From Same Input

```json
{
  "healthScore": 37,
  "momentum": 33,
  "risk": 30,
  "classification": "Weakening",
  "engineMomentum": {
    "score": 33,
    "momentumScore": 30,
    "trendScore": 30,
    "volatilityScore": 43,
    "commentary": "Weakening momentum. Deteriorating technical structure suggests declining trend strength. Caution warranted."
  }
}
```

Note: a later five-stock ranking probe used the same computed RELIANCE features with a different minimal sector context and produced RELIANCE `health=34`, `momentum=33`. The Momentum result stayed `33`; the Health difference came from sector context/overall weighting inputs, not the technical feature snapshot.
