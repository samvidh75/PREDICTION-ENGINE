# Field-to-Engine Mapping — TRACK-11

**Date:** 2026-06-06

---

## Complete Engine Input Consumption Matrix

### EngineInputs.financials → Engine mapping

| Field | GrowthEngine | QualityEngine | StabilityEngine | MomentumEngine | ValuationEngine | RiskEngine | AccountingEngine | ConfidenceEngine | **Consumers** |
|-------|:-----------:|:------------:|:---------------:|:--------------:|:---------------:|:---------:|:----------------:|:----------------:|:-----------:|
| `peRatio` | — | — | — | — | **YES** (primary) | — | — | YES (important) | 2 |
| `pbRatio` | — | — | — | — | **YES** (primary) | — | — | YES (important) | 2 |
| `eps` | — | — | — | — | — | — | — | YES (suppl.) | **1** |
| `dividendYield` | — | — | — | — | — | — | — | YES (suppl.) | **1** |
| `beta` | — | — | — | — | — | **YES** (amplifier) | — | YES (suppl.) | 2 |
| `marketCap` | — | — | — | — | — | **YES** (anomaly) | — | YES (suppl.) | 2 |
| `freeFloat` | — | — | — | — | — | — | — | YES (suppl.) | **1** |
| `fcfYield` | — | — | — | — | **YES** (primary) | **YES** (primary) | **YES** (primary) | CRITICAL | **4** |
| `evEbitda` | — | — | — | — | **YES** (primary) | — | — | YES (suppl.) | 2 |
| `roe` | — | **YES** (primary) | — | — | — | — | — | CRITICAL | **2** |
| `roic` | — | **YES** (primary) | — | — | — | — | — | CRITICAL | **2** |
| `debtToEquity` | — | — | **YES** (primary) | — | — | — | — | CRITICAL | **2** |
| `currentRatio` | — | — | **YES** (primary) | — | — | — | **YES** (primary) | YES (important) | 3 |
| `revenueGrowth` | **YES** (primary) | — | — | — | — | **YES** (divergence) | **YES** (divergence) | YES (important) | 4 |
| `profitGrowth` | **YES** (primary) | — | — | — | — | **YES** (divergence) | **YES** (divergence) | YES (suppl.) | 4 |
| `epsGrowth` | **YES** (primary) | — | — | — | — | **YES** (divergence) | **YES** (divergence) | YES (important) | 4 |
| `fcfGrowth` | **YES** (primary) | — | — | — | — | — | — | YES (suppl.) | **2** |
| `grossMargin` | — | **YES** (primary) | — | — | — | — | — | YES (suppl.) | **2** |
| `operatingMargin` | — | **YES** (primary) | **YES** (secondary) | — | — | **YES** (anomaly) | **YES** (red flag) | YES (important) | **5** |

| `roa` | — | — | — | — | — | — | — | — | **0** |
| `bookValue` | — | — | — | — | — | — | — | — | **0** |

---

## Dead Field Engine Suitability Assessment

### `roa` → QualityEngine

**Logical fit: Strong.** QualityEngine already evaluates:
- `roe` (return on equity) — weighted 2.5
- `roic` (return on invested capital) — weighted 2.5
- `grossMargin` — weighted 2 (sector-dependent)
- `operatingMargin` — weighted 2

ROA would be a **natural 5th profitability sub-score**. Weight assignment: 2.0 (comparable to operatingMargin). Scoring logic would mirror ROE/ROIC — sector-percentile where available, static thresholds as fallback:

```
roa >= 0.15 → 95  (exceptional)
roa >= 0.10 → 80  (high)
roa >= 0.07 → 65  (fair)
roa >= 0.04 → 45  (low)
roa >= 0     → 30
roa < 0      → 10  (negative)
```

**Integration point:** `src/stockstory/engines/QualityEngine.ts`, add a new sub-score block after the ROIC block. Add to weightedAverage composition. Update `QualityEngineOutput` return object.

---

### `bookValue` → ValuationEngine

**Logical fit: Moderate.** ValuationEngine already scores:
- `peRatio` — P/E driven
- `pbRatio` — P/B driven (uses book value denominator implicitly)
- `evEbitda` — enterprise value driven
- `fcfYield` — cash flow yield

Book Value per share adds a **"floor valuation"** perspective — companies trading below book value are theoretically liquidation candidates that could be undervalued. Could be used as:
- A supplementary filter: if `pbRatio` is low AND `bookValue` is positive AND trending up → boost pbScore
- An accounting quality check: if `bookValue` is negative → flag (already partially captured by negative P/B)

**Integration point:** `src/stockstory/engines/ValuationEngine.ts`. Impact is limited since P/B already captures book-value relationship. Estimated score change: ±2-5 points for edge cases (deep value).

---

### `marketCap` → Potential SizeFactorEngine (doesn't exist)

**Logical fit: New engine needed.** No current engine produces a size factor. marketCap could:
1. **StabilityEngine** — large cap → lower volatility expectation → stability boost (+5-10 points for mega caps)
2. **ConfidenceEngine** — large caps have better data coverage → minor completeness boost
3. **New SizeFactor** — standalone ranking within sector by market cap → add to sector-weighted health

Most impactful: adding a marketCap-based modifier to **StabilityEngine** (liquidity/stability proxy).

---

### `dividendYield` → ValuationEngine

**Logical fit: Direct.** ValuationEngine already evaluates P/E, P/B, EV/EBITDA, and FCF Yield. Dividend Yield is the 5th classic yield/value metric. It would fit as:
- A sub-score in ValuationEngine: higher yield = more value (with diminishing returns — above ~8% may indicate distress)
- A stability signal: consistent dividends → mature, stable company

Integration: `src/stockstory/engines/ValuationEngine.ts`. Add `dividendYieldScore` sub-component, weighted 1.5-2.0. Score table:
```
divYield >= 0.05 → 90  (very high yield — value territory, but watch for distress)
divYield >= 0.03 → 80
divYield >= 0.02 → 65
divYield >= 0.01 → 50
divYield >= 0     → 35
divYield === null → 50  (neutral)
```

---

## Engine Field Dependency Summary

| Engine | Critical Fields | Important Fields | Supplementary | Dead Fields That Could Fit |
|--------|----------------|-----------------|---------------|---------------------------|
| GrowthEngine | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | — | — | — |
| QualityEngine | roe, roic, grossMargin, operatingMargin | — | — | **roa** |
| StabilityEngine | debtToEquity, currentRatio, volatility(features) | operatingMargin | — | marketCap (size proxy) |
| MomentumEngine | rsi, macd, adx, trendStrength (all features) | — | — | — |
| ValuationEngine | peRatio, pbRatio, fcfYield, evEbitda | — | — | **bookValue, dividendYield** |
| RiskEngine | fcfYield, volatility, beta | operatingMargin, revenueGrowth, epsGrowth | marketCap | — |
| AccountingEngine | fcfYield, revenueGrowth, epsGrowth, currentRatio | profitGrowth, operatingMargin | — | **roa** (accrual quality proxy) |
| ConfidenceEngine | roe, roic, debtToEquity, fcfYield | peRatio, pbRatio, operatingMargin, revenueGrowth, epsGrowth, currentRatio | eps, dividendYield, beta, marketCap, freeFloat, evEbitda, profitGrowth, fcfGrowth, grossMargin | — |

**Conclusion:** `roa` has the strongest case for revival (QualityEngine). `dividendYield` has the second strongest (ValuationEngine). `bookValue` has a marginal case. `marketCap` needs a new use case (size factor). `eps` and `freeCashFlow` are adequately covered by their derived forms.
