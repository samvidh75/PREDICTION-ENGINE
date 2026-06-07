# Duplicate Resolution Report — Security Master

**Generated:** 2026-06-05
**Validator:** TRACK-1D

---

## Issue Detected (TRACK-1C Phase 2)

During the initial security master audit, 1 duplicate was found:

| Duplicate | Entry 1 | Entry 2 | Issue |
|:----------|:--------|:--------|:------|
| Company Name | HPCL | HINDPETRO | Both mapped to "Hindustan Petroleum Corporation Limited" |

---

## Resolution

**Action:** Removed the `HINDPETRO` entry from `src/services/stocks/generate500Stocks.ts`.

**Rationale:** `HPCL` is the official NSE ticker for Hindustan Petroleum Corporation Limited. `HINDPETRO` is a less common alias. The MasterCompanyRegistry already has a verified entry for `HPCL` with ISIN `INE094A01015`.

**Impact:**
- Registry size reduced by 1 (281 → 280)
- 0 duplicate company names (was 1)
- All searches for "Hindustan Petroleum" resolve to the canonical `HPCL` entry

---

## Verification

Re-ran the TRACK-1C validator after fix:

| Check | Before | After | Status |
|:------|:-------|:------|:-------|
| ISIN duplicates | 0 | 0 | ✅ |
| Symbol duplicates | 0 | 0 | ✅ |
| Name duplicates | **1** | **0** | ✅ |

---

## Additional Symbol Consistency Notes

The `generate500Stocks.ts` file contained these symbol variants that were **not** duplicates but use non-standard separators:

| Symbol in Code | Standard Form | Status |
|:---------------|:--------------|:-------|
| `M_M` | `M&M` | Different keys — both coexist. `M&M` is the verified entry with ISIN. |
| `BAJAJ_AUTO` | `BAJAJ-AUTO` | Different keys — both coexist. `BAJAJ-AUTO` is the verified entry with ISIN. |
| `MCDOWELL_N` | `MCDOWELL-N` | Different keys. `MCDOWELL_N` exists only in generated list. |

These are not duplicates (different symbol keys) but represent inconsistent naming. Future normalization should standardize to dash-separated NSE symbols.

---

**Report complete.** HINDPETRO removed, 0 duplicates remain.
