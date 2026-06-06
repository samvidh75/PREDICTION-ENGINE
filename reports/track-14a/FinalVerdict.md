# TRACK-14A — Final Verdict

## Ranking System Statistical Validation

---

## Q7: Is StockStory Now Primarily Fundamental, Technical, Hybrid, or Quant-Factor?

### Answer: **HYBRID — Fundamentally-Driven with Technical Confirmation**

| Dimension | Classification | Evidence |
|-----------|---------------|----------|
| Primary ranking drivers | **Fundamental** — ROE, ROA, ROIC, D/E, Revenue Growth, PE Ratio | Quality (25-35%) + Stability (15-30%) + Growth (15-30%) + Valuation (15-25%) = **80-90% of pre-adjustment health** |
| Secondary ranking drivers | **Technical** — RSI, MACD, ADX, Trend Strength, Volatility | Momentum (10-15%) = **10-15% of pre-adjustment health** |
| Risk adjustment | **Quant-factor** — RiskEngine dampening + penalty framework | Post-stretch subtractive adjustments |
| Sector calibration | **Quant-factor** — SectorWeightEngine + SectorPercentileEngine | Adaptive weights and percentile distributions |

**Weighted breakdown:**
- 70-75% Fundamental (Quality + Stability + Growth + Valuation engines)
- 10-15% Technical (Momentum engine)
- 10-15% Quant-factor (Risk dampening, penalties, sector adjustments, stretch function)

**StockStory is NOT a pure technical system** (technicals contribute at most 15% of health). **It is NOT a pure fundamental screener** (the quant-factor layer — stretch, risk dampening, sector weights — transforms raw fundamentals significantly). **It IS a hybrid system with a clear fundamental foundation, technical confirmation layer, and quant-factor risk adjustment framework.**

---

## The Core Question: Can StockStory Rankings Be Trusted Today?

### What Works

| Strength | Detail |
|----------|--------|
| **Multi-dimensional** | 7 independent engines prevent single-metric gaming |
| **Well-calibrated** | Sector-aware weights and percentile distributions prevent cross-sector unfairness |
| **Grounded in code** | Every score is traceable to a specific formula with explicit weights |
| **Null-safe** | All engines handle missing data gracefully (TRACK-15 NullSafetyProof) |
| **Single source of truth** | FeatureEngine is the only technical indicator system (TRACK-15 consolidation) |
| **Audit-proven** | 20+ audits (TRACK-9 through TRACK-15) have traced every data flow |

### What's Broken

| Weakness | Impact on Trust |
|----------|----------------|
| **D/E triple-counting** | Energy/infrastructure stocks unfairly penalized 15-25 positions |
| **No cyclical earnings normalization** | Cyclical sector rankings are misleading at cycle extremes |
| **Synthetic data** | Current rankings are based on generated candles, not real market data |
| **R&D penalty** | Innovative pharma/tech companies rank below generic peers |
| **No forward-looking component** | Rankings lag reality by one quarter |

### Trust Verdict

**The ranking architecture is sound. The formulas are correct. The weights are reasonable. The sector calibration is intelligent.**

**BUT the rankings are only as trustworthy as the data they run on.** Currently, `expand-market-coverage.ts` generates synthetic OHLCV candles for 500 stocks — these are not real market data. Until real data is populated, rankings are mathematically valid but practically meaningless.

**Single biggest remaining weakness: Synthetic data dependency.** Rankings are produced by a production-grade engine running on fake inputs. Once real data flows through, the engine will produce trustworthy, defensible rankings.

---

## Summary of All 8 Questions

| Q | Question | Answer |
|---|----------|--------|
| 1 | What determines final rank? | Quality (25-35%) + Stability (15-30%) + Growth (15-30%) + Valuation (15-25%) + Momentum (10-15%) → stretched → risk-dampened → penalized |
| 2 | Which engines dominate? | Quality (dominant) + Stability (strong) = 45-65% of pre-adjustment |
| 3 | Over-dependency on any metric? | D/E has triple pathway (Stability + Risk + Penalty). ROE/ROA/ROIC are well-balanced. |
| 4 | 10+ position movers? | D/E, ROE, ROA, Revenue Growth, PE Ratio |
| 5 | Structural biases? | Asset-light, low-leverage, high-margin bias. IT/FMCG over-scored. Energy under-scored. |
| 6 | Top 5 weaknesses? | D/E triple-counting, no cyclical PE, R&D penalty, no brand moat, no forward-looking |
| 7 | System classification? | **Hybrid** — 70-75% fundamental, 10-15% technical, 10-15% quant-factor |
| 8 | Next task? | Fix D/E triple-counting (1 day, high ROI) → then populate real data |

---

## Deliverables Generated

| # | Report | Path |
|---|--------|------|
| 1 | RankingDrivers | `reports/track-14a/RankingDrivers.md` |
| 2 | FactorConcentration | `reports/track-14a/FactorConcentration.md` |
| 3 | StructuralBiasAudit | `reports/track-14a/StructuralBiasAudit.md` |
| 4 | RankingSensitivity | `reports/track-14a/RankingSensitivity.md` |
| 5 | RemainingWeaknesses | `reports/track-14a/RemainingWeaknesses.md` |
| 6 | FutureRoadmap | `reports/track-14a/FutureRoadmap.md` |
| 7 | FinalVerdict | `reports/track-14a/FinalVerdict.md` |

---

**Can StockStory rankings be trusted today? The engine is trustworthy. The data is not. Fix the data, then fix D/E triple-counting, and the rankings become production-grade.**
