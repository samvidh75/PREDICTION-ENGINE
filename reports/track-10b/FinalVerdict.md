# TRACK-10B Final Verdict

## Q1. Does TechnicalIndicatorEngine exist?

Yes.

Path: `C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\services\TechnicalIndicatorEngine.ts`

Evidence: class declaration at `src/services/TechnicalIndicatorEngine.ts:4`; calculation entrypoint at `:5`; latest snapshot entrypoint at `:171`.

Important status note: `git status --short` reports `?? src/services/TechnicalIndicatorEngine.ts`, so it exists in the current filesystem but is untracked.

## Q2. Is it executed?

Yes, in the current active backend intelligence route when feature snapshots are missing or incomplete.

Evidence:

`src/backend/web/routes/intelligence.ts:782-785`

```text
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
```

Runtime evidence: RELIANCE probe called the same module chain and produced non-null indicators from 249 Yahoo history candles.

## Q3. Are indicators reaching EngineInputs?

Yes.

Evidence: `src/backend/web/routes/intelligence.ts:812-825` maps feature values into `EngineInputs.features`.

RELIANCE runtime snapshot immediately before `StockStoryEngine.evaluate()`:

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

## Q4. Is MomentumEngine consuming them?

Partially.

Consumed and score-affecting in `MomentumEngine`:

| Field | Evidence |
|---|---|
| `rsi` | `src/stockstory/engines/MomentumEngine.ts:23-44` |
| `macd` | `src/stockstory/engines/MomentumEngine.ts:49-64` |
| `macdSignal` | `src/stockstory/engines/MomentumEngine.ts:50-64` |
| `macdHistogram` | `src/stockstory/engines/MomentumEngine.ts:48-67` |
| `adx` | `src/stockstory/engines/MomentumEngine.ts:70-79` |
| `atr` | `src/stockstory/engines/MomentumEngine.ts:112-123` |
| `volatility` | `src/stockstory/engines/MomentumEngine.ts:111-124` |
| `trendStrength` | `src/stockstory/engines/MomentumEngine.ts:82-92` |

Mapped but not directly consumed by `MomentumEngine`:

`momentum`, `relativeStrength`, `movingAverageDistance`, `bollingerWidth`.

## Q5. Do technical indicators change rankings?

Yes, in runtime evidence.

Five-symbol probe, computed technicals:

```text
ICICIBANK:36/38
RELIANCE:34/33
HDFCBANK:34/34
INFY:32/54
TCS:31/46
```

Same inputs with all technical fields null:

```text
RELIANCE:34/50
TCS:34/50
INFY:34/50
HDFCBANK:34/50
ICICIBANK:34/50
```

Technical indicators changed Momentum scores and changed the ordering in the computed sample.

## Q6. Which of TRACK-10 or TRACK-10A is correct?

TRACK-10 is closer to the current runtime reality, with one correction.

Correct TRACK-10 claims:

- `TechnicalIndicatorEngine` exists.
- Indicators are calculated.
- RSI/MACD/ATR/Momentum/Volatility are populated for RELIANCE in runtime evidence.
- Momentum scores differ by stock in the runtime sample.

Incorrect or overstated TRACK-10 chain detail:

- The active route does not use `MarketDataGateway -> TechnicalIndicatorEngine`. `MarketDataGateway.getHistory()` only returns raw history at `src/services/data/MarketDataGateway.ts:52-59`.
- The active technical execution path is `ProviderCoordinator -> TechnicalIndicatorEngine`, inside `src/backend/web/routes/intelligence.ts:780-785`.

TRACK-10A is not correct for the current codebase/runtime evidence:

- Technical fields were not all null for RELIANCE.
- Momentum score was not always 50. RELIANCE runtime Momentum score was `33`; the five-symbol computed sample produced `33`, `46`, `54`, `34`, and `38`.
