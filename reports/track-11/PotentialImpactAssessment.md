# Potential Impact Assessment — TRACK-11

**Date:** 2026-06-06

---

## Quantified Score Impact Estimates

Each dead/weak field is analysed for how much it would change the composite `healthScore` if connected. The StockStory engine flow is:

```
engine sub-scores (0-100 each)
  → sector-weighted health score (weighted average of growth, quality, stability, valuation, momentum)
  → risk dampening
  → penalty application
  → final healthScore
```

---

### 1. `roa` → QualityEngine → healthScore

**Connection path:**
- Provider: UpstoxFundamentalsProvider → Coordinator merge → DB → EngineInputs
- Engine: QualityEngine → `roaNormalized` sub-score (weight ~2.0 in composite of weights ~10)
- Upstream: QualityEngine composite score → sector-weighted health (quality weight varies by sector, typically 0.18-0.25)

**Score impact estimate:**

| Scenario | roa value | roaNormalized (sub) | QualityEngine change | healthScore change |
|----------|-----------|---------------------|---------------------|--------------------|
| High efficiency company | 0.15 (15%) | 95 | +~8 pts on quality score | +1.5 to 2 pts |
| Average company | 0.07 (7%) | 65 | +~3 pts on quality score | +0.5 to 1 pt |
| Low efficiency company | 0.02 (2%) | 35 | -3 pts on quality score | -0.5 to 1 pt |
| ROA missing (null) | null | 50 (neutral) | 0 | 0 |

**Weighted impact across universe:** ±1-3 points on `healthScore` for most companies.

**Correlation risk:** ROA correlates with ROE (r ≈ 0.75) and ROIC (r ≈ 0.70). Adding ROA would increase the quality composite's multi-collinearity slightly, but ROA captures asset efficiency that ROE doesn't (ROE = Net Income / Equity, which can be inflated by leverage). **ROA is the anti-leverage profitability metric** — it rewards capital-light businesses that don't need debt to generate returns.

**Verdict:** High differentiation value for leverage-adjusted quality assessment. Would help distinguish genuinely efficient companies from leveraged ones.

---

### 2. `bookValue` → ValuationEngine → healthScore

**Connection path:**
- Provider: ScreenerProvider → Coordinator merge → DB → EngineInputs
- Engine: ValuationEngine → could modify `pbScore` or add new sub-score

**Score impact estimate:**

| Scenario | Impact |
|----------|--------|
| Negative book value (insolvent) | Already flagged by negative P/B → pbScore already = 15 |
| Very low P/B (<0.5) | Already scored — bookValue adds no new signal |
| Moderate P/B with rising bookValue trend | Could add +3-5 to pbScore (trend bonus) |
| Declining bookValue | Could add -3 to pbScore (erosion penalty) |

**Weighted impact across universe:** ±1-2 points on `healthScore`, only material for edge cases.

**ValuationEngine already captures 80%+ of book-value signal through P/B ratio.** The marginal benefit of raw bookValue is small. Book value trends over time (not available from current single-snapshot providers) would be more valuable.

**Verdict:** Low incremental value. P/B ratio already captures book value relationship.

---

### 3. `dividendYield` → ValuationEngine → healthScore

**Connection path:**
- Provider: ScreenerProvider, FinnhubProvider → Coordinator → DB → EngineInputs
- Engine: ValuationEngine → new `dividendYieldScore` sub-component (weight ~1.5-2.0)

**Score impact estimate:**

| Scenario | dividendYield | divYieldScore | ValuationEngine change | healthScore change |
|----------|:-----------:|:------------:|----------------------|-------------------|
| High yield value play | 5% | 90 | +5-7 pts | +1 to 1.5 pts |
| Moderate yield | 2.5% | 65 | +2-3 pts | +0.5 pt |
| No dividend (growth co) | 0% | 35 | -2-3 pts | -0.5 pt |
| Distress yield (>8%) | 10% | 35 (capped) | -2-3 pts | -0.5 pt |
| null / missing | null | 50 (neutral) | 0 | 0 |

**Caveats:**
- Growth companies intentionally don't pay dividends — penalizing them would bias against tech/growth
- High dividend yields can signal distress (dividend trap) — needs a cap above 8%
- Indian market has many dividend-paying stalwarts (ITC, Coal India, etc.) where yield adds meaningful value signal

**Weighted impact across universe:** ±1-3 points on `healthScore`, with meaningful differentiation between value and growth stocks.

**Verdict:** Moderate-to-high value. Dividend yield is one of the few remaining unutilised value signals. Integrating into ValuationEngine would make it more complete as a value assessment tool. Sector-weight should be considered — banks tend to have lower yields than utilities.

---

### 4. `marketCap` (size factor) → StabilityEngine / new SizeFactor

**Connection path:**
- MetadataProviderCoordinator / ScreenerProvider → Metadata (not FinancialSnapshot for all paths)
- Engine: No current engine scores size → would need new integration

**Score impact estimate (if added to StabilityEngine):**

| Scenario | marketCap | Size modifier | Stability change | healthScore change |
|----------|-----------|:------------:|-----------------|--------------------|
| Mega cap (>₹1L Cr) | >1e12 | +10 pts | +2-3 pts (weighted) | +0.5 pt |
| Large cap (₹25k-1L Cr) | 2.5e11-1e12 | +5 pts | +1-1.5 pts | +0.2 pt |
| Mid cap (₹5k-25k Cr) | 5e10-2.5e11 | 0 | 0 | 0 |
| Small cap (<₹5k Cr) | <5e10 | -5 pts | -1 pt | -0.2 pt |
| Missing | null | 0 (neutral) | 0 | 0 |

**Weighted impact across universe:** Small (±0.5 pt) but sector-relative (a ₹5k Cr company is small in Banking but large in Textiles).

**Verdict:** Low standalone impact but serves as a useful risk/stability differentiator. Most valuable when used as a sector-relative size ranking rather than absolute.

---

### 5. `eps` (absolute EPS) → existing usage only

**Already in ConfidenceEngine as supplementary field.** No scoring engine can meaningfully use absolute EPS since it's not comparable across companies (EPS of ₹120 vs ₹5 tells you nothing about quality without price/sector context).

**Verdict:** Current usage (confidence completeness) is appropriate. No change needed.

---

### 6. `freeCashFlow` (raw) → intentionally excluded

**Ratios preferred:** `fcfYield`, `fcfGrowth` already capture FCF signal. Raw FCF amount is not comparable across companies.

**Verdict:** No change needed. Design decision is correct.

---

## Combined Impact Summary

| Field | Engine Target | Est. healthScore Δ | Differentiation Value | Correlation Risk | Implementation Effort |
|-------|:------------:|:-----------------:|:--------------------:|:----------------:|:--------------------:|
| `roa` | QualityEngine | ±1-3 pts | **HIGH** — leverage-adjusted quality | Medium (r≈0.7 with ROE) | Low — 3 file changes |
| `bookValue` | ValuationEngine | ±1-2 pts | LOW — P/B captures 80%+ | High (r≈0.9 with P/B) | Low — 3 file changes |
| `dividendYield` | ValuationEngine | ±1-3 pts | **HIGH** — unique value signal | Low (uncorrelated with P/E, P/B) | Low — 1 engine + 3 files |
| `marketCap` | StabilityEngine | ±0.5 pt | Moderate — size risk proxy | Low | Medium — new sub-component |
| `eps` | N/A | N/A | None needed | — | None |
| `freeCashFlow` | N/A | N/A | None needed | — | None |

---

## Priority Ranking by Expected Score Impact × Differentiation Value

1. **`roa`** — highest combined impact. Unique signal (asset efficiency vs equity efficiency). Easy to implement.
2. **`dividendYield`** — strong unique signal. Complements existing valuation metrics. Easy to implement.
3. **`marketCap`** — moderate impact, broader architecture question (new engine vs existing engine extension).
4. **`bookValue`** — low marginal impact. P/B already present.

---

## What Happens If We Do Nothing

Current state impact:

| Field | Current Cost |
|-------|:------------|
| `roa` | Upstox API bandwidth waste (ROA is fetched, parsed, merged — then dropped). QualityEngine misses leverage-adjusted profitability signal. Companies with high ROE but low ROA (debt-fueled returns) are scored as "high quality" — a **false positive bias**. |
| `bookValue` | Screener HTML parsing waste. P/B captures most signal. Minimal functional impact. |
| `dividendYield` | Provider bandwidth waste. **ValuationEngine is incomplete** — it evaluates P/E, P/B, EV/EBITDA, and FCF Yield but omits dividend yield, a core value metric. Value-heavy portfolios receive slightly deflated scores. |
| `marketCap` | Size-related risk is invisible to the engine system. Mega-caps get no stability credit; micro-caps get no risk penalty. |
