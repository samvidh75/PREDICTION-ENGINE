# Field Activation Matrix — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06

---

## Current vs Target State Matrix

Each field traced through: Provider → Coordinator → EngineInputs → Engine Consumption → Scoring Impact

| Field | Provider Returns | Coordinator Merges | In EngineInputs Type | intelligence.ts Maps | Engines That Read It | Scoring Impact | **Activation Status** |
|-------|:---------------:|:-----------------:|:--------------------:|:-------------------:|:-------------------:|:--------------:|:---------------------:|
| `roa` | ✅ Upstox | ✅ upstoxFields | ❌ | ❌ | **0 of 8** | None | **DEAD — needs type + mapper + engine** |
| `operatingMargin` | ✅ Screener, Finnhub | ✅ screenerEnrich | ✅ | ✅ | **5 of 8** | Active | **LIVE — false positive** |
| `bookValue` | ✅ Screener | ✅ screenerEnrich | ❌ | ❌ | **0 of 8** | None | **DEAD — needs type + mapper + engine** |
| `eps` | ✅ Finnhub, Yahoo | ✅ fallbackFields | ✅ | ✅ | **1 of 8** (Confidence only) | Supplementary only | **LIVE — correct design** |
| `freeCashFlow` | ✅ Finnhub, Yahoo | ❌ (not in whitelist) | ❌ | ❌ | **0 of 8** | None (ratios used instead) | **INTENTIONAL — correct design** |
| `dividendYield` | ✅ Screener, Finnhub | ✅ screenerEnrich | ✅ | ✅ | **1 of 8** (Confidence only) | Supplementary only | **LIVE BUT UNUSED — needs engine** |
| `marketCap` | ✅ Screener, Finnhub, Registry | ✅ screenerEnrich | ✅ | ✅ | **2 of 8** (Risk anomaly + Confidence) | Minimal | **LIVE BUT UNDERUSED — needs scoring** |

---

## Fields Requiring Activation (Sorted by Effort)

### Tier 1: Data-Plumbed, Engine-Missing (requires engine code only)

| Field | What's Missing | Files to Change | Lines of Code |
|-------|:--------------|----------------|:------------:|
| `dividendYield` | ValuationEngine sub-score | 1 file | ~25 lines |
| `marketCap` | StabilityEngine size modifier | 1 file | ~15 lines |

**These fields are already fully plumbed** — they are in EngineInputs, mapped by intelligence.ts, and available to every engine. Only the engine scoring logic needs to be added.

### Tier 2: Schema-Blocked (requires type + mapper + engine)

| Field | What's Missing | Files to Change | Lines of Code |
|-------|:--------------|----------------|:------------:|
| `roa` | EngineInputs type + intelligence.ts mapper + QualityEngine sub-score | 3 files | ~40 lines |
| `bookValue` | EngineInputs type + intelligence.ts mapper + ValuationEngine modifier | 3 files | ~30 lines |

**These fields need the plumbing completed before engine code can use them.**

---

## Activation Pipeline for Each Dead/Weak Field

### `roa` Activation Pipeline

```
Currently: Upstox API → UpstoxFundamentalsProvider → ProviderCoordinator.mergeFinancialFields → [DEAD END]
                                                                                                    ↑
                                                                                            No type in EngineInputs
                                                                                            No mapper in intelligence.ts
                                                                                            No engine code

Target:    Upstox API → UpstoxFundamentalsProvider → ProviderCoordinator → DB → EngineInputs → QualityEngine.roaScore
```

**Steps:**
1. Add `roa: number | null;` to `EngineInputs.financials` in `types.ts`
2. Add `roa: fin?.roa != null ? Number(fin.roa) : null,` to intelligence.ts mapper
3. Add ROA sub-score block to `QualityEngine.evaluate()` — sector-percentile scoring, weight 2.0

**Current connected scoring logic that could consume it (disconnected):** QualityEngine already has `roe` and `roic` sub-scores using identical scoring patterns. ROA would follow the same pattern. The scoring infrastructure (sector-percentile, static thresholds) is already built and tested.

---

### `dividendYield` Activation Pipeline

```
Currently: Screener/Finnhub → ProviderCoordinator → DB → EngineInputs → [DEAD END]
                                                                              ↑
                                                                      No engine reads it
                                                                      (only ConfidenceEngine for completeness)

Target:    Screener/Finnhub → ProviderCoordinator → DB → EngineInputs → ValuationEngine.dividendYieldScore
```

**Steps:**
1. Add `dividendYieldScore` sub-component to `ValuationEngine.evaluate()` — weight 1.5-2.0
2. Add `dividendYield` to `ValuationEngineOutput`
3. Wire into composite weightedAverage

**Current connected scoring logic that could consume it (disconnected):** ValuationEngine already uses `weightedAverage` with four sub-scores. Adding a fifth is mechanical. The `SectorPercentileEngine` infrastructure for percentile-based scoring is already available.

---

### `marketCap` Activation Pipeline

```
Currently: Screener/Finnhub/Registry → MetadataProviderCoordinator/ProviderCoordinator → DB → EngineInputs
           → RiskEngine (used once for anomaly check, line 49)
           → ConfidenceEngine (supplementary only, line 60)
           → [NO FURTHER SCORING]

Target:    Same path → StabilityEngine.sizeScore (size-based stability modifier)
```

**Steps:**
1. Add `sizeModifier` computation to `StabilityEngine.evaluate()` — log-scale marketCap to 0-100 score
2. Add as additional weight in composite weightedAverage

**Current connected scoring logic that could consume it (disconnected):** StabilityEngine has 5 sub-scores already. Adding a 6th is mechanical. Sector-relative sizing would be ideal but absolute sizing works as a first pass.

---

### `bookValue` Activation Pipeline

```
Currently: Screener → ProviderCoordinator → [DEAD END]
                                                ↑
                                        No type, no mapper, no engine

Target:    Screener → ProviderCoordinator → DB → EngineInputs → ValuationEngine (pbScore modifier)
```

**Steps:**
1. Add `bookValue: number | null` to EngineInputs type
2. Add mapper line in intelligence.ts
3. Add book-value-based modifier to ValuationEngine pbScore (e.g., if bookValue < 0 → pbScore floor at 10)

---

### Fields NOT Requiring Activation (Confirmed Correct)

| Field | Why No Activation Needed |
|-------|--------------------------|
| `operatingMargin` | Already active in 5 engines. Remove from dead-field list. |
| `eps` | Absolute EPS correctly restricted to confidence completeness. Derived forms (`epsGrowth`, `peRatio`) carry the scoring signal. |
| `freeCashFlow` | Raw FCF correctly excluded. Ratios (`fcfYield`, `fcfGrowth`) are the comparable forms. |

---

## Activation Scope Summary

| Field | Type Update | Mapper Update | Engine Update | Total Files | Total LOC | Difficulty |
|-------|:----------:|:------------:|:------------:|:----------:|:---------:|:----------:|
| `roa` | ✅ | ✅ | ✅ | 3 | ~40 | Easy |
| `dividendYield` | ❌ | ❌ | ✅ | 1 | ~25 | Easy |
| `marketCap` | ❌ | ❌ | ✅ | 1 | ~15 | Easy |
| `bookValue` | ✅ | ✅ | ✅ | 3 | ~30 | Easy |
