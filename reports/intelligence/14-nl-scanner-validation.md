# Phase 14 — NL Scanner Validation Report

**Generated:** 2026-06-28T17:56:26.502Z

## Summary

- **Queries tested:** 10
- **Passed:** 10/10
- **Total stocks scanned:** 37
- **Total matches found:** 18

## Query Results

| # | Query | Expected | Matched | Passed |
| --- | --- | --- | --- | --- |
| 1 | `companies with ROE above 15` | undefined-undefined | 2/4 | ✅ |
| 2 | `stocks with PE below 15` | undefined-undefined | 2/4 | ✅ |
| 3 | `debt to equity under 0.5` | undefined-undefined | 2/4 | ✅ |
| 4 | `dividend yield above 3%` | undefined-undefined | 2/4 | ✅ |
| 5 | `rsi below 40` | undefined-undefined | 2/4 | ✅ |
| 6 | `margin above 20` | undefined-undefined | 2/4 | ✅ |
| 7 | `beta under 1` | undefined-undefined | 2/4 | ✅ |
| 8 | `market cap above 100000` | undefined-undefined | 2/4 | ✅ |
| 9 | `growth stocks with no results expected` | undefined-undefined | 0/2 | ✅ |
| 10 | `ROE above 100 and PE below 5` | undefined-undefined | 2/3 | ✅ |

## Detailed Scan Results

### Query: "companies with ROE above 15"
> ROE > 15 should match 2 of 4 stocks

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.roe` | 15 | gt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| RELIANCE | ✅ | 100 | financials.roe: 18 > 15 → ✓ |
| TCS | ✅ | 100 | financials.roe: 40 > 15 → ✓ |
| BAJAJ | ❌ | 0 | financials.roe: 10 > 15 → ✗ |
| TATAMOTORS | ❌ | 0 | financials.roe: 5 > 15 → ✗ |

### Query: "stocks with PE below 15"
> PE < 15 should match undervalued stocks

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.peRatio` | 15 | lt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| ONGC | ✅ | 100 | financials.peRatio: 6 < 15 → ✓ |
| COALINDIA | ✅ | 100 | financials.peRatio: 8 < 15 → ✓ |
| RELIANCE | ❌ | 0 | financials.peRatio: 22 < 15 → ✗ |
| TCS | ❌ | 0 | financials.peRatio: 30 < 15 → ✗ |

### Query: "debt to equity under 0.5"
> Low-debt stocks should match

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.debtToEquity` | 0.5 | lt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| INFY | ✅ | 100 | financials.debtToEquity: 0.1 < 0.5 → ✓ |
| TCS | ✅ | 100 | financials.debtToEquity: 0.05 < 0.5 → ✓ |
| ADANIENT | ❌ | 0 | financials.debtToEquity: 2.5 < 0.5 → ✗ |
| JSWSTEEL | ❌ | 0 | financials.debtToEquity: 1.8 < 0.5 → ✗ |

### Query: "dividend yield above 3%"
> High dividend yield stocks

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.dividendYield` | 3 | gt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| COALINDIA | ✅ | 100 | financials.dividendYield: 7.5 > 3 → ✓ |
| ONGC | ✅ | 100 | financials.dividendYield: 4.2 > 3 → ✓ |
| RELIANCE | ❌ | 0 | financials.dividendYield: 0.4 > 3 → ✗ |
| TCS | ❌ | 0 | financials.dividendYield: 1.8 > 3 → ✗ |

### Query: "rsi below 40"
> Oversold RSI detection

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `technicals.rsi` | 40 | lt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| TATAMOTORS | ✅ | 100 | technicals.rsi: 28 < 40 → ✓ |
| BAJAJ | ✅ | 100 | technicals.rsi: 35 < 40 → ✓ |
| RELIANCE | ❌ | 0 | technicals.rsi: 55 < 40 → ✗ |
| TCS | ❌ | 0 | technicals.rsi: 62 < 40 → ✗ |

### Query: "margin above 20"
> Operating margin filter resolves "margin" → operating margin

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.operatingMargin` | 20 | gt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| INFY | ✅ | 100 | financials.operatingMargin: 26 > 20 → ✓ |
| TCS | ✅ | 100 | financials.operatingMargin: 28 > 20 → ✓ |
| ADANIENT | ❌ | 0 | financials.operatingMargin: 12 > 20 → ✗ |
| TATAMOTORS | ❌ | 0 | financials.operatingMargin: 10 > 20 → ✗ |

### Query: "beta under 1"
> Low-beta stocks filter

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `technicals.beta` | 1 | lt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| NESTLEIND | ✅ | 100 | technicals.beta: 0.5 < 1 → ✓ |
| HINDUNILVR | ✅ | 100 | technicals.beta: 0.7 < 1 → ✓ |
| ADANIENT | ❌ | 0 | technicals.beta: 1.5 < 1 → ✗ |
| BAJAJ | ❌ | 0 | technicals.beta: 1.2 < 1 → ✗ |

### Query: "market cap above 100000"
> Large-cap filter via market cap

**Matched:** 2/4  
**Parsed Filters:** 1

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.marketCap` | 100000 | gt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| RELIANCE | ✅ | 100 | financials.marketCap: 1800000 > 100000 → ✓ |
| TCS | ✅ | 100 | financials.marketCap: 1400000 > 100000 → ✓ |
| BAJAJ | ❌ | 0 | financials.marketCap: 60000 > 100000 → ✗ |
| TATAMOTORS | ❌ | 0 | financials.marketCap: 45000 > 100000 → ✗ |

### Query: "growth stocks with no results expected"
> Invalid query (no operator) should produce no filters → no matches

**Matched:** 0/2  
**Parsed Filters:** 0


| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| ADANIENT | ❌ | 0 | No valid filters parsed |
| TATAMOTORS | ❌ | 0 | No valid filters parsed |

### Query: "ROE above 100 and PE below 5"
> Multi-criteria query with AND logic

**Matched:** 2/3  
**Parsed Filters:** 2

| Filter | Value | Operator | Confidence |
| --- | --- | --- | --- |
| `financials.roe` | 100 | gt | 0.8 |
| `financials.roe` | 100 | gt | 0.8 |

| Symbol | Matched | Score | Details |
| --- | --- | --- | --- |
| STOCK1 | ✅ | 100 | financials.roe: 120 > 100 → ✓; financials.roe: 120 > 100 → ✓ |
| STOCK2 | ❌ | 0 | financials.roe: 15 > 100 → ✗; financials.roe: 15 > 100 → ✗ |
| STOCK3 | ✅ | 100 | financials.roe: 200 > 100 → ✓; financials.roe: 200 > 100 → ✓ |

---
*Generated by scripts/intelligence/validate-nl-scanner.ts (Phase 14)*
