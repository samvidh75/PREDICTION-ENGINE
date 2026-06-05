# Engine Consumer Map — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06

---

## Which Engine Should Consume Each Field

For each dead/weak field, we determine the exact engine, the scoring logic it would use, and the existing disconnected infrastructure that would support it.

---

### `roa` → QualityEngine

**Why QualityEngine:** QualityEngine measures business quality through profitability metrics. ROA measures how efficiently a company uses its assets to generate profit — a core quality dimension. QualityEngine already scores:
- ROE (return on equity — how well the company uses shareholder capital)
- ROIC (return on invested capital — how well the company uses total invested capital)
- Gross Margin (pricing power)
- Operating Margin (operational efficiency)

**ROA fills the gap:** Asset efficiency independent of capital structure. ROE can be inflated by leverage (debt). ROA is immune to leverage effects — it measures returns against total assets, not just equity. This is the **anti-leverage profitability check**.

**Scoring logic already exists (disconnected):**

The QualityEngine already has a pattern for profitability sub-scores. ROA would follow the identical pattern as ROE (lines 27-37) and ROIC (lines 40-48):

```typescript
// Existing pattern in QualityEngine.evaluate() — ROE example
let roeNormalized = 50;
if (financials.roe !== null) {
  if (usePercentile) {
    roeNormalized = SectorPercentileEngine.score(financials.roe, sectorName, 'roe');
  } else {
    const roe = financials.roe;
    if (roe >= profile.roeExceptional) roeNormalized = 95;
    else if (roe >= profile.roeHigh) roeNormalized = 80;
    else if (roe >= profile.roeFair) roeNormalized = 65;
    else if (roe >= profile.roeLow) roeNormalized = 45;
    else if (roe >= 0) roeNormalized = 30;
    else roeNormalized = 10;
  }
}

// ROA would follow the same pattern:
let roaNormalized = 50;
if (financials.roa !== null) {
  if (usePercentile) {
    roaNormalized = SectorPercentileEngine.score(financials.roa, sectorName, 'roa');
  } else {
    const roa = financials.roa;
    if (roa >= 0.15) roaNormalized = 95;
    else if (roa >= 0.10) roaNormalized = 80;
    else if (roa >= 0.07) roaNormalized = 65;
    else if (roa >= 0.04) roaNormalized = 45;
    else if (roa >= 0) roaNormalized = 30;
    else roaNormalized = 10;
  }
}
```

**Composite integration point:** `QualityEngine.evaluate()`, line ~77, add `{ score: roaNormalized, weight: 2.0 }` to the `weightedAverage` array.

**Existing infrastructure that supports this:**
- `SectorPercentileEngine.score()` — already handles sector-relative scoring
- `SectorDistributionEngine` — already has distribution data for profitability metrics
- `QualityEngineOutput` — would need `roa: number` added to return

**Information gain:** ROA decorrelates quality scoring from leverage. Companies with ROE=25%/ROA=3% (debt-fueled) vs ROE=25%/ROA=18% (genuinely efficient) would now score differently. This is the single highest-differentiation missing signal.

---

### `dividendYield` → ValuationEngine

**Why ValuationEngine:** ValuationEngine evaluates how cheap/expensive a stock is using yield-based metrics:
- P/E (earnings yield)
- P/B (book value yield)
- EV/EBITDA (enterprise yield)
- FCF Yield (cash flow yield)

**Dividend Yield is the 5th classic yield metric.** It measures the actual cash return an investor receives. Unlike FCF Yield (which can be retained and reinvested), dividend yield is cash-in-hand.

**Scoring logic already exists (disconnected):**

ValuationEngine already has 4 yield-based sub-scores. Dividend yield would follow the same weightedAverage integration pattern:

```typescript
// Example scoring (ValuationEngine.evaluate(), after fcfYield block ~line 78):
let dividendYieldScore = 50;
const dY = financials.dividendYield;
if (dY !== null) {
  if (dY >= 0.06) dividendYieldScore = 85;      // very high yield — value territory
  else if (dY >= 0.04) dividendYieldScore = 75;
  else if (dY >= 0.03) dividendYieldScore = 65;
  else if (dY >= 0.02) dividendYieldScore = 55;
  else if (dY >= 0.01) dividendYieldScore = 45;
  else if (dY > 0) dividendYieldScore = 35;
  else dividendYieldScore = 20;                   // no dividend — growth company

  // Dividend trap check: yields above 10% suggest distress
  if (dY >= 0.10) dividendYieldScore = Math.min(dividendYieldScore, 40);
}
```

**Composite integration:** Add `{ score: dividendYieldScore, weight: 1.5 }` to weightedAverage.

**Caveat:** Needs sector awareness — utilities and tobacco companies naturally have higher yields than tech. The percentile engine could handle this if sector distribution data is added.

**Information gain:** Adds a value dimension not captured by any existing metric. P/E, P/B, EV/EBITDA, and FCF Yield all measure the company's internal valuation. Dividend yield adds the **shareholder return** dimension.

---

### `marketCap` → StabilityEngine

**Why StabilityEngine:** StabilityEngine measures balance-sheet resilience — debt levels, liquidity, volatility, coverage ratios. Larger companies empirically have:
- Lower bankruptcy risk
- Better access to capital markets
- More diversified revenue streams
- Lower volatility

**marketCap is a structural stability signal** — it's not a financial ratio, but it's a strong predictor of overall company resilience.

**Scoring logic already exists (disconnected):** StabilityEngine already has a multi-sub-score composite. Adding a size modifier is straightforward:

```typescript
// Size-based stability modifier (log-scale for diminishing returns):
let sizeScore = 50;
const mc = financials.marketCap;
if (mc !== null && mc > 0) {
  // Log-scale: ₹1,000cr → 35, ₹10,000cr → 55, ₹1,00,000cr → 75, ₹10,00,000cr → 95
  const logMC = Math.log10(mc);
  sizeScore = clampScore((logMC - 9) * 20 + 35);  // log10(1e9) = 9 → baseline=35
}
```

**Composite integration:** Add `{ score: sizeScore, weight: 1.0 }` to StabilityEngine weightedAverage.

**Why weight=1.0 (not higher):** marketCap should be a modifier, not a primary driver. A company with great balance sheet metrics should still score well even if it's small. Size is a bonus stability signal, not a gate.

**Information gain:** Modest. Size is a weak stability signal compared to debt ratios and liquidity. But it provides a useful tiebreaker for companies with similar financial metrics.

---

### `bookValue` → ValuationEngine (pbScore modifier)

**Why ValuationEngine:** ValuationEngine already scores P/B ratio. Book Value per share is the denominator of P/B. Direct bookValue adds:
- Negative book value detection (already partially captured by P/B < 0)
- Book value growth trend (if historical data were available — currently single-snapshot only)
- Graham-style "net-net" threshold (price < 2/3 book value)

**Scoring logic already exists (disconnected):** The pbScore in ValuationEngine (lines 42-51) could be nuanced with bookValue data:

```typescript
// Book-value-based pbScore modifier:
if (financials.bookValue !== null && financials.bookValue <= 0) {
  // Negative book value = insolvent — pbScore capped at 10 regardless of P/B
  pbScore = Math.min(pbScore, 10);
} else if (financials.bookValue !== null && financials.pbRatio !== null) {
  // Low absolute book value → high P/B could be misleading (tiny equity base)
  // This is an informational modifier, not a scoring change
  // Most of the signal is already in P/B itself
}
```

**Information gain:** Very low. P/B already captures 90%+ of the book value signal. Raw bookValue adds information only in edge cases (negative equity, micro-cap valuation floors).

---

### Fields That Should NOT Get a New Consumer

| Field | Why Not |
|-------|---------|
| `operatingMargin` | Already consumed by 5 engines — no new consumer needed |
| `eps` | Correctly used by ConfidenceEngine only — absolute EPS is not comparable. `epsGrowth` and `peRatio` carry the scoring signal. |
| `freeCashFlow` | Correctly excluded — `fcfYield` and `fcfGrowth` are the comparable forms. Raw FCF amounts should never enter cross-sectional scoring. |

---

## Engine-to-Field Consumer Map (Post-Activation)

After activating all recommended fields, the engine map would look like:

| Engine | Pre-Activation Fields | Post-Activation Additions | Total Sub-Scores |
|--------|----------------------|--------------------------|:----------------:|
| GrowthEngine | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | — | 4 |
| QualityEngine | roe, roic, grossMargin, operatingMargin | **roa** | 5 |
| StabilityEngine | debtToEquity, currentRatio, volatility, coverage, interestCoverage | **marketCap (size)** | 6 |
| MomentumEngine | rsi, macd, adx, trendStrength | — | 4 |
| ValuationEngine | peRatio, pbRatio, evEbitda, fcfYield | **dividendYield** | 5 |
| RiskEngine | fcfYield, volatility, beta, revenueGrowth, epsGrowth | — | 5 |
| AccountingEngine | fcfYield, revenueGrowth, epsGrowth, currentRatio | — | 4 |
| ConfidenceEngine | roe, roic, debtToEquity, fcfYield (critical) + 16 supplementary | — | 20 |

---

## Disconnected Infrastructure Inventory

These scoring mechanisms already exist in the codebase but aren't wired to any dead field:

| Infrastructure | File | Currently Used For | Could Be Used For |
|:--------------|------|:-------------------|:------------------|
| `SectorPercentileEngine.score()` | `src/stockstory/scoring/SectorPercentileEngine.ts` | peRatio, pbRatio, roe, roic, debtToEquity, etc. | **roa**, dividendYield |
| `SectorDistributionEngine` | `src/stockstory/analytics/SectorDistributionEngine.ts` | Pre-loaded distribution data for all active metrics | **roa** (would need distribution data) |
| `weightedAverage()` | `src/stockstory/types.ts` | All engines | All new sub-scores |
| `clampScore()` | `src/stockstory/types.ts` | All engines | All new sub-scores |
| `getSectorProfile()` | `src/stockstory/SectorAdapter.ts` | Threshold-based scoring | Sector-aware thresholds for new fields |
| QualityEngine sub-score pattern | `src/stockstory/engines/QualityEngine.ts:27-73` | roe, roic, grossMargin, operatingMargin | **roa** (identical pattern) |
| ValuationEngine yield pattern | `src/stockstory/engines/ValuationEngine.ts:20-78` | pe, pb, evEbitda, fcfYield | **dividendYield** (identical pattern) |
