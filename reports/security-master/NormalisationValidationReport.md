# Normalisation Validation Report — Security Master

**Generated:** 2026-06-05
**Validator:** TRACK-1D Phase 3

---

## Issue Found (TRACK-1C)

`MasterCompanyRegistry.lookup()` supported symbol, BSE code, and ISIN lookups but NOT the `NSE:SYMBOL` prefix format.

```
NSE:RELIANCE → null (FAIL)
NSE:TCS     → null (FAIL)
```

## Root Cause

The `lookup()` method in `src/services/data/MasterCompanyRegistry.ts` only stripped exchange **suffixes** (`.NS`, `.BO`, `.NSE`, `.BSE`) but not **prefixes** (`NSE:`, `BSE:`).

## Fix Applied

Line 235 in `MasterCompanyRegistry.ts`:

```typescript
// Strip NSE:/BSE: prefix (e.g., "NSE:RELIANCE" → "RELIANCE")
const prefixMatch = clean.match(/^(NSE|BSE):(.+)$/);
if (prefixMatch) {
  clean = prefixMatch[2];
}
```

After stripping the prefix, the lookup falls through to the standard symbol → BSE → ISIN → suffix-strip chain.

## Validation Results — 25 Companies Tested

| # | Symbol | Symbol Lookup | NSE:Prefix | BSE Code | ISIN | Status |
|:--|:-------|:--------------|:-----------|:---------|:-----|:-------|
| 1 | RELIANCE | ✅ | ✅ | ✅ (500325) | ✅ (INE002A01018) | ✅ |
| 2 | TCS | ✅ | ✅ | ✅ (532540) | ✅ (INE467B01029) | ✅ |
| 3 | HDFCBANK | ✅ | ✅ | ✅ (500180) | ✅ (INE040A01034) | ✅ |
| 4 | INFY | ✅ | ✅ | ✅ (500209) | ✅ (INE009A01021) | ✅ |
| 5 | ICICIBANK | ✅ | ✅ | ✅ (532174) | ✅ (INE090A01021) | ✅ |
| 6 | SBIN | ✅ | ✅ | ✅ (500112) | ✅ (INE062A01020) | ✅ |
| 7 | BHARTIARTL | ✅ | ✅ | ✅ (532454) | ✅ (INE397D01024) | ✅ |
| 8 | ITC | ✅ | ✅ | ✅ (500875) | ✅ (INE154A01025) | ✅ |
| 9 | HINDUNILVR | ✅ | ✅ | ✅ (500696) | ✅ (INE030A01027) | ✅ |
| 10 | WIPRO | ✅ | ✅ | ✅ (507685) | ✅ (INE075A01022) | ✅ |
| 11 | AXISBANK | ✅ | ✅ | ✅ (532215) | ✅ (INE238A01034) | ✅ |
| 12 | ASIANPAINT | ✅ | ✅ | ✅ (500820) | ✅ (INE021A01026) | ✅ |
| 13 | BAJAJ-AUTO | ✅ | ✅ | ✅ (532977) | ✅ (INE917I01010) | ✅ |
| 14 | BRITANNIA | ✅ | ✅ | ✅ (500825) | ✅ (INE216A01030) | ✅ |
| 15 | CIPLA | ✅ | ✅ | ✅ (500087) | ✅ (INE059A01019) | ✅ |
| 16 | COALINDIA | ✅ | ✅ | ✅ (533278) | ✅ (INE522F01014) | ✅ |
| 17 | EICHERMOT | ✅ | ✅ | ✅ (505200) | ✅ (INE066A01021) | ✅ |
| 18 | HCLTECH | ✅ | ✅ | ✅ (532281) | ✅ (INE236A01020) | ✅ |
| 19 | HEROMOTOCO | ✅ | ✅ | ✅ (500182) | ✅ (INE158A01026) | ✅ |
| 20 | KOTAKBANK | ✅ | ✅ | ✅ (500247) | ✅ (INE237A01028) | ✅ |
| 21 | NESTLEIND | ✅ | ✅ | ✅ (500790) | ✅ (INE239A01024) | ✅ |
| 22 | ONGC | ✅ | ✅ | ✅ (500312) | ✅ (INE213A01029) | ✅ |
| 23 | TATASTEEL | ✅ | ✅ | ✅ (500470) | ✅ (INE081A01020) | ✅ |
| 24 | TECHM | ✅ | ✅ | ✅ (532755) | ✅ (INE669C01036) | ✅ |
| 25 | BPCL | ✅ | ✅ | ✅ (500547) | ✅ (INE029A01011) | ✅ |

---

## Summary

| Lookup Method | Example | Before | After |
|:--------------|:--------|:-------|:------|
| Symbol | `RELIANCE` | ✅ | ✅ |
| NSE: prefix | `NSE:RELIANCE` | ❌ | ✅ |
| BSE code | `500325` | ✅ | ✅ |
| ISIN | `INE002A01018` | ✅ | ✅ |
| **Overall pass rate** | **25/25** | **0%** | **100%** |

---

## Supported Normalisation Formats

The following all resolve to the correct `RegistryEntry`:

| Input Format | Example | Resolution |
|:-------------|:--------|:-----------|
| Bare NSE ticker | `RELIANCE` | Symbol lookup |
| NSE: prefix | `NSE:RELIANCE` | Prefix stripped → symbol lookup |
| BSE: prefix | `BSE:500325` | Prefix stripped → BSE code lookup |
| BSE numeric code | `500325` | BSE code lookup |
| ISIN | `INE002A01018` | ISIN lookup |
| .NS suffix | `RELIANCE.NS` | Suffix stripped → symbol lookup |
| .BO suffix | `RELIANCE.BO` | Suffix stripped → symbol lookup |

---

**Report complete.** 100% normalisation pass rate.
