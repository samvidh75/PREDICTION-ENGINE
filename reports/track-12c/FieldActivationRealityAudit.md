# Track-12C: Field Activation Reality Audit

**Date:** 2026-06-14

---

## 1. `roa` — Return on Assets

| Property | Value |
|----------|-------|
| Canonical field | `financial_snapshots.roa` |
| Source provider | `ProviderCoordinator.getFinancials()` (yfinance/Screener) |
| Source unit | Fraction (e.g. 0.10 = 10% ROA) |
| Normalized unit | Fraction — **NO conversion applied** in `PredictionFactory.ts:282` |
| DB column | `roa NUMERIC(8,4)` (migration 006) |
| Null semantics | → neutral score 50 in QualityEngine, still included in weighted composite |
| Invalid-value semantics | NaN/Infinity → Number(fin.roa) → NaN, then === null check fails → NaN propagates to engine. **NaN reaches scoring logic** — not sanitized. |
| Active scoring rule | `QualityEngine.ts:41-54`: static thresholds (0.15→95, 0.10→80, 0.07→65, 0.04→45, ≥0→30, else→10) OR sector-percentile if available |
| Weight | 2.0 in QualityEngine composite (same as ROE, ROIC) |
| Production impact | **YES — score changes when ROA changes** |
| Explainability visible | `QualityEngineOutput.roa` (but `?? 0` strips null) |

### Trace: DB → Final Score

```
financial_snapshots.roa (fraction, e.g. 0.10)
  → PredictionFactory.ts:282: fin.roa ? Number(fin.roa) : null
  → EngineInputs.financials.roa (number | null)
  → QualityEngine.evaluate()
    → if (financials.roa !== null) → score via static thresholds OR sector-percentile
    → else → roaNormalized = 50 (NEUTRAL)
  → weightedAverage with weight 2.0 — ALWAYS included
  → QualityEngineOutput.roa = financials.roa ?? 0 (NULLS BURIED)
  → StockStoryEngine.engineDetails.quality.roa
  → NOT directly exposed in GET /api/stockstory/:ticker (uses ranking_score only)
```

### Discrepancies
- `QualityEngineOutput.roa` uses `?? 0` — nulls become 0, which is misleading
- Null ROA (neutral 50) is indistinguishable from average ROA (also ~50) in the composite

---

## 2. `dividendYield` — Dividend Yield

| Property | Value |
|----------|-------|
| Canonical field | `financial_snapshots.dividend_yield` |
| Source provider | `ProviderCoordinator.getFinancials()` |
| Source unit | Fraction (e.g. 0.04 = 4% dividend yield) |
| Normalized unit | Fraction — **NO conversion** |
| DB column | `dividend_yield REAL` (migration 009 + later additions) |
| Null semantics | → neutral score 50 in ValuationEngine, included in weighted composite |
| Invalid-value semantics | NaN/Infinity → NaN, === null check fails → NaN propagates |
| Active scoring rule | `ValuationEngine.ts:86-99`: value-trap thresholds (≥0.20→10, 0.12→25, 0.08→50, 0.04→90, 0.03→80, 0.02→65, 0.01→50, 0.005→35, else→20) |
| Weight | 1.5 in ValuationEngine composite |
| Production impact | **YES — score changes when dividend yield changes** |
| Explainability visible | `ValuationEngineOutput.dividendYieldScore` |

### Trace: DB → Final Score

```
financial_snapshots.dividend_yield (fraction, e.g. 0.035)
  → PredictionFactory.ts:276: fin.dividend_yield ? Number(fin.dividend_yield) : null
  → EngineInputs.financials.dividendYield (number | null)
  → ValuationEngine.evaluate()
    → yield-trap thresholds, graduated penalty above 8%
    → else → dividendYieldScore = 50 (NEUTRAL)
  → weightedAverage with weight 1.5 — ALWAYS included
  → ValuationEngineOutput.dividendYieldScore
  → NOT directly exposed in GET /api/stockstory/:ticker
```

### Discrepancies
- No percentile-based scoring (unlike PE/PB/FCFYield which have percentile support)
- Null dividend yield (50) creates false confidence — it's indistinguishable from a real 1-2% yield

---

## 3. `marketCap` — Market Capitalization

| Property | Value |
|----------|-------|
| Canonical field | `financial_snapshots.market_cap` |
| Source provider | `ProviderCoordinator.getFinancials()` |
| Source unit | **INR crores** (1 crore = 10⁷) |
| Normalized unit | INR crores — `PredictionFactory.ts:278` passes raw value |
| DB column | `market_cap REAL` (migration 009) |
| Null semantics | → neutral score 50 in StabilityEngine, included in weighted composite |
| Invalid-value semantics | NaN/Infinity → NaN, === null check fails → NaN propagates. Negative/zero → score 10 (explicit penalty). |
| Active scoring rule | `StabilityEngine.ts:125-134`: log10 continuous scaling: `clampScore((log10(mcapCr) - 1) / 5 * 95 + 5)` |
| Weight | 1.0 in StabilityEngine composite (~7% of total) |
| Production impact | **YES — score changes when market cap changes** |
| Explainability visible | `StabilityEngineOutput.marketCapSizeScore` |

### Trace: DB → Final Score

```
financial_snapshots.market_cap (INR crores, e.g., 50000)
  → PredictionFactory.ts:278: fin.market_cap ? Number(fin.market_cap) : null
  → EngineInputs.financials.marketCap (number | null)
  → StabilityEngine.evaluate()
    → if (marketCap !== null && marketCap > 0) → log10 continuous score
    → else if (marketCap !== null) → score 10 (negative/zero penalty)
    → else → marketCapSizeScore = 50 (NEUTRAL)
  → weightedAverage with weight 1.0 — ALWAYS included
  → StabilityEngineOutput.marketCapSizeScore
  → NOT directly exposed in GET /api/stockstory/:ticker
```

### Discrepancies
- `generate-deliverables.ts:41` has `marketCapInr / 100_000_00` — this is unnecessary since `market_cap` is already in crores. Over-division would produce tiny values.
- No percentile-based scoring for market cap (unlike debtToEquity which has sector-percentile support via `hasSufficientData`)

---

## 4. Cross-Cutting Issues

### 4.1 NaN Propagation
None of the three fields sanitize NaN/Infinity before the `!== null` check. `Number(null)` → 0, but `Number(undefined)` → NaN. If the DB returns null, the `!= null` check in PredictionFactory correctly yields null. But if the DB returns an invalid string, `Number()` yields NaN which fails `!== null` and reaches the engine as `NaN`.

### 4.2 Missing-Value Neutrality
All three fields default to 50 when null and are always included in the weighted average. This means missing data is indistinguishable from average data, and confidence is inflated.

### 4.3 Engine Output Null Stripping
All engine outputs use `?? 0` for their output fields, e.g.:
- `QualityEngineOutput.roa: financials.roa ?? 0` (line 131)
- This destroys the ability to distinguish "null" from "zero" downstream
