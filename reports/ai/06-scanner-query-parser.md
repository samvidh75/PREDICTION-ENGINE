# Scanner Query Parser — Phase 7

## Service
Located: `src/stockstory/scanner/ScannerQueryParser.ts`

## Supported Presets
| Preset | Filters |
|--------|---------|
| quality compounders | Quality ≥ 70 |
| undervalued quality | Quality ≥ 60, Valuation ≥ 60 |
| improving momentum | Momentum ≥ 60 |
| low debt leaders | Stability ≥ 65 |
| earnings acceleration | Growth ≥ 60 |
| dividend stability | Stability ≥ 55 |
| turnaround watch | Quality 35-55, Momentum ≥ 55 |
| risk rising | Risk ≥ 60 |
| good businesses out of favour | Quality ≥ 65, Valuation ≥ 60, Momentum < 45 |

## Supported Filter Phrases
| Phrase | Filter |
|--------|--------|
| low debt / low leverage | Stability ≥ 60 |
| high ROE | Quality ≥ 60 |
| high ROIC | Quality ≥ 60 |
| high ROA | Quality ≥ 55 |
| cheap / undervalued / low PE / low PB | Valuation ≥ 60 |
| high growth / fast growth | Growth ≥ 60 |
| improving margins | Quality ≥ 50 |
| high dividend / good yield | Valuation ≥ 50 |
| strong momentum / bullish | Momentum ≥ 60 |
| low volatility / stable / low risk | Stability ≥ 60 |
| large cap | MarketCap ≥ 20000 |
| mid cap | MarketCap 5000-20000 |
| small cap | MarketCap < 5000 |
| sector names (banking, tech, fmcg, etc.) | Sector filter |

## Unsupported Behavior
- Fuzzy semantic queries (e.g., "companies like Asian Paints in 2010") → gracefully rejected with guidance
- Unrecognized terms → silently ignored with product-facing guidance text
- No hallucinated filters
- No backend wording exposed

## Frontend Behavior
- Supported queries match presets or combine filters
- Unsupported queries show guidance text with available preset names
- Sort by momentum/value/growth/quality based on query content
- Confidence score (0-1) indicates how well the query was understood

## Tests
Located: `src/stockstory/scanner/__tests__/ScannerQueryParser.test.ts` — 16 tests

Coverage:
- All 9 presets matched exactly
- "low debt midcaps with improving margins" parsed correctly
- "undervalued quality banks" parsed correctly
- "high dividend stable companies" parsed correctly
- "overheated stocks to avoid" parsed correctly
- "companies like Asian Paints in 2010" gives unsupported guidance
- Unrecognized queries return low confidence
- Empty string handled gracefully
- Sort order determined from query content
- No backend wording in any output
