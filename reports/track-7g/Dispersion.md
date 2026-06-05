# Score Dispersion — TRACK-7G

**Generated:** 2026-06-05T13:27:42.177Z
**Sample:** 50 companies with Yahoo quoteSummary financials

---

## Score Distributions

| Engine | Mean | Std Dev | Min | Max | Range | P10 | P25 | P50 | P75 | P90 | Differentiated? |
|:-------|:-----|:--------|:----|:----|:------|:----|:----|:----|:----|:----|:----------------|
| Growth | 50.0 | 0.0 | 50 | 50 | 0 | 50 | 50 | 50 | 50 | 50 | ❌ Weak |
| Quality | 50.0 | 0.0 | 50 | 50 | 0 | 50 | 50 | 50 | 50 | 50 | ❌ Weak |
| Stability | 53.9 | 0.5 | 52 | 55 | 3 | 54 | 54 | 54 | 54 | 54 | ❌ Weak |
| Valuation | 50.0 | 0.0 | 50 | 50 | 0 | 50 | 50 | 50 | 50 | 50 | ❌ Weak |
| Momentum | 62.0 | 0.0 | 62 | 62 | 0 | 62 | 62 | 62 | 62 | 62 | ❌ Weak |
| Risk | 30.0 | 0.0 | 30 | 30 | 0 | 30 | 30 | 30 | 30 | 30 | ❌ Weak |
| Health | 41.7 | 1.0 | 41 | 43 | 2 | 41 | 41 | 41 | 43 | 43 | ❌ Weak |

---

## Dispersion Quality Assessment

| Metric | Value | Target | Status |
|:-------|:------|:-------|:-------|
| Engines with σ ≥ 5.0 (strong differentiation) | 0/7 | ≥ 2 | ⚠️ Below target |
| Engines with σ ≥ 3.0 (at least moderate) | 0/7 | ≥ 4 | ⚠️ Below target |
| Health score range | 2 | ≥ 20 | ⚠️ Too narrow |
| Health score σ | 1.0 | ≥ 4.0 | ⚠️ Too tight |

---

## Interpretation

⚠️ **Score dispersion is limited.** The compressed scores are expected when many financial fields are null. This improves naturally as Yahoo coverage expands or when Finnhub is added as a secondary provider.

