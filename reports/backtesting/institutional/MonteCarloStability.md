# Monte Carlo Stability Testing — Institutional Backtesting

**Generated:** 2026-06-05T10:24:58.411Z
**Iterations:** 250 bootstrap samples
**Sample Size:** 40 per iteration

---

## Factor Correlation Stability (95% CI via Bootstrap)

| Factor | Horizon | Mean r | 95% CI Lower | 95% CI Upper | Stable? |
|:-------|:--------|:-------|:-------------|:-------------|:--------|
| growth | 1M | 2.6% | -24.3% | 26.1% | ⚠️ Unstable — CI crosses zero |
| quality | 1M | -4.8% | -38.5% | 24.0% | ⚠️ Unstable — CI crosses zero |
| stability | 1M | 2.5% | -24.4% | 33.7% | ⚠️ Unstable — CI crosses zero |
| valuation | 1M | -2.1% | -35.2% | 28.7% | ⚠️ Unstable — CI crosses zero |
| momentum | 1M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| risk | 1M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| growth | 3M | 0.8% | -28.8% | 33.3% | ⚠️ Unstable — CI crosses zero |
| quality | 3M | -0.4% | -34.1% | 41.1% | ⚠️ Unstable — CI crosses zero |
| stability | 3M | -0.9% | -35.3% | 22.7% | ⚠️ Unstable — CI crosses zero |
| valuation | 3M | -1.7% | -30.2% | 24.8% | ⚠️ Unstable — CI crosses zero |
| momentum | 3M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| risk | 3M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| growth | 6M | -2.2% | -29.6% | 23.3% | ⚠️ Unstable — CI crosses zero |
| quality | 6M | -3.3% | -37.2% | 32.9% | ⚠️ Unstable — CI crosses zero |
| stability | 6M | 0.4% | -30.0% | 33.2% | ⚠️ Unstable — CI crosses zero |
| valuation | 6M | -4.1% | -38.3% | 24.9% | ⚠️ Unstable — CI crosses zero |
| momentum | 6M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| risk | 6M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| growth | 12M | -2.8% | -28.2% | 16.8% | ⚠️ Unstable — CI crosses zero |
| quality | 12M | -0.3% | -33.2% | 29.9% | ⚠️ Unstable — CI crosses zero |
| stability | 12M | 3.6% | -27.9% | 36.7% | ⚠️ Unstable — CI crosses zero |
| valuation | 12M | -9.9% | -41.5% | 21.9% | ⚠️ Unstable — CI crosses zero |
| momentum | 12M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |
| risk | 12M | 0.0% | 0.0% | 0.0% | ⚠️ Unstable — CI crosses zero |

---

## Factor Robustness Summary

| Factor | Stable Horizons | Overall Robustness |
|:-------|:----------------|:-------------------|
| growth | 0/4 | ❌ Unstable |
| quality | 0/4 | ❌ Unstable |
| stability | 0/4 | ❌ Unstable |
| valuation | 0/4 | ❌ Unstable |
| momentum | 0/4 | ❌ Unstable |
| risk | 0/4 | ❌ Unstable |

---

## Key Findings

- **Unstable factors** (CI crosses zero in all horizons): growth, quality, stability, valuation, momentum, risk
- These factors should be reweighted or retired.
