# Explanation Quality Scoring Report

**Generated:** 2026-06-28T17:49:46.362Z

**Explanations Tested:** 7

## Scoring Results

| # | Symbol | Context | Length | Readable | Evidence | Forbidden | Pref Lang | Complete | Passed | Expected | Match? |
|---|--------|---------|--------|----------|----------|-----------|-----------|----------|--------|----------|--------|
| 1 | TCS | Q3FY24 Results | 340c | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | pass | ✅ |
| 2 | HDFCBANK | Annual Report Analysis | 321c | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | pass | ✅ |
| 3 | ADANIENT | Market Update | 129c | ✅ | ❌ | ❌ 2 | ❌ | ✅ | ❌ | fail | ✅ |
| 4 | RELIANCE | Quarterly Review | 13c | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | fail | ❌ |
| 5 | TATAMOTORS | JLR Performance | 177c | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | pass | ✅ |
| 6 | ZOMATO | Quick Commerce | 195c | ✅ | ❌ | ❌ 1 | ❌ | ✅ | ❌ | fail | ✅ |
| 7 | ITC | Business Update | 204c | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | pass | ✅ |

## Failed Explanations

### ADANIENT — Market Update

**Explanation:** "Buy this stock now! Guaranteed returns! It will double in 6 months because the promoter said so. This is a sure-shot multibagger."

**Forbidden phrases:** multibagger, guaranteed return
**Issues:**
- error: Forbidden phrases found: multibagger, guaranteed return
- info: Only 0 preferred research terms found
- info: No evidence citations or sourcing language found

### ZOMATO — Quick Commerce

**Explanation:** "Blinkit dark store count crossed 500, GOV per store improving. Contribution margin turned positive. Buy this stock for guaranteed listing gains. It is a multibagger recommendation with zero risk."

**Forbidden phrases:** multibagger
**Issues:**
- error: Forbidden phrases found: multibagger
- info: Only 1 preferred research terms found
- info: No evidence citations or sourcing language found

## Forbidden Phrase Analysis

- **Investment phrases scanned:** FORBIDDEN_INVESTMENT_PHRASES
- **Backend phrases scanned:** FORBIDDEN_BACKEND_PHRASES
- **Preferred language terms:** ALLOWED_USER_LANGUAGE
- **Detected:** multibagger, guaranteed return

## Summary

- **Total:** 7
- **Passed:** 5
- **Failed:** 2
- **Pass rate:** 71.4%