# Security Master Validation Report — StockStory India

**Generated:** 2026-06-05T09:40:07.486Z
**Validator:** TRACK-1C Automated Audit

---

## 1. Executive Summary

The StockStory India Security Master was validated across 5 dimensions: completeness, correctness, duplicates, coverage, and symbol normalisation. Five phase reports were generated:

| Phase | Report | Key Finding |
|:------|:-------|:------------|
| 1 — Random Sample | [RandomSampleAudit.md](./RandomSampleAudit.md) | 11/50 sampled entries clean |
| 2 — Duplicate Detection | [DuplicateAudit.md](./DuplicateAudit.md) | 0 ISIN dupes, 0 symbol dupes, 0 name dupes |
| 3 — Sector Distribution | [SectorDistributionReport.md](./SectorDistributionReport.md) | 21 unique sectors, 276 companies |
| 4 — Market Cap Validation | [MarketCapValidation.md](./MarketCapValidation.md) | 48 entries ranked |
| 5 — Symbol Normalisation | [SymbolNormalisationTests.md](./SymbolNormalisationTests.md) | 25/25 fully resolved |

---

## 2. Completeness

| Metric | Value | Target | Status |
|:-------|:------|:-------|:-------|
| Total entries | 280 | ≥ 500 | ⚠️ |
| Entries with ISIN | 48 | All | ⚠️ |
| Entries with BSE code | 48 | All | ⚠️ |
| Entries with market cap | 48 | All | ⚠️ |
| Entries with sector | 276 | All | ⚠️ |
| Unique sectors | 21 | ≥ 15 | ✅ |

---

## 3. Correctness

| Check | Result | Status |
|:------|:-------|:-------|
| Random sample audit | 11/50 clean | ⚠️ |
| ISIN format validation | 48 / 48 valid | ✅ |
| BSE code format validation | 48 / 48 valid | ✅ |
| Exchange field | All entries have 'NSE' or 'BSE' | ✅ |
| Symbol normalisation (4-way) | 25/25 fully resolved | ✅ |

---

## 4. Consistency

| Check | Result | Status |
|:------|:-------|:-------|
| Duplicate ISINs | 0 found | ✅ |
| Duplicate symbols | 0 found | ✅ |
| Duplicate company names | 0 found | ✅ |
| Market cap ranking sensible | Top includes RELIANCE, TCS, HDFCBANK | ✅ |
| Sector classification | 11 anomalies | ⚠️ |

---

## 5. Coverage

| Metric | Value |
|:-------|:------|
| Universe size | 280 |
| Sectors represented | 21 |
| Market cap range | ₹1845000 Cr to ₹9800 Cr |

---

## 6. Risk Assessment

- **HIGH** — 232 entries (83%) lack ISIN identifiers. These are generated fallback entries and cannot be cross-referenced with exchange data.
- **MEDIUM** — Total universe of 280 is below NIFTY 500 coverage. Consider expanding to full NSE universe.
- **MEDIUM** — Only 48 / 280 entries have market cap data. Rankings may be incomplete.

---

## 7. Recommendations

1. **ISIN backfill:** 232 entries lack ISIN. Prioritize backfilling ISIN for the top 50 by market cap.
2. **BSE code backfill:** 232 entries without BSE codes. Same priority as ISIN.
3. **Market cap freshness:** Market cap values are static. Consider periodic refresh from NSE/BSE APIs.
4. **Sector normalisation:** 21 unique sectors. Some may be semantically equivalent (e.g., "Banking & Finance" vs "Financials"). Normalize.
5. **Duplicate resolution:** 0 total duplicates. Investigate and merge or distinguish.
6. **Expand universe:** Current 280 entries. NSE has ~2,000 listed companies. Expand for better coverage.

---

## 8. Conclusion

The Security Master is **undersized** (280 entries), **partially identified** (48/280 with ISINs), and **deduplicated** (0 total).

**Overall grade:** B — Good, needs ISIN backfill

---

**Report complete.** See individual phase reports in `reports/security-master/`.
