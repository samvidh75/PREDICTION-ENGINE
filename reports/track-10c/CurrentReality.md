# TRACK-10C Current Reality

Audited commit: `eebb77d1b875927057782791fa6f962d7b20fbe8`

## Current HEAD Truth

`TechnicalIndicatorEngine` is not present in current HEAD.

Evidence:

```text
git show HEAD:src/services/TechnicalIndicatorEngine.ts
fatal: path 'src/services/TechnicalIndicatorEngine.ts' exists on disk, but not in 'HEAD'
```

No HEAD references:

```text
git grep -n "TechnicalIndicatorEngine" HEAD -- .
```

Result: no matches.

## Working Tree Explanation

The working tree is dirty and contains:

```text
?? src/services/TechnicalIndicatorEngine.ts
 M src/backend/web/routes/intelligence.ts
 M src/services/providers/ProviderCoordinator.ts
```

That explains the report conflict:

- audits that looked at the working tree saw an untracked `TechnicalIndicatorEngine`
- this audit, constrained to current HEAD only, does not

## HEAD Technical Feature Source

Current HEAD `/api/stockstory/:symbol` reads features from the database, not from Yahoo runtime calculation:

- `feature_snapshots` latest row query: `src/backend/web/routes/intelligence.ts:743-747`
- `EngineInputs.features` mapping: `src/backend/web/routes/intelligence.ts:779-800`
- historical feature query: `src/backend/web/routes/intelligence.ts:761-766`
- evaluate call: `src/backend/web/routes/intelligence.ts:879-880`

## MomentumEngine Status

`MomentumEngine` exists and is active in HEAD.

- `StockStoryEngine.evaluate()` calls `momentumEngine.evaluate(inputs)` at `src/stockstory/StockStoryEngine.ts:57`
- Momentum participates in health weighting at `src/stockstory/StockStoryEngine.ts:64-71`
- `MomentumEngine` consumes `rsi`, `macd`, `macdSignal`, `macdHistogram`, `adx`, `atr`, `volatility`, and `trendStrength` at `src/stockstory/engines/MomentumEngine.ts:23-131`

## Runtime Limitation

The RELIANCE route-equivalent runtime probe could not reach the configured database:

```text
AggregateError [ECONNREFUSED]
connect ECONNREFUSED ::1:5432
connect ECONNREFUSED 127.0.0.1:5432
```

Because HEAD sources `EngineInputs.features` from `feature_snapshots`, RELIANCE field population and score delta cannot be established from runtime evidence until the database is reachable.
