# TRACK-10B Momentum Consumption Audit

Runtime target: RELIANCE

## MomentumEngine Inputs

Source: `EngineInputs.features` passed into `MomentumEngine.evaluate(inputs)` by `StockStoryEngine.evaluate()` at `src/stockstory/StockStoryEngine.ts:52-60`, specifically `momentumEngine.evaluate(inputs)` at `:57`.

```json
{
  "features": {
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
  },
  "historicalFeatureHistoryLast5": [
    { "tradeDate": "2026-05-29", "rsi": 38.42105077324703, "macdHistogram": -3.7711149448956798, "adx": 17.100599407065395, "volatility": 0.22014895000349324 },
    { "tradeDate": "2026-06-01", "rsi": 38.181920069631666, "macdHistogram": -4.443678805721646, "adx": 17.934103470316774, "volatility": 0.19852208057366164 },
    { "tradeDate": "2026-06-02", "rsi": 37.06393885353852, "macdHistogram": -4.8939576049302325, "adx": 19.257375149658333, "volatility": 0.1975940842451997 },
    { "tradeDate": "2026-06-03", "rsi": 36.76338877299255, "macdHistogram": -4.914883100591268, "adx": 20.486127423332636, "volatility": 0.19285857434765438 },
    { "tradeDate": "2026-06-04", "rsi": 34.70677733394581, "macdHistogram": -5.171320820594053, "adx": 21.86106965754889, "volatility": 0.19270252460867718 }
  ]
}
```

## Component Calculations

Source logic:

| Component | Source line(s) |
|---|---|
| RSI score | `src/stockstory/engines/MomentumEngine.ts:21-44` |
| MACD score | `src/stockstory/engines/MomentumEngine.ts:46-67` |
| ADX score | `src/stockstory/engines/MomentumEngine.ts:69-79` |
| Trend strength score | `src/stockstory/engines/MomentumEngine.ts:81-92` |
| Momentum subscore | `src/stockstory/engines/MomentumEngine.ts:94-99` |
| Trend subscore | `src/stockstory/engines/MomentumEngine.ts:101-106` |
| Volatility subscore | `src/stockstory/engines/MomentumEngine.ts:108-124` |
| Final composite | `src/stockstory/engines/MomentumEngine.ts:126-131` |

Runtime calculations:

```json
{
  "rsi": 34.70677733394581,
  "rsiTrend": -0.8847078175241586,
  "rsiScore": 35,
  "macd": -18.014188611238296,
  "macdSig": -12.842867790644243,
  "macdHist": -5.171320820594053,
  "macdDiff": -5.171320820594053,
  "macdScore": 25,
  "adx": 21.86106965754889,
  "adxScore": 45,
  "trendStrength": -0.020706183052043605,
  "trendStrengthScore": 20,
  "vol": 0.19270252460867718,
  "atr": 25.81132019865621,
  "mappedVol": 71,
  "mappedAtr": 0,
  "momentumScore": 30,
  "trendScore": 30,
  "volatilityScore": 43,
  "compositeScore": 33
}
```

## Field-by-Field Audit

| Field | Computed | Mapped to EngineInputs | Consumed | Affects score |
|---|---|---|---|---|
| `rsi` | Yes, `TechnicalIndicatorEngine.ts:31-50` | Yes, `intelligence.ts:813` | Yes, Momentum `:23-44`; historical RSI trend `:36-44` | Yes, via Momentum `:96-99`, final `:127-131` |
| `macd` | Yes, `TechnicalIndicatorEngine.ts:52-65` | Yes, `intelligence.ts:814` | Yes, Momentum `:49-64` | Yes, via Momentum `:96-99`, final `:127-131` |
| `macdSignal` | Yes, `TechnicalIndicatorEngine.ts:52-65` | Yes, `intelligence.ts:815` | Yes, Momentum `:50-64` | Yes, via Momentum `:96-99`, final `:127-131` |
| `macdHistogram` | Yes, `TechnicalIndicatorEngine.ts:52-65` | Yes, `intelligence.ts:816` | Yes, Momentum `:48-67`; historical type `types.ts:75` | Yes, via Momentum `:96-99`, final `:127-131` |
| `adx` | Yes, `TechnicalIndicatorEngine.ts:82-121` | Yes, `intelligence.ts:817` | Yes, Momentum `:70-79`; historical RSI divergence inputs include ADX history shape at `types.ts:75` | Yes, via Trend `:103-106`, final `:127-131` |
| `atr` | Yes, `TechnicalIndicatorEngine.ts:67-80` | Yes, `intelligence.ts:818` | Yes, Momentum volatility branch `:112-123` | Yes, via Volatility subscore `:120-123`, final `:127-131` |
| `momentum` | Yes, `TechnicalIndicatorEngine.ts:129` | Yes, `intelligence.ts:820` | No direct `MomentumEngine` consumption found | No direct score effect found |
| `volatility` | Yes, `TechnicalIndicatorEngine.ts:131-138` | Yes, `intelligence.ts:821` | Yes, Momentum `:111-124`; Stability `StabilityEngine.ts:47-60`; Risk `RiskEngine.ts:85-95`; Volatility penalty `VolatilityPenalty.ts:16-25` | Yes, affects Momentum, Stability, Risk, and penalties |
| `relativeStrength` | Yes, `TechnicalIndicatorEngine.ts:139` | Yes, `intelligence.ts:822` | No engine consumption found in audited scoring path | No direct score effect found |
| `movingAverageDistance` | Yes, `TechnicalIndicatorEngine.ts:140-144` | Yes, `intelligence.ts:823` | No engine consumption found in audited scoring path | No direct score effect found |
| `trendStrength` | Yes, `TechnicalIndicatorEngine.ts:145-151` | Yes, `intelligence.ts:824` | Yes, Momentum `:82-92` | Yes, via Trend `:103-106`, final `:127-131` |

## Ranking Impact Runtime Probe

Five live symbols evaluated twice:

1. with computed technical indicators from `TechnicalIndicatorEngine.latestComplete()`
2. with every technical field set to `null`

Computed ranking:

```text
ICICIBANK:36/38
RELIANCE:34/33
HDFCBANK:34/34
INFY:32/54
TCS:31/46
```

Null-technical ranking:

```text
RELIANCE:34/50
TCS:34/50
INFY:34/50
HDFCBANK:34/50
ICICIBANK:34/50
```

Conclusion: technical indicators changed Momentum scores and changed ordering in this runtime sample.
