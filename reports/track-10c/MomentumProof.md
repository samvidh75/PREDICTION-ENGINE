# TRACK-10C Momentum Proof

Audited commit: `eebb77d1b875927057782791fa6f962d7b20fbe8`

## StockStoryEngine Calls MomentumEngine

`src/stockstory/StockStoryEngine.ts:52-60`

Evidence:

- `StockStoryEngine.evaluate(inputs)` begins at `src/stockstory/StockStoryEngine.ts:52`
- `momentumEngine.evaluate(inputs)` is called at `src/stockstory/StockStoryEngine.ts:57`

`src/stockstory/StockStoryEngine.ts:64-71` includes the Momentum score in sector-weighted health:

```text
momentum: momentum.score
```

Therefore, if `MomentumEngine` receives non-neutral technical features, it can affect the final score.

## MomentumEngine Input Fields

`MomentumEngine.evaluate(inputs)` reads `features` and `historical` at `src/stockstory/engines/MomentumEngine.ts:18-19`.

Consumed fields:

| Field | Consumption lines | Score effect |
|---|---|---|
| `rsi` | `src/stockstory/engines/MomentumEngine.ts:23-44` | affects `momentumScore` at `:96-99` |
| `macd` | `src/stockstory/engines/MomentumEngine.ts:49-64` | affects `momentumScore` at `:96-99` |
| `macdSignal` | `src/stockstory/engines/MomentumEngine.ts:50-64` | affects `momentumScore` at `:96-99` |
| `macdHistogram` | `src/stockstory/engines/MomentumEngine.ts:48-67` | affects `momentumScore` at `:96-99` |
| `adx` | `src/stockstory/engines/MomentumEngine.ts:70-79` | affects `trendScore` at `:103-106` |
| `atr` | `src/stockstory/engines/MomentumEngine.ts:112-123` | affects `volatilityScore` at `:120-123` |
| `volatility` | `src/stockstory/engines/MomentumEngine.ts:111-124` | affects `volatilityScore` at `:120-123` |
| `trendStrength` | `src/stockstory/engines/MomentumEngine.ts:82-92` | affects `trendScore` at `:103-106` |

Mapped but not directly consumed by `MomentumEngine` in HEAD:

```text
momentum
relativeStrength
movingAverageDistance
bollingerWidth
```

## MomentumEngine Calculation Formula

Source lines:

- RSI score: `src/stockstory/engines/MomentumEngine.ts:21-44`
- MACD score: `src/stockstory/engines/MomentumEngine.ts:46-67`
- ADX score: `src/stockstory/engines/MomentumEngine.ts:69-79`
- trend strength score: `src/stockstory/engines/MomentumEngine.ts:81-92`
- `momentumScore`: `src/stockstory/engines/MomentumEngine.ts:94-99`
- `trendScore`: `src/stockstory/engines/MomentumEngine.ts:101-106`
- `volatilityScore`: `src/stockstory/engines/MomentumEngine.ts:108-124`
- final Momentum composite: `src/stockstory/engines/MomentumEngine.ts:126-131`

Final formula:

```text
momentumScore = weightedAverage([
  { score: rsiScore, weight: 5 },
  { score: macdScore, weight: 5 }
])

trendScore = weightedAverage([
  { score: adxScore, weight: 4 },
  { score: trendStrengthScore, weight: 6 }
])

volatilityScore = weightedAverage([
  { score: mappedVol, weight: 6 },
  { score: mappedAtr, weight: 4 }
])

compositeScore = weightedAverage([
  { score: momentumScore, weight: 5 },
  { score: trendScore, weight: 3 },
  { score: volatilityScore, weight: 2 }
])
```

## RELIANCE Runtime Probe

Attempted against a clean detached HEAD worktree at:

```text
C:\Users\Samvidh\AppData\Local\Temp\stockstory-track10c-head
```

The probe used HEAD route-equivalent logic:

```text
feature_snapshots query
factor_snapshots query
financial_snapshots query
EngineInputs mapping
stockStoryEngine.evaluate(inputs)
```

Runtime failed before `EngineInputs` could be printed because the configured database was unavailable:

```text
AggregateError [ECONNREFUSED]
connect ECONNREFUSED ::1:5432
connect ECONNREFUSED 127.0.0.1:5432
```

No RELIANCE `EngineInputs.features`, actual Momentum input values, actual Momentum component calculations, baseline score, disabled-Momentum score, or delta can be truthfully reported for current HEAD without a reachable database, because HEAD reads those values from `feature_snapshots`.

## Disable MomentumEngine Rerun

Not completed with actual RELIANCE production inputs because the database connection failed before `EngineInputs` could be constructed.

No substitute values were used.
