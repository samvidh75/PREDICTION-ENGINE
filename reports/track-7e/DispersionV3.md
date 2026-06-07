# Score Dispersion V3 — TRACK-7E

**Generated:** 2026-06-05T12:28:41.826Z
**Sample:** 50 companies with fallback financials

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
| Engines with σ ≥ 3.0 (strong differentiation) | 0/7 | ≥ 4 | ⚠️ Below target |
| Engines with σ ≥ 1.5 (at least moderate) | 0/7 | ≥ 6 | ⚠️ Below target |
| Health score range | 2 | ≥ 20 | ⚠️ Too narrow |
| Health score σ | 1.0 | ≥ 4.0 | ⚠️ Too tight |

## Source Attribution

| Data Category | Source | Active? |
|:--------------|:-------|:--------|
| Financial statements (PE, ROE, D/E, growth, margins) | Finnhub stock/metric | ❌ Not available |
| Market data (market cap) | MasterCompanyRegistry | ✅ Always |
| Technicals (RSI, MACD, ADX, volatility) | Yahoo Finance | ✅ Always (computed) |
| Sector classification | MasterCompanyRegistry | ✅ Always |

---

## Interpretation

⚠️ **Score dispersion is limited.** With current data availability, the engines produce compressed scores. This is expected when Finnhub coverage is thin for Indian equities. Expanding to additional data sources or accepting some fallback values would widen the distribution.

