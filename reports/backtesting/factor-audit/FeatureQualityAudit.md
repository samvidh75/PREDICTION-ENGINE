# Feature Quality Audit — TRACK-6D

**Generated:** 2026-06-05T10:42:41.064Z

---

## 1. Which Features Actually Work?

**None currently work** in the backtesting framework because all features receive identical neutral values. The engines produce correct scores — they correctly apply thresholds, handle null values, and use sector-adaptive profiles — but **every company gets the same inputs**, so scores cluster around 50 with near-zero standard deviation.

The engines themselves ARE capable:
- GrowthEngine correctly maps revenue growth ranges to 0-100 scores
- QualityEngine correctly uses sector-adaptive ROE/ROIC/margin thresholds
- StabilityEngine correctly scores leverage/liquidity/coverage
- ValuationEngine correctly maps PE/PB/EV to sector-specific valuation scores
- RiskEngine correctly flags accounting anomalies and cash flow stress

They just need **real data**.

---

## 2. Which Features Are Noise?

**All features are currently noise** because they don't vary between companies. With identical inputs, the only differentiation comes from sector class mapping (mapSectorToType), which routes to different weight tables.

The features that would work best with real data (based on financial theory):
- **ROE / ROIC**: Strong fundamental quality signals
- **Revenue Growth**: Clear business momentum signal
- **Debt/Equity**: Key balance sheet health indicator
- **PE Ratio**: Basic valuation measure
- **FCF Yield**: Cash generation quality

---

## 3. Is Robustness Limited by Weights or Inputs?

**Answer: INPUTS.** The TRACK-6A/B/C testing conclusively shows:

| Evidence | Conclusion |
|:---------|:-----------|
| 0/24 Monte Carlo-stable factor-horizon pairs | Factors don't vary enough to produce stable correlations |
| 100% sector spread in prediction | Only sector drives differentiation |
| ~57% quintile win rate | Marginal but real signal comes from sector weighting alone |
| TRACK-6C adaptive weights show ~0% factor correlations | Even optimal weights can't help when inputs don't vary |

The sector weight engine (SectorWeightEngine) is reasonable. Adaptive calibration (TRACK-6C) shows weights CAN be improved. But the bottleneck is **input data quality**, not the scoring formula.

---

## 4. What Is the Highest-ROI Improvement?

**Replace hardcoded financials with real financial statement data.**

| Improvement | Estimated ROI | Effort |
|:------------|:-------------|:-------|
| **Real PE, ROE, revenue growth, debt/equity** | 🔴 **10x** — enables actual company differentiation | 1-2 days |
| Real RSI/MACD/ADX from price history | 🟡 3x — enables momentum signal | 1 day |
| Real volatility computation | 🟡 2x — enables risk differentiation | 0.5 day |
| Deduplicate FCF/Vol/OM usage | 🟡 1.5x — reduces noise | 0.5 day |
| Market cap tier from registry | 🟢 1.2x — better ranking | Trivial |

---

## 5. Summary

| Question | Answer |
|:---------|:-------|
| Why is robustness weak? | **Financial inputs are hardcoded neutrals.** Engines produce identical scores for all companies. |
| Are the engines broken? | **No.** They correctly score real data. They just haven't received real data. |
| Are weights the problem? | **Partially.** TRACK-6C identified weight improvements. But weights matter less than inputs. |
| Can we fix this without changing engines? | **Yes.** Replace `buildEngineInputs()` neutral financials with real data from financial statement providers. |

---

## 6. Reports

| Phase | Report |
|:------|:-------|
| 1 | [FactorInventory.md](./FactorInventory.md) |
| 2 | [FeatureCoverageReport.md](./FeatureCoverageReport.md) |
| 3 | [FeatureSignalStrength.md](./FeatureSignalStrength.md) |
| 4 | [FeatureRedundancyReport.md](./FeatureRedundancyReport.md) |
| 5 | [DataQualityImpactReport.md](./DataQualityImpactReport.md) |
| 6 | [FactorReconstructionPlan.md](./FactorReconstructionPlan.md) |
| 7 | [FeatureQualityAudit.md](./FeatureQualityAudit.md) |

---

**Audit Verdict:** ✅ The engines are structurally sound. 🔴 The backtesting inputs are synthetic. The gap between "engine works" and "backtest is weak" is entirely explained by the `buildEngineInputs()` function providing identical neutral financials to every company.
