# 13 — Confidence Scoring Framework

**TRACK-20 Phase 5 — Task 14**
**Date:** 2026-06-06

---

## Purpose

Every ranking output must carry a confidence score that tells consumers how much to trust the result. A stock ranked #1 with low confidence (only 3/20 fields populated, from Screener scraping) should be treated differently from a stock ranked #15 with high confidence (18/20 fields from Finnhub + Yahoo verified).

---

## Three Confidence Dimensions

### 1. Provider Confidence

How trustworthy is the data source for each field?

| Provider | Base Confidence | Reason |
|----------|----------------|--------|
| Finnhub (API) | 0.85 | Professional API, SEC/SEBI-filed data, verified |
| Upstox (API) | 0.90 | Exchange-verified, audited, direct from company filings |
| Yahoo v8 (price) | 0.95 | Exchange-sourced OHLCV, split/dividend adjusted |
| DerivedMetricsEngine | 0.80 | Computed from audited statements, but derivation adds uncertainty |
| Screener (scrape) | 0.55 | HTML scraping, fragile, no SLA |

```typescript
function providerConfidence(sources: Record<string, string>): number {
  // sources: { peRatio: "FinnhubProvider", roa: "DerivedMetricsEngine", ... }
  const weights: Record<string, number> = {
    'FinnhubProvider': 0.85,
    'UpstoxFundamentalsProvider': 0.90,
    'YahooProvider': 0.95,
    'DerivedMetricsEngine': 0.80,
    'ScreenerProvider': 0.55,
  };

  let totalConfidence = 0;
  let count = 0;
  for (const [, provider] of Object.entries(sources)) {
    totalConfidence += weights[provider] ?? 0.5;
    count++;
  }
  return count > 0 ? totalConfidence / count : 0;
}
```

### 2. Snapshot Confidence

How complete and fresh is the data snapshot?

```typescript
function snapshotConfidence(
  fieldsPopulated: number,
  totalFields: number,
  stalenessDays: number,
): number {
  const completeness = fieldsPopulated / totalFields; // 0-1
  const freshness = Math.max(0, 1 - (stalenessDays / 365)); // 1 = today, 0 = 1 year old
  
  return (completeness * 0.7 + freshness * 0.3);
}
```

**Example:**
- 18/20 fields populated, 45 days old → (0.90 × 0.7) + (0.88 × 0.3) = 0.63 + 0.26 = 0.89
- 9/20 fields populated, 180 days old → (0.45 × 0.7) + (0.51 × 0.3) = 0.32 + 0.15 = 0.47

### 3. Ranking Confidence

How much signal vs. noise is in the final ranking?

Factors:
- **Signal agreement** — do the sub-scores (quality, growth, value, momentum) agree or conflict?
- **Sector percentile** — is the stock a clear outlier in its sector, or middling?
- **Historical stability** — has this stock's score been stable, or is it volatile?

```typescript
function rankingConfidence(factors: {
  qualityFactor: number;
  growthFactor: number;
  valueFactor: number;
  momentumFactor: number;
  riskFactor: number;
}): number {
  const scores = Object.values(factors);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Higher variance = lower signal agreement
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const maxVariance = 2500; // max possible variance (all at 0 or 100, mean 50)
  const signalAgreement = 1 - Math.min(variance / maxVariance, 1);
  
  // Extreme scores (very high or very low) have higher confidence
  const extremeness = Math.abs(mean - 50) / 50; // 0 = middle, 1 = extreme
  
  return (signalAgreement * 0.4 + extremeness * 0.6);
}
```

---

## Composite Confidence Score

```typescript
function compositeConfidence(
  providerConf: number,
  snapshotConf: number,
  rankingConf: number,
): { score: number; level: ConfidenceLevel } {
  const score = (providerConf * 0.3 + snapshotConf * 0.35 + rankingConf * 0.35) * 100;
  
  let level: ConfidenceLevel;
  if (score >= 80) level = 'Very High';
  else if (score >= 65) level = 'High';
  else if (score >= 45) level = 'Medium';
  else level = 'Low';
  
  return { score, level };
}
```

---

## Confidence Level Definitions

| Level | Score Range | Meaning | User Impact |
|-------|-------------|---------|-------------|
| **Very High** | 80-100 | 18+ fields from Finnhub/Upstox + fresh data + clear signal | Strong conviction. Suitable for investment decisions. |
| **High** | 65-79 | 15+ fields, primarily API-sourced, reasonably fresh | Good conviction. Use as primary screening input. |
| **Medium** | 45-64 | 10+ fields, mixed sources (some scraping), moderate staleness | Directional only. Cross-reference with other sources. |
| **Low** | 0-44 | < 10 fields, scraping-only, stale data | Unreliable. Do not use for decisions. |

---

## Confidence in the API Response

`StockStoryOutput.confidence` field already exists. Fill it from this framework.

```typescript
// ConfidenceEngine (existing) vs. ConfidenceFramework (new)
// The existing ConfidenceEngine should use these inputs:

interface ConfidenceInputs {
  providerConfidence: number;   // from provider sources
  snapshotConfidence: number;   // from completeness + freshness
  rankingConfidence: number;    // from signal agreement + extremeness
}

// Produces:
// {
//   level: 'High',        // 'Very High' | 'High' | 'Medium' | 'Low'
//   score: 72.5,          // 0-100
//   dataCompleteness: 0.90, // 18/20 fields
//   signalAgreement: 0.75,  // sub-scores agree
//   riskConsistency: 0.80,
//   historicalStability: 0.70,
//   commentary: "High confidence — 18/20 fields from reliable API providers. Rankings stable over past 4 weeks."
// }
```

---

## Confidence Decay Over Time

Snapshots age. Confidence should decay:

| Age | Freshness Factor | Confidence Penalty |
|-----|-----------------|-------------------|
| 0-30 days | 1.00 | None — recent data |
| 31-60 days | 0.95 | -5% — approaching quarter end |
| 61-90 days | 0.85 | -15% — one quarter old |
| 91-180 days | 0.70 | -30% — two quarters old |
| 181-365 days | 0.50 | -50% — stale |
| > 365 days | 0.20 | -80% — completely unreliable |

---

## Confidence-Driven Behavior

### In the UI

| Confidence | Visual Treatment | Action |
|------------|-----------------|--------|
| Very High | Green badge, full score display | "Confidence: Very High — 19/20 fields from verified providers" |
| High | Blue badge, full score display | "Confidence: High — data is recent and largely complete" |
| Medium | Yellow badge, score with asterisk | "Confidence: Medium — some data is estimated or from unverified sources" |
| Low | Red badge, score greyed out | "Confidence: Low — insufficient data for reliable ranking" |

### In Rankings

Stocks with `Low` confidence should:
- Not appear in Top 20 lists
- Be annotated with ⚠️ in portfolio views
- Carry a disclaimer in API responses

---

## Example Confidence Report

```
StockStory Confidence Report — RELIANCE
────────────────────────────────────────
Provider Confidence: 0.88 (Finnhub: 15 fields, Derived: 3 fields, Upstox: 2 fields)
Snapshot Confidence: 0.91 (19/20 fields, 12 days old)
Ranking Confidence: 0.82 (strong signal agreement, extreme sector percentile)
────────────────────────────────────────
Composite Score: 87/100
Confidence Level: VERY HIGH ✅
```

---

**TRACK-20 Confidence Framework — Phase 5 TASK 14 Complete**
