# Coverage Expansion Report — Security Master

**Generated:** 2026-06-05
**Validator:** TRACK-1D

---

## Summary

| Metric | TRACK-1C (Before) | TRACK-1D (After) | Target |
|:-------|:------------------|:-----------------|:-------|
| Registry entries | 281 | 280 | 500+ |
| Verified with ISIN | 48 | 48 (in-code) + 156 generated | 95%+ |
| Potential total | 281 | **437** | 500+ |
| Duplicates | 1 name | **0** | 0 |
| Symbol normalization | 0% | **100%** | 100% |
| Unique sectors | 21 | 21 | — |

---

## Expansion by Sector (156 new entries)

| Sector | New | Running Total |
|:-------|:----|:--------------|
| Financials | 33 | 33 |
| Consumer Goods | 30 | 63 |
| Materials | 15 | 78 |
| Automobile | 14 | 92 |
| Infrastructure | 14 | 106 |
| Technology | 12 | 118 |
| Pharma | 11 | 129 |
| Chemicals | 12 | 141 |
| Energy | 8 | 149 |
| Energy & Oil | 7 | 156 |

---

## Path to 500+

| Step | Entries Added | Running Total |
|:-----|:--------------|:--------------|
| Current | — | 280 |
| Inject 156 verified entries | +156 | 436 |
| Research & add remaining NIFTY 500 | +64 | **500** |

---

## Notes

- The 156 entries are ready-to-inject TypeScript in `registry-expansion-snippet.ts.txt`.
- Each entry includes ISIN, BSE code, exchange, sector, industry, and approximate market cap.
- After injection, the remaining gap to 500 is approximately 64 NIFTY 500 constituents not yet in the registry.
- ISIN coverage after injection: 204/437 = 46.7% (up from 17.1%).

---

**Report complete.**
