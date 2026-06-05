# TRACK-10C Final Verdict

## Q1. What commit was audited?

`eebb77d1b875927057782791fa6f962d7b20fbe8`

Branch: `main`

## Q2. Does TechnicalIndicatorEngine exist?

In current HEAD: no.

`src/services/TechnicalIndicatorEngine.ts` exists on disk as an untracked working-tree file, but it is not in HEAD.

Evidence:

```text
fatal: path 'src/services/TechnicalIndicatorEngine.ts' exists on disk, but not in 'HEAD'
```

## Q3. Is it executed?

In current HEAD: no.

`git grep -n "TechnicalIndicatorEngine" HEAD -- .` returned no matches. A file absent from HEAD with no HEAD references cannot be executed by HEAD code.

## Q4. Are technical features populated?

Unknown for RELIANCE under runtime evidence, because current HEAD reads technical features from `feature_snapshots`, and the configured database was unreachable.

Static HEAD evidence shows where population would come from:

- latest feature query: `src/backend/web/routes/intelligence.ts:743-747`
- mapping to `EngineInputs.features`: `src/backend/web/routes/intelligence.ts:779-800`

Runtime probe failed before values could be printed:

```text
connect ECONNREFUSED ::1:5432
connect ECONNREFUSED 127.0.0.1:5432
```

No assumption was made about whether the database row has null or populated values.

## Q5. Does MomentumEngine consume them?

Yes, if `EngineInputs.features` contains values.

`MomentumEngine` consumes:

```text
rsi, macd, macdSignal, macdHistogram, adx, atr, volatility, trendStrength
```

Evidence: `src/stockstory/engines/MomentumEngine.ts:23-131`.

Mapped but not directly consumed by `MomentumEngine`:

```text
momentum, relativeStrength, movingAverageDistance, bollingerWidth
```

## Q6. Does MomentumEngine change scores?

The code path says Momentum participates in score calculation:

- `StockStoryEngine` calls `momentumEngine.evaluate(inputs)` at `src/stockstory/StockStoryEngine.ts:57`
- health weighting includes `momentum: momentum.score` at `src/stockstory/StockStoryEngine.ts:64-71`

But the requested RELIANCE baseline vs disabled-Momentum runtime delta could not be produced because the HEAD database dependency was unavailable. Therefore the RELIANCE numeric delta is not established in this audit.

## Q7. Which prior report is obsolete?

For current HEAD, TRACK-10 is obsolete where it claims `TechnicalIndicatorEngine` exists and is active in production.

TRACK-10A Reality Audit is closest on `TechnicalIndicatorEngine` inactivity for HEAD, but any claim that all RELIANCE technical fields are null is not proven here because the database was unreachable.

TRACK-10A Engine Weight Audit is statically compatible with HEAD only in the sense that `MomentumEngine` is active and participates in health scoring. Its exact `15.15%` runtime contribution was not revalidated here because RELIANCE inputs could not be loaded.

## Q8. What is the current truth?

Current HEAD truth:

```text
TechnicalIndicatorEngine is not part of HEAD.
No HEAD code imports or executes TechnicalIndicatorEngine.
The requested YahooProvider -> ProviderCoordinator -> MarketDataGateway -> TechnicalIndicatorEngine -> EngineInputs path does not exist.
HEAD StockStory technical inputs come from feature_snapshots, then EngineInputs.features, then StockStoryEngine, then MomentumEngine.
MomentumEngine is active and consumes technical fields if the database supplies them.
RELIANCE field population and baseline-vs-disabled-Momentum delta could not be proven because the configured database refused connections.
```
