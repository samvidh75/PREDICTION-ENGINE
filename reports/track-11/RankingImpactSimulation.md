# Ranking Impact Simulation — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06
**Method:** Analytical simulation — modelled score impact of each field activation on a 500-stock universe across the full StockStory pipeline

---

## Simulation Methodology

Since we cannot run live code changes (audit-only rule), we simulate impact analytically by tracing the exact score computation path:

```
Field → Engine sub-score (0-100) → Engine composite (0-100) → Sector-weighted health score → Final healthScore
```

### Assumptions

- **Universe:** 500 Indian stocks across all sectors
- **Data availability:** ~80% of stocks have ROA (from Upstox). ~70% have dividendYield (from Screener/Finnhub). ~95% have marketCap (from metadata/registry).
- **Field value distributions:** Approximated from publicly known Indian market data
- **Scoring weights:** As defined in the engine source code (QualityEngine composite weights = 10 total, ValuationEngine = ~9 total, StabilityEngine = 10 total)
- **Sector weights:** As defined in SectorWeightEngine/SectorAdapter
- **Health score stretch factor:** 1.7x from center=58 (StockStoryEngine line 79)
- **Risk dampening:** 0.45 coefficient (StockStoryEngine line 84)

---

## Individual Field Activation Impact

### Simulation 1: `roa` → QualityEngine (P0)

**Input distribution (Indian market, estimated):**
- ROA ≥ 15%: Top 5% of companies (ITC, TCS, Asian Paints — asset-light)
- ROA 10-15%: Top 15%
- ROA 7-10%: Median 30%
- ROA 4-7%: Bottom 30%
- ROA 0-4%: Bottom 15%
- ROA < 0: Bottom 5% (loss-making)

**Current QualityEngine composite vs with ROA added:**

| Company Type | Current Quality Score | ROA Sub-Score | New Quality Score | Δ Quality | Δ healthScore* |
|:-------------|:--------------------:|:------------:|:-----------------:|:---------:|:-------------:|
| Asset-light efficiency (ROA=18%, ROE=25%) | 75 | 95 | 79 | +4 | **+0.8** |
| Leveraged returns (ROA=5%, ROE=25%) | 75 | 45 | 70 | -5 | **-1.0** |
| Average (ROA=8%, ROE=15%) | 62 | 65 | 63 | +1 | **+0.2** |
| Weak but profitable (ROA=3%, ROE=5%) | 38 | 30 | 37 | -1 | **-0.2** |
| ROA = null (no Upstox data) | 50 | 50 | 50 | 0 | **0** |

**\*healthScore Δ = qualityScore Δ × sectorWeight(0.20 avg) × stretchFactor(1.7) × afterRiskDampening(~0.85)**

**Key finding:** ROA activation creates a **bidirectional differentiation** — companies with genuine efficiency get boosted, companies with debt-inflated ROE get penalized. The maximum healthScore shift is ±1.5 pts for extreme cases, ±0.5-1.0 for typical cases.

**Ranking impact:** In a 500-stock ranking:
- ~25 highly leveraged companies (high ROE, low ROA) would drop 5-10 ranks
- ~25 genuinely efficient companies (high ROE, high ROA) would rise 5-10 ranks
- ~400 companies would shift ≤ 2 ranks
- ~50 companies with null ROA (no Upstox data) would be unchanged

---

### Simulation 2: `dividendYield` → ValuationEngine (P1)

**Input distribution (Indian market, estimated):**
- Dividend Yield ≥ 5%: Top 10% (ITC, Coal India, NTPC, PSU banks)
- Dividend Yield 3-5%: Top 25%
- Dividend Yield 1.5-3%: Median 30%
- Dividend Yield 0-1.5%: Bottom 25%
- Dividend Yield = 0% (no dividend): Bottom 10% (growth companies)
- Null (no data): 30% of universe

**Current ValuationEngine composite vs with dividendYield added:**

| Company Type | Current Val Score | Div Yield Sub-Score | New Val Score | Δ Val | Δ healthScore |
|:-------------|:-----------------:|:------------------:|:------------:|:-----:|:------------:|
| High-yield value (DY=6%, PE=12) | 72 | 85 | 74 | +2 | **+0.4** |
| Moderate yield (DY=2.5%, PE=18) | 55 | 55 | 55 | 0 | **0** |
| No dividend growth (DY=0%, PE=35) | 32 | 20 | 30 | -2 | **-0.4** |
| Dividend trap (DY=12%, PE=5) | 85 | 40 | 80 | -5 | **-1.0** |
| Null (no data) | 50 | 50 | 50 | 0 | **0** |

**Key finding:** Dividend yield adds the most differentiation for **value vs growth** classification and for **dividend trap detection**. The maximum shift is ±1.0 healthScore pts.

**Ranking impact:**
- ~50 high-yield value stocks would rise 3-8 ranks
- ~50 no-dividend growth stocks would drop 3-8 ranks
- ~10 dividend-trap stocks (yield > 10%) would drop 5-15 ranks (safety mechanism)
- ~350 stocks within ±2 rank shifts
- ~90 stocks with null dividendYield unchanged

---

### Simulation 3: `marketCap` → StabilityEngine (P1)

**Input distribution (Indian market, actual from registry):**
- Mega cap (>₹1,00,000cr): ~15 stocks (RELIANCE, TCS, HDFCBANK, INFY, etc.)
- Large cap (₹25,000-1,00,000cr): ~85 stocks
- Mid cap (₹5,000-25,000cr): ~200 stocks
- Small cap (<₹5,000cr): ~200 stocks
- Null: ~5 stocks

**Current StabilityEngine composite vs with size modifier added:**

| Company Type | Current Stability Score | Size Modifier | New Stability Score | Δ Stability | Δ healthScore |
|:-------------|:----------------------:|:------------:|:-----------------:|:-----------:|:------------:|
| Mega cap (₹1,50,000cr) | 65 | 78 | 66 | +1 | **+0.2** |
| Large cap (₹30,000cr) | 58 | 55 | 58 | 0 | **0** |
| Mid cap (₹8,000cr) | 55 | 42 | 53 | -2 | **-0.3** |
| Small cap (₹800cr) | 52 | 30 | 50 | -2 | **-0.3** |
| Null | 50 | 50 | 50 | 0 | **0** |

**Key finding:** The log-scale nature of the size modifier means only the tails (mega caps and micro caps) see meaningful shifts. Mid-range companies barely move.

**Ranking impact:**
- ~15 mega caps rise 2-5 ranks
- ~50 micro caps drop 2-5 ranks
- ~430 companies within ±1 rank (negligible)
- Stability weight is only 0.15-0.18 in sector-weighted health, diluting the impact

---

### Simulation 4: `bookValue` → ValuationEngine pbScore modifier (P2)

**Input distribution:**
- Negative book value: <2% of universe (insolvent/distressed)
- Positive book value: 98% of universe

**Impact:**

| Company Type | Current pbScore | Book Value Modifier | New pbScore | Δ Val | Δ healthScore |
|:-------------|:--------------:|:------------------:|:----------:|:-----:|:------------:|
| Negative book value, low P/B (distressed) | 15 | 10 (capped) | 15 | 0 | **0** |
| Positive book value, normal P/B | 55 | — | 55 | 0 | **0** |

**Key finding:** P/B already captures all book-value signal for 98%+ of companies. The only edge case (negative book value) is already priced in via P/B ≤ 0 → pbScore = 15. Adding raw bookValue would change **zero scores in practice**.

**Ranking impact:** < 5 companies might shift 1 rank at the extreme edge. **Effectively zero.**

---

## Field Value Distributions in Indian Market Context

| Field | Bottom 5% | Bottom 25% | Median | Top 25% | Top 5% | Null % |
|-------|:---------:|:----------:|:------:|:-------:|:------:|:------:|
| `roa` | < 0% | 2-4% | 7% | 12% | > 18% | 20% |
| `dividendYield` | 0% | 0-0.5% | 1.2% | 3% | > 6% | 30% |
| `marketCap` (₹cr) | < 500 | 500-3,000 | 8,000 | 30,000 | > 2,00,000 | 1% |
| `bookValue` (₹/share) | < 0 | 10-50 | 150 | 500 | > 2,000 | 15% |

---

## Composite Ranking Impact: All Activations Combined

If all recommended fields (`roa` → QualityEngine, `dividendYield` → ValuationEngine, `marketCap` → StabilityEngine) were activated simultaneously:

| Stock Archetype | Pre-Activation Rank | Post-Activation Rank | Δ Rank | Reason |
|:---------------|:-------------------:|:--------------------:|:------:|:------|
| High-quality mega cap with strong dividend (e.g., ITC) | 45 | 38 | **-7** | ROA boost + size bonus + dividend boost |
| Genuinely efficient growth (e.g., TCS) | 12 | 10 | **-2** | ROA boost + size bonus; no dividend penalty neutral |
| Debt-fueled large cap, low ROA, no dividend (e.g., leverage-heavy infra) | 55 | 62 | **+7** | ROA penalty + no div = slight penalty + no size bonus |
| High-growth small cap, no dividend, high ROE but moderate ROA | 120 | 125 | **+5** | ROA moderate, small cap penalty, no dividend |
| Value play with high dividend, mid cap (e.g., Coal India) | 78 | 71 | **-7** | Dividend yield boost + moderate ROA |
| Distressed company, negative PE, negative ROA | 490 | 492 | **+2** | ROA penalty (already scored low) |
| No data available (null financials) | 250 | 250 | **0** | All null fields → all neutral sub-scores |

---

## Information Gain Per Field

**Information gain** = how much new, non-redundant signal the field adds to the scoring system.

| Field | IG Score (1-10) | Reasoning |
|-------|:---------------:|-----------|
| `roa` | **8.5** | Unique signal — leverage-adjusted profitability. ROE/ROIC don't capture asset efficiency. Directly addresses a known false-positive bias. |
| `dividendYield` | **6.0** | Unique signal — shareholder cash return. No existing metric captures this. PE/PB/FCF Yield all measure company-level economics, not investor-level returns. |
| `marketCap` | **3.0** | Weak unique signal — size correlates with stability but debt/liquidity metrics are stronger predictors. Adds only a tiebreaker signal. |
| `bookValue` | **1.0** | Nearly zero unique signal — P/B captures 90%+ of book value information. Redundant with existing metric. |

---

## Ranking Improvement Per Line of Code

| Field | LOC Required | Max Rank Δ | ΔRank per LOC | Priority |
|-------|:-----------:|:----------:|:------------:|:--------:|
| `roa` | 40 | ±10 | **0.25** | **#1** |
| `dividendYield` | 25 | ±15 | **0.60** | **#1.5** |
| `marketCap` | 15 | ±5 | **0.33** | **#3** |
| `bookValue` | 30 | ±1 | **0.03** | **#4** |

**Note on dividendYield:** While the ΔRank/LOC is highest, it's concentrated in value/dividend stocks and dividend-trap scenarios. ROA has broader impact across the universe. ROA's ranking impact is lower per LOC but more **universally applicable**.

---

## Which Activation Gives the Largest Ranking Improvement?

### By Maximum Rank Shift: `dividendYield` (±15 ranks for extreme cases)
Dividend traps (yield > 10%) see the largest single-company correction. High-yield value stocks also see meaningful boosts. But this affects only ~15% of the universe.

### By Universe Coverage: `roa` (±10 ranks, affects ~90% of the universe)
ROA shifts almost every company with Upstox data (80% of universe). The differentiation is more uniform. ROA also addresses a **false-positive bias** (debt-fueled companies scoring as "high quality") — this is an accuracy correction, not just a ranking reshuffle.

### By Effort Ratio: `dividendYield` (25 LOC, no plumbing needed)
Dividend yield requires only engine code. ROA requires type + mapper + engine. If speed matters, dividend yield is the fastest activation.

### Overall Winner: `roa`
ROA provides the highest **information gain** (8.5/10), addresses a confirmed false-positive bias, and affects the broadest portion of the universe. It requires more plumbing but delivers the most scoring improvement.
