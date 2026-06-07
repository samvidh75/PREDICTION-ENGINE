# Universe Rebuild Estimate — TRACK-13A.2

**Date:** 2026-06-06

## If Database Is Completely Lost

### Phase 1: Symbols (Instant)
- Insert 505+ symbols from MasterCompanyRegistry + generate500Stocks()
- No API calls needed — data is hardcoded in TypeScript source
- **Duration:** < 5 minutes (insert script)
- **Cost:** $0

### Phase 2: Financial Snapshots (Heavy)
- **500 symbols × 3 providers** (Upstox + Screener + Yahoo) = 1,500 API calls
- **UpstoxFundamentalsProvider:**
  - 2 requests per symbol (key-ratios + balance-sheet)
  - Rate limit: Upstox free tier ~20 requests/minute → 50 minutes for 500 symbols
  - Requires valid Upstox access token (present in .env)
- **ScreenerProvider:**
  - 1 HTML scrape per symbol
  - No official API rate limit documented, but screener.in likely throttles rapid scraping
  - Conservative estimate: 5 seconds/symbol → 42 minutes for 500 symbols
- **YahooProvider:**
  - 1 request per symbol for financials
  - Rate limited by Yahoo Finance undocumented limits (~2000/hr)
  - ~15-30 minutes for 500 symbols
- **Total Phase 2:** ~2 hours (parallelizable but constrained by rate limits)
- **Cost:** $0 (free tier APIs)

### Phase 3: Daily Prices + Technical Features (Heaviest)
- **500 symbols × Yahoo history** (2Y range = ~250 rows per symbol)
- Yahoo free tier: ~2000 requests/hour → 15 minutes for 500 symbols (single-threaded)
- **TechnicalIndicatorEngine:** Compute RSI, MACD, ADX, ATR per symbol (in-memory, fast)
- **Duration:** ~30 minutes overall

### Phase 4: Factor Snapshots (Compute)
- FactorEngine processes financial_snapshots + feature_snapshots per symbol
- In-memory computation, fast once inputs exist
- **Duration:** ~10 seconds for 500 symbols

## Total Rebuild Estimate

| Phase | Provider Calls | Duration | Cost |
| --- | --- | --- | --- |
| 1. Symbols | 0 | < 5 min | $0 |
| 2. Financials | ~1,500 | ~2 hrs | $0 |
| 3. Prices + Features | ~500 | ~30 min | $0 |
| 4. Factor Scores | 0 | < 10 sec | $0 |
| **Total** | **~2,000 API calls** | **~3 hours** | **$0** |

## Rate-Limit Risks

| Provider | Risk | Mitigation |
| --- | --- | --- |
| Upstox | 20 req/min free tier | Throttle to 15 req/min with delays → extends Phase 2 to ~80 min |
| Screener.in | Undocumented, likely IP-based | Add 1-2s delay between requests → extends to ~15 min for 500 |
| Yahoo Finance | ~2000/hr | Well within limit for 500 financial + 500 history requests |

## Risk: Provider Data Quality

- Upstox returns structured data for NSE-listed stocks — reliable for top 500 universe
- Screener.in scraping is fragile — page structure changes break the parser
- Yahoo provides fallback financials but with lower quality (estimated values)
- FactorEngine will compute factor_scores with whatever data is available — missing fields default to neutral (50)
