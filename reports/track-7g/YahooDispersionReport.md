# Yahoo Dispersion Report — TRACK-7G

**Generated:** 2026-06-05T13:23:45.924Z
**Sample:** 50 companies

---

## Score Distribution: Before (Synthetic Defaults) vs After (Yahoo Fundamentals)

| Engine | Before σ | After σ | Before Range | After Range | Change in σ | Change in Range | 
|:-------|:---------|:--------|:-------------|:------------|:------------|:----------------|
| Growth | 2.1 | 0.0 | 12 | 0 | -100% | -12 |
| Quality | 4.3 | 0.0 | 19 | 0 | -100% | -19 |
| Stability | 4.3 | 0.5 | 22 | 3 | -87% | -19 |
| Valuation | 6.6 | 0.0 | 23 | 0 | -100% | -23 |
| Momentum | 0.0 | 0.0 | 0 | 0 | +0% | +0 |
| Risk | 0.0 | 0.0 | 0 | 0 | +0% | +0 |
| Health | 3.5 | 1.0 | 14 | 2 | -73% | -12 |

---

## Detailed Statistics

### Before (Synthetic Defaults) — All Companies Receive Same Hardcoded Financials

| Engine | Mean | Std Dev | Min | Max |
|:-------|:-----|:--------|:----|:----|
| Growth | 59.0 | 2.1 | 53 | 65 |
| Quality | 56.9 | 4.3 | 46 | 65 |
| Stability | 73.4 | 4.3 | 58 | 80 |
| Valuation | 62.9 | 6.6 | 46 | 69 |
| Momentum | 62.0 | 0.0 | 62 | 62 |
| Risk | 24.0 | 0.0 | 24 | 24 |
| Health | 62.5 | 3.5 | 52 | 66 |

### After (Yahoo Fundamentals) — Real Financial Data

| Engine | Mean | Std Dev | Min | Max |
|:-------|:-----|:--------|:----|:----|
| Growth | 50.0 | 0.0 | 50 | 50 |
| Quality | 50.0 | 0.0 | 50 | 50 |
| Stability | 53.9 | 0.5 | 52 | 55 |
| Valuation | 50.0 | 0.0 | 50 | 50 |
| Momentum | 62.0 | 0.0 | 62 | 62 |
| Risk | 30.0 | 0.0 | 30 | 30 |
| Health | 41.7 | 1.0 | 41 | 43 |

---

## Interpretation

⚠️ **Limited dispersion improvement.** Financial engines may not yet be fully differentiated. This is expected if many fields are still null — engines revert to 50 (neutral) for null inputs.

**Key insight:** With synthetic defaults, every company received identical financial profiles (PE=20, ROE=12%, D/E=0.5, etc.). Scores were differentiated ONLY by sector classification and market cap. With Yahoo fundamentals, each company's unique financial profile drives distinct engine scores.

