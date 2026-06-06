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
