# Valuation Regime Calibration

**Generated:** 2026-06-28T17:48:27.173Z

**Test Symbols:** 8

## Valuation Sanity

| Symbol | Sector | Cap (₹cr) | PE | PE Valid? | PB | PB Valid? | ROE | D/E Accept? |
|--------|--------|-----------|-----|-----------|-----|-----------|-----|-------------|
| TCS | IT Services | 15,00,000 | 30 | true | 12 | ✅ | 45% | ❌ |
| ASIANPAINT | Paints | 2,80,000 | 55 | false | 18 | ❌ | 32% | ✅ |
| NESTLEIND | FMCG | 2,50,000 | 70 | true | 45 | ❌ | 65% | ❌ |
| HDFCBANK | Banking | 12,00,000 | 18 | true | 3 | ✅ | 16% | ✅ |
| RELIANCE | Oil & Gas | 20,00,000 | 22 | true | 2.5 | ✅ | 9% | ✅ |
| COALINDIA | Mining | 2,50,000 | 8 | false | 2 | ✅ | 40% | ✅ |
| SBIN | Banking | 5,50,000 | 10 | true | 1.5 | ✅ | 14% | ✅ |
| ZOMATO | Internet | 1,50,000 | N/A | N/A | 8 | ❌ | -5% | ✅ |

## Valuation Regime Map

| Regime | PE Range | Typical Sectors | Growth Assumption |
|--------|----------|-----------------|-------------------|
| Deep Value | <12 | PSU Banks, Mining, Steel | No growth priced in |
| Value | 12–20 | Banking, Oil & Gas, Power | 5–10% growth |
| Fair Value | 20–35 | IT Services, Pharma, Auto | 10–18% growth |
| Premium | 35–55 | FMCG, Paints, Consumer | 15–25% growth |
| Speculative | >55 or negative | Internet, New-age | Path to profitability |

## Observations

- **ASIANPAINT:** High PE (55) justified by high ROE (32%) — premium franchise
- **NESTLEIND:** High PE (70) justified by high ROE (65%) — premium franchise
- **COALINDIA:** Low PE (8) despite high ROE (40%) — potential value opportunity