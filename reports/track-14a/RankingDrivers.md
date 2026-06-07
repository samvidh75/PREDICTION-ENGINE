# TRACK-14A — Ranking Drivers: Exact Weighting Tree

## Q1: What Actually Determines Final Rank?

### Full Pipeline

```
Provider (Yahoo/Screener/Upstox/Finnhub)
  │
  ▼
FinancialSnapshot → financial_snapshots table
  │ peRatio, pbRatio, eps, dividendYield, beta, marketCap, freeFloat,
  │ fcfYield, evEbitda, roa, roe, roic, debtToEquity, currentRatio,
  │ revenueGrowth, profitGrowth, epsGrowth, fcfGrowth, grossMargin, operatingMargin
  │
  ▼
FeatureEngine.calculateAndStoreFeatures() → feature_snapshots table
  │ rsi, macd, macdSignal, macdHistogram, adx, atr,
  │ bollingerWidth, momentum, volatility, relativeStrength,
  │ movingAverageDistance, trendStrength
  │
  ▼
FactorEngine.calculateAndStoreFactors() → factor_snapshots table
  │ qualityFactor, valueFactor, growthFactor, momentumFactor,
  │ riskFactor, sectorStrengthFactor, factorScore
  │
  ▼
EngineInputs (assembled in intelligence.ts)
  │
  ├─ GrowthEngine.evaluate()        → growth.score      (0-100)
  ├─ QualityEngine.evaluate()       → quality.score     (0-100)
  ├─ StabilityEngine.evaluate()     → stability.score   (0-100)
  ├─ MomentumEngine.evaluate()      → momentum.score    (0-100)
  ├─ ValuationEngine.evaluate()     → valuation.score   (0-100)
  ├─ RiskEngine.evaluate()          → risk.score        (0-100)
  └─ AccountingEngine.evaluate()    → accounting.score  (0-100)
  │
  ▼
StockStoryEngine.evaluate()
  │
  ├─ computeSectorWeightedHealth({growth, quality, stability, valuation, momentum}, sector)
  │   → preAdjustHealth (sector-weighted average, 0-100)
  │
  ├─ Stretch: stretchCenter(58) + (preAdjustHealth - 58) * 1.7
  │   → stretchedHealth (amplified spread)
  │
  ├─ Risk dampening: stretchedHealth - max(0, (risk - 15) * 0.45)
  │   → dampenedHealth
  │
  ├─ Penalty framework: Accounting + Debt + Volatility + Governance penalties
  │   → adjustedHealth (final health score, 0-100)
  │
  └─ Classification: classify(adjustedHealth, risk)
       ≥80: Excellent | ≥65: Healthy | ≥45: Stable | ≥30: Weakening | <30: At Risk
```

---

### Exact Sector-Weighted Contribution (Default: GENERAL)

| Engine | Default Weight | Contribution to preAdjustHealth | Key Inputs |
|--------|---------------|--------------------------------|------------|
| Growth | 25% | growth.score × 0.25 | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth |
| Quality | 25% | quality.score × 0.25 | roa, roe, roic, grossMargin, operatingMargin |
| Stability | 20% | stability.score × 0.20 | debtToEquity, currentRatio, volatility, interestCoverage |
| Valuation | 15% | valuation.score × 0.15 | peRatio, pbRatio, evEbitda, fcfYield |
| Momentum | 15% | momentum.score × 0.15 | rsi, macd, macdSignal, macdHistogram, adx, trendStrength, volatility, atr |

**Sector adjustments change these weights.** For example:
- BANKING: Quality 35%, Stability 25%, Growth 15%, Valuation 15%, Momentum 10%
- IT: Growth 30%, Quality 25%, Stability 15%, Valuation 15%, Momentum 15%
- ENERGY: Stability 30%, Valuation 25%, Quality 20%, Growth 15%, Momentum 10%

---

### Post-Health Adjustments

| Step | Formula | Impact |
|------|---------|--------|
| Stretch | `58 + (preAdjustHealth - 58) * 1.7` | Amplifies deviation from center. Score of 40 → 27.4. Score of 75 → 86.9. |
| Risk dampening | `stretchedHealth - max(0, (risk - 15) * 0.45)` | Risk above 15 reduces health. Risk of 70 → −24.75 penalty. |
| Accounting penalty | Based on cash flow vs earnings divergence | Up to −15 points |
| Debt penalty | Based on D/E > sector threshold | Up to −10 points |
| Volatility penalty | Based on volatility > threshold | Up to −10 points |
| Governance penalty | Placeholder (no data source) | 0 (inactive) |

---

## Q2: Which Engines Dominate Ranking Outcomes?

### Consolidated Influence Table (from TRACK-9A, 9D, 10A, 12 evidence)

| Engine | Weight Contribution | Score Volatility | Ranking Influence | Classification |
|--------|--------------------|-------------------|-------------------|----------------|
| **Quality** | 25-35% (sector-dependent) | High (ROE/ROA/ROIC vary widely) | **DOMINANT** | True ranking driver |
| **Stability** | 15-30% (sector-dependent) | Moderate-High (D/E, current ratio) | **STRONG** | True ranking driver |
| **Growth** | 15-30% (sector-dependent) | Moderate (revenue/EPS growth) | **MODERATE** | Real contributor |
| **Valuation** | 15-25% (sector-dependent) | High (PE ranges 5-200+) | **MODERATE** | Real contributor |
| **Momentum** | 10-15% (sector-dependent) | Low-Moderate (compressed to ~30-70 range) | **WEAK** | Near-noise for fundamentals-heavy sectors |
| **Risk dampening** | Variable (subtractive) | Moderate | **CONDITIONAL** | High only when risk > 50 |
| **Penalties** | Variable (subtractive) | Low (few triggers) | **WEAK** | Edge cases only |

### Key Finding

**Quality + Stability = 45-65% of pre-adjustment score.** These two engines anchored on fundamental financial ratios (ROE, ROA, ROIC, D/E, margins) dominate the ranking outcome. Growth and Valuation contribute modestly (15-30% each). Momentum (technical indicators) contributes the least (10-15%) and is further compressed by the stretch function.

**StockStory is fundamentally a quality-and-stability-first ranking system with growth, valuation, and momentum as secondary confirmatory signals.**
