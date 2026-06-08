# TRACK-P1 — Distribution Metadata Report

**Date:** 2026-06-09
**Source:** `src/stockstory/analytics/reference-distributions.metadata.json`

---

## Data Lineage

| Property | Value |
|----------|-------|
| **Version** | 1.1.0-track-p1 |
| **Source Dataset** | Original raw dataset not committed; values treated as provisional reference calibration |
| **Source Period** | 2024-2025 |
| **Source Description** | Indian market (NSE-listed) sector reference distributions |
| **Sector Mapping** | TRACK-P1 (7 sectors: BANKING, IT, FMCG, PHARMA, AUTO, ENERGY, GENERAL) |

---

## Processing Policy

| Policy | Value |
|--------|-------|
| **Winsorization** | None applied at distribution level |
| **Null Handling** | Null values return neutral score 50 with method 'neutral_missing_value' |
| **Minimum Peer Count** | 3 (distributions with fewer than 3 peers return neutral 50) |
| **Approximate Peer Count** | 100 per reference distribution |

---

## Metric Catalog

| # | Metric | Type | Inverse? | Added In |
|---|--------|------|----------|----------|
| 1 | roa | Return | No | RC-ENGINE-004 |
| 2 | roe | Return | No | RC-ENGINE-004 |
| 3 | roic | Return | No | RC-ENGINE-004 |
| 4 | revenueGrowth | Growth | No | RC-ENGINE-004 |
| 5 | epsGrowth | Growth | No | RC-ENGINE-004 |
| 6 | profitGrowth | Growth | No | TRACK-P1 |
| 7 | fcfGrowth | Growth | No | TRACK-P1 |
| 8 | grossMargin | Margin | No | TRACK-P1 |
| 9 | operatingMargin | Margin | No | RC-ENGINE-004 |
| 10 | debtToEquity | Stability | Yes | RC-ENGINE-004 |
| 11 | currentRatio | Stability | No | RC-ENGINE-004 |
| 12 | peRatio | Valuation | Yes | RC-ENGINE-004 |
| 13 | pbRatio | Valuation | Yes | RC-ENGINE-004 |
| 14 | evEbitda | Valuation | Yes | RC-ENGINE-004 |
| 15 | fcfYield | Valuation | No | RC-ENGINE-004 |
| 16 | volatility | Risk | Yes | RC-ENGINE-004 |

---

## New Metrics (TRACK-P1) — Provisional Calibration

### profitGrowth
```
Purpose:     Net profit growth rate (YoY)
Distinct from: epsGrowth (which is diluted by share issuance/buybacks)
Calibration: Derived from related metric patterns (epsGrowth, revenueGrowth)
Sector ranges: 
  BANKING:  P50=10%  (range -8% to +28%)
  IT:       P50=10%  (range -5% to +22%)
  FMCG:     P50=10%  (range -2% to +20%)
  PHARMA:   P50=10%  (range -5% to +25%)
  AUTO:     P50=8%   (range -12% to +28%)
  ENERGY:   P50=5%   (range -15% to +22%)
  GENERAL:  P50=8%   (range -10% to +25%)
Status:     PROVISIONAL — raw calibration data not committed
```

### fcfGrowth
```
Purpose:     Free cash flow growth rate (YoY)
Distinct from: fcfYield (which is FCF / market cap, not growth)
Calibration: Derived from related metric patterns
Sector ranges:
  BANKING:  P50=5%   (range -15% to +25%)
  IT:       P50=10%  (range -10% to +25%)
  FMCG:     P50=8%   (range -5% to +20%)
  PHARMA:   P50=8%   (range -10% to +22%)
  AUTO:     P50=5%   (range -15% to +20%)
  ENERGY:   P50=5%   (range -15% to +20%)
  GENERAL:  P50=6%   (range -15% to +22%)
Status:     PROVISIONAL — raw calibration data not committed
```

### grossMargin
```
Purpose:     Gross margin ratio (gross profit / revenue)
Distinct from: operatingMargin (which deducts OpEx)
Calibration: Derived from related metric patterns
Sector ranges:
  BANKING:  P50=60%  (range 40% to 80%)  — interest margin proxy
  IT:       P50=40%  (range 20% to 70%)
  FMCG:     P50=50%  (range 30% to 70%)
  PHARMA:   P50=60%  (range 40% to 80%)
  AUTO:     P50=35%  (range 20% to 50%)
  ENERGY:   P50=40%  (range 20% to 60%)
  GENERAL:  P50=35%  (range 15% to 65%)
Status:     PROVISIONAL — raw calibration data not committed
```

---

## Validation Results

```
Script:   scripts/validate-sector-distributions.ts
Result:   PASS
Metrics:  7 sectors × 16 metrics = 112 distributions
Checks:   ✓ All metrics present in all sectors
          ✓ All distributions monotonic (p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90)
          ✓ No NaN values
          ✓ No undefined metrics
          ✓ Null returns neutral 50
          ✓ All scores within 0-100 range
```

---

## Known Limitations

1. **Provisional new metrics:** profitGrowth, fcfGrowth, and grossMargin distributions are not empirically derived from raw NSE data. They are constructed from patterns observed in related metrics (epsGrowth, revenueGrowth, operatingMargin) with sector-specific adjustments.

2. **Peer count approximation:** All reference distributions use 100 as the approximate peer count. Actual NSE sector populations vary from approximately 15 (specialized sectors) to 200+ (GENERAL/financials).

3. **Sub-sector granularity:** Sector distributions use broad categories (e.g., "BANKING" includes public sector, private sector, and NBFC banks as a single group). Sub-sector nuances are not captured.

4. **Temporal stability:** Distributions are based on 2024-2025 data and may not reflect post-March 2025 market conditions, regulatory changes, or sector composition shifts.

5. **Volatility estimates:** Volatility distributions are based on annualized daily volatility estimates. The methodology for computing these estimates is not documented in the committed source.

6. **Banking grossMargin:** Banking sector uses grossMargin as an interest margin proxy. This mapping is approximate and should be validated against NIM (Net Interest Margin) data when available.

---

## Improvement Roadmap

1. **Empirical recalibration:** When the original raw NSE dataset is committed, regenerate all distributions from actual peer data.
2. **Sub-sector splits:** Create sub-distributions for private banks, PSU banks, NBFCs, IT services vs IT products, etc.
3. **Dynamic peer counts:** Replace hardcoded 100 with actual peer counts from live database queries.
4. **scoreDetailed() implementation:** Add structured traceability metadata to every scored value.
5. **Distribution versioning:** Implement distribution version tracking in the metadata artifact for audit trails.
