# Sanity Check — TRACK-7G

**Generated:** 2026-06-05T13:27:42.179Z
**Sample:** 50 companies ranked by Health Score

---

## Top 10 Companies

| Rank | Symbol | Health | Growth | Quality | Stability | Valuation | Risk |
|:-----|:-------|:-------|:-------|:--------|:----------|:----------|:-----|
| 1 | HAL | 43 | 50 | 50 | 54 | 50 | 30 |
| 2 | BEL | 43 | 50 | 50 | 54 | 50 | 30 |
| 3 | GRANULES | 43 | 50 | 50 | 55 | 50 | 30 |
| 4 | LT | 43 | 50 | 50 | 54 | 50 | 30 |
| 5 | MARUTI | 43 | 50 | 50 | 54 | 50 | 30 |
| 6 | M_M | 43 | 50 | 50 | 54 | 50 | 30 |
| 7 | BHARTIARTL | 43 | 50 | 50 | 54 | 50 | 30 |
| 8 | SUNPHARMA | 43 | 50 | 50 | 55 | 50 | 30 |
| 9 | SAIL | 43 | 50 | 50 | 54 | 50 | 30 |
| 10 | TATASTEEL | 43 | 50 | 50 | 54 | 50 | 30 |

---

## Bottom 10 Companies

| Rank | Symbol | Health | Growth | Quality | Stability | Valuation | Risk |
|:-----|:-------|:-------|:-------|:--------|:----------|:----------|:-----|
| 50 | COLPAL | 41 | 50 | 50 | 54 | 50 | 30 |
| 49 | CANBK | 41 | 50 | 50 | 54 | 50 | 30 |
| 48 | BRITANNIA | 41 | 50 | 50 | 54 | 50 | 30 |
| 47 | BANKINDIA | 41 | 50 | 50 | 54 | 50 | 30 |
| 46 | BANKBARODA | 41 | 50 | 50 | 54 | 50 | 30 |
| 45 | BANDHANBNK | 41 | 50 | 50 | 54 | 50 | 30 |
| 44 | ASIANPAINT | 41 | 50 | 50 | 54 | 50 | 30 |
| 43 | APOLLOHOSP | 41 | 50 | 50 | 54 | 50 | 30 |
| 42 | AWL | 41 | 50 | 50 | 54 | 50 | 30 |
| 41 | ATGL | 41 | 50 | 50 | 54 | 50 | 30 |

---

## Sanity Direction Check

| Metric | Top 10 Avg | Bottom 10 Avg | Expected | Actual | Correct? |
|:-------|:-----------|:--------------|:---------|:-------|:---------|
| Growth | 50.0 | 50.0 | Top > Bottom | Bottom > Top | ⚠️ |
| Quality | 50.0 | 50.0 | Top > Bottom | Bottom > Top | ⚠️ |
| Stability | 54.2 | 54.0 | Top > Bottom | Top > Bottom | ✅ |
| Valuation | 50.0 | 50.0 | Top > Bottom | Bottom > Top | ⚠️ |
| Risk | 30.0 | 30.0 | Bottom > Top | Bottom > Top | ⚠️ |

---

## Overall Assessment

| Correct directions | 1/5 |
| Verdict | ❌ Rank order questionable |
