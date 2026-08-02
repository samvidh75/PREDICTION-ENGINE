# Part BF — Production Render QA, Stock Detail Finalization, Mobile Polish

## Baseline Commit
`db6091d8b` — Wire frontend stock data and annual financial histogram

## Final Commit
`HEAD`

## Deployment Verification
- ✅ Vercel frontend 200
- ✅ Vercel API proxy 200
- ✅ Railway backend online
- ✅ `/api/stock/RELIANCE` returns 7 years annual financials through Vercel
- ✅ Histogram rendering on live stock detail page

## Live Stock Detail QA (RELIANCE)

### What Renders Correctly
| Field | In Metrics | In Company Facts |
|-------|-----------|-----------------|
| Price | ₹1,318.10 (+0.35%) | — |
| P/E | 22.01 | 22.0x (sidebar) |
| P/B | 1.97 | — |
| ROE | 8.78% | 8.8% (sidebar) |
| EPS | 59.69 | — |
| D/E | 0.44 | — |
| Current Ratio | 1.1 | — |
| Dividend Yield | 0.46% | 0.5% (sidebar) |
| 52W High/Low | 1,611.2 / 1,253.65 | ₹1,253.65 – ₹1,611.20 |
| Market Cap | Fixed with fMarketCap | ✅ ₹17.8L Cr |
| Industry | Oil & Gas Operations | Oil & Gas Operations |
| Health Score | (ScoreRing 61) | Fair (53) |
| Description | "Reliance Industries operates in the Indian market..." | |
| Annual Financials | Revenue/PAT/Operating Profit tabs with 7 years | |

### Annual Histogram
- ✅ Revenue tab renders with FY2020-FY2026 bars
- ✅ PAT tab renders when toggled
- ✅ Operating Profit tab renders when toggled
- ✅ No fake EBITDA shown
- ✅ Tooltip shows exact values
- ✅ Fits mobile width

## Fixes in This Phase
- Market Cap formatting in metrics section — `MetricItem.value` now accepts `string | number` to support `fMarketCap()` formatted output
- `MetricValue` component updated to handle string values without extra formatting
- `types/stockDetail.ts` updated to widen `value` type

## Candle Strategy
IndianAPI provides no OHLCV candles. The no-candle chart state is polished and acceptable. Future strategy:
- Upstox historical candles: requires instrument key mapping + server-side auth (Upstox token management exists)
- Screener.in: doesn't provide price history
- No immediate safe candle source with current credentials

## Remaining Limitations
1. No OHLCV candles from current data sources
2. Company description remains generic (IndianAPI returns empty description)
3. News section has no real news source wired
4. Sponsored content not shown (no real inventory — correct behavior)

## Verification
```
npm run typecheck:frontend  ✅
npm run typecheck:backend   ✅
npm run build:frontend      ✅
npm run build:backend       ✅
```

## No Fake Data Confirmed
## No Deceptive Ads Confirmed
## No Secrets Confirmed
## No DNS Changes Confirmed
