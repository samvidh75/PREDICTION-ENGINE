# Percentile Migration Audit — RC-ENGINE-004

## Executive Summary

All 7 engines + SectorWeightEngine currently use **static absolute thresholds** for scoring. This means a 15% ROE scores identically regardless of whether the sector median ROE is 8% (where 15% is exceptional) or 25% (where 15% is below median). The SectorAdapter partially mitigates this by adjusting threshold values per sector, but the underlying scoring logic remains **if-else bands on absolute values** rather than percentile rank.

**Recommendation**: Migrate GrowthEngine, QualityEngine, StabilityEngine, and ValuationEngine to percentile-based scoring within sector peer groups. Keep MomentumEngine partially technical-indicator based. ConfidenceEngine already uses statistical methods (std dev) — extend to include sector coverage.

---

## Engine-by-Engine Audit

### 1. GrowthEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | Same 4 metrics |
| **Current thresholds** | Absolute: rg≥0.20→95, rg≥0.15→85, rg≥0.10→75, rg≥0.05→60, rg≥0→40, rg≥-0.05→25, else 10 | Percentile within sector: P90→95, P75→85, P50→65, P25→45, P10→30, else 15 |
| **Current score mapping** | {95,85,75,60,40,25,10} | {95,85,75,60,40,25,15} (same bands, different trigger values) |
| **Current weights** | rg:3, eg:3, fg:2, pg:2 | Same weights |
| **Weaknesses** | • 20% revenue growth scores 95 regardless of sector — cyclicals with recovery-year 20% look identical to compounders with sustained 20% | Percentile accounts for sector growth distributions |
| **Sector bias** | • IT easily hits 15-20% → scores 85+ frequently | IT: top decile 25%+ → 95; bottom decile -5% → 15 |
| | • Utilities capped at 5-8% → scores 60 max | Utilities: top decile 10% → 95; bottom decile -2% → 15 |
| | • FMCG steady 8-12% → scores 60-75 | FMCG: top decile 15% → 95 |
| **Recommended replacement** | `PercentileEngine.rank(value, sectorDistribution.revenueGrowth)` → maps percentile to score band | |

### 2. QualityEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | roe, roic, grossMargin, operatingMargin, efficiency | Same 5 metrics |
| **Current thresholds** | SectorProfile-static: roeExceptional/High/Fair/Low per sector | Sector percentile: P90→95, P75→80, P50→65, P25→45, else 30 |
| **Current score mapping** | {95,80,65,45,30,10} for ROE | {95,80,65,45,30,15} (percentile-mapped) |
| **Weaknesses** | • ROE 18% scores 65 in General but 80 in Banking (profile override) — arbitrary boundary | Percentile eliminates arbitrary boundary problem |
| | • SectorProfile has 4 hardcoded tiers per metric — real distributions are continuous | Real distributions are captured |
| **Sector bias** | • Banking ROE 15% = "High" (80) but FMCG ROE 15% = "Low" (45) — this is actually correct directionally but the boundaries are static | Percentile preserves direction while using empirical data |
| **Recommended replacement** | `SectorPercentileEngine.rank(value, sector, 'roe')` → score | |

### 3. StabilityEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | debtToEquity, currentRatio, volatility, coverageRatio, interestCoverageProxy | Same 5 metrics |
| **Current thresholds** | SectorProfile-static for D/E, CR; absolute for volatility, coverage, ICR | Percentile within sector for D/E and CR; absolute for volatility (market-wide) |
| **Current score mapping** | D/E: {95,85,75,55,35,15} | Inverted percentile: low D/E = high percentile → high score |
| **Weaknesses** | • Banking D/E 6.0x = "low" but General D/E 6.0x = "extreme" — profile fixes this but still static | Real distributions of D/E by sector vary widely |
| | • Coverage ratio is a poor proxy for actual interest coverage | Not addressed by percentile migration (data limitation) |
| **Sector bias** | • Banks: D/E 5-15x is normal, scored appropriately now (RC-002 fix) | Percentile confirms and refines |
| **Recommended replacement** | `SectorPercentileEngine.rankInverse(dte, sector, 'debtToEquity')` — lower D/E = higher percentile | |

### 4. MomentumEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | rsi, macd, adx, trendStrength, volatility, atr | Keep technical indicators |
| **Current thresholds** | RSI bands by zone, MACD by signal crossing, ADX by strength | **Keep as-is** — technical indicators are self-normalising (0-100 for RSI, standardised for MACD) |
| **Weaknesses** | RSI zone boundaries are universal (not sector-specific) | RSI is already 0-100 bounded — no migration needed. Momentum scores could be cross-sectionally ranked vs sector peers for the final score, but technical sub-scores remain absolute. |
| **Recommended replacement** | **Partial**: Keep technical indicator scoring. Add final-score sector percentile rank as a second-stage adjustment if needed. | |

### 5. ValuationEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | peRatio, pbRatio, evEbitda, fcfYield | Same 4 metrics |
| **Current thresholds** | SectorProfile-static: peCheap/Fair/Expensive/Extreme per sector | Sector percentile: P10→95 (cheapest 10%), P25→75, P50→55, P75→35, P90→20 |
| **Current weaknesses** | • FMCG PE 35 = "fair" (75) — but if 80% of FMCG peers trade at PE 25, it's actually expensive | Percentile catches this |
| | • Thresholds updated manually, lag market reality | Percentile self-updates with new data |
| **Sector bias** | • FMCG at PE 50 gets 30 ("expensive" band) — but if sector median is 55, it's actually cheap | Percentile eliminates this |
| **Recommended replacement** | `SectorPercentileEngine.rankInverse(pe, sector, 'peRatio')` — lower PE = higher percentile | |

### 6. RiskEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | Anomaly signals (additive), fcfYield, volatility, beta | Keep anomaly detection as-is; migrate fcfYield and volatility to percentile |
| **Current weaknesses** | • FCF yield <-0.05→90 — absolute threshold | Percentile of FCF yield within sector: bottom 10% → 90 risk points |
| | • Volatility >0.60→90 — sector-agnostic | Sector vol percentile: top 10% → 90 |
| **Recommended replacement** | Anomaly stays additive. FCF yield and volatility use sector percentile. | |

### 7. ConfidenceEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Metrics** | Data completeness, signal agreement, risk consistency, historical stability | Add: sector coverage (how many peers available for percentile calc) |
| **Current logic** | Statistical (std dev, weighted completeness) — already percentile-compatible | Add `sectorCoverageScore` — if <10 peers in sector distribution, confidence degrades |
| **Recommended addition** | `sectorCoverage: number` (count of peers in distribution) → score: ≥50→90, ≥20→70, ≥5→50, else 30 | |

### 8. SectorWeightEngine

| Field | Current State | Percentile Target |
|-------|--------------|-------------------|
| **Current logic** | Hardcoded sector weight maps | **Keep as-is** — weights are design decisions, not statistical. The percentile migration changes HOW individual engine scores are computed, not HOW they're combined. |

---

## Implementation Priority

| Priority | Engine | Migration Complexity | Impact |
|----------|--------|---------------------|--------|
| **P0** | ValuationEngine | Low — PE/PB/EV are simple numeric ranks | Highest — eliminates FMCG/tech valuation penalties |
| **P0** | QualityEngine | Medium — 5 metrics, each needs sector distribution | High — eliminates arbitrary boundary problem |
| **P1** | GrowthEngine | Medium — 4 metrics, growth distributions vary widely by sector | High — cyclical vs secular differentiation |
| **P1** | StabilityEngine | Medium — D/E and CR need sector distributions; vol is market-wide | Medium — banks already handled by SectorAdapter |
| **P2** | RiskEngine | Low — FCF yield and vol percentile only | Medium — anomaly stays additive |
| **P3** | MomentumEngine | Partial — final score percentile only | Low — technical indicators self-normalising |
| **P3** | ConfidenceEngine | Low — add sectorCoverage score | Low — data limitation awareness |

---

## Required Sector Distributions

For each sector (BANKING, IT, FMCG, PHARMA, AUTO, ENERGY), generate:

| Metric | Direction | P10 | P25 | P50 | P75 | P90 |
|--------|-----------|-----|-----|-----|-----|-----|
| ROE | Higher=better | | | | | |
| ROIC | Higher=better | | | | | |
| Revenue Growth | Higher=better | | | | | |
| EPS Growth | Higher=better | | | | | |
| Debt/Equity | Lower=better | | | | | |
| Operating Margin | Higher=better | | | | | |
| Current Ratio | Higher=better | | | | | |
| PE Ratio | Lower=better | | | | | |
| PB Ratio | Lower=better | | | | | |
| EV/EBITDA | Lower=better | | | | | |
| FCF Yield | Higher=better | | | | | |
| Volatility | Lower=better | | | | | |

These distributions will be generated by `SectorDistributionEngine` using either:
- Historical data from the `feature_snapshots` and `financial_snapshots` tables
- Hardcoded reference distributions (Indian market empirical data) as fallback

---

## Backward Compatibility

All changes are **internal to engine scoring logic**. The API contracts, output shapes, route structure, and frontend compatibility remain unchanged. Engines will continue to output:

```
{ score: 0-100, subScores: {...}, commentary: "..." }
```

The only change is HOW the score is computed — from static thresholds to percentile rank.
