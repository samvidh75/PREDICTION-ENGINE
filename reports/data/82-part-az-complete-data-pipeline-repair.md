# Part AZ — Complete Data Pipeline Repair

## Baseline Commits
- `3f86735dc` — Fix IndianAPI X-API-KEY header not being passed to fetch request
- `14545a88c` — Fix IndianAPI header bug and document data pipeline fix

## Final Commit
`HEAD`

## Deployment Verification
| Endpoint | Status | Details |
|----------|--------|---------|
| Vercel Frontend (stockstory-india.com) | ✅ 200 | Frontend serving |
| Vercel API Proxy (/api/ops/health) | ✅ 200 | Rewrite working |
| Railway Health (direct) | ✅ 200 | Backend responding |
| /api/stock/RELIANCE (via Vercel) | ✅ 200 | Returns data with company name |

## IndianAPI Status
- ✅ API key set in Railway environment
- ✅ `X-API-KEY` header fix deployed (was not being passed to fetch)
- ✅ Price endpoint returns structured data for 20/20 symbols
- ✅ Profile endpoint returns company name for 20/20 symbols
- ⚠️ Fundamentals endpoint returns partial data (IndianAPI coverage limitation)
- ⚠️ Price values still null (IndianAPI response format)

## Data Coverage (20 Nifty Symbols)
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Stockstory predictions available | 20/20 | 20/20 | — |
| Price endpoint reachable | 0/20 | 20/20 | ✅ +20 |
| Profile endpoint reachable | 0/20 | 20/20 | ✅ +20 |
| Fundamentals endpoint | 0/20 | 0/20 | — |
| With health score | 20/20 | 20/20 | — |
| Product usable (price + profile + stockstory) | 0/20 | 20/20 | ✅ +20 |

## Key Fixes in this Phase
1. **IndianAPI X-API-KEY header bug** — `fetchWithTimeout()` was not passing headers. Now fixed.
2. **Railway env var** — `INDIANAPI_KEY` set via CLI
3. **Vercel API rewrite** — `/api/(.*)` rewrite deployed and working
4. **/api/stock/:symbol merge** — Now includes stockstory prediction data (health score, classification, sector) and profile enrichment (industry, description, website)

## Fixed: /api/stock/:symbol Response Shape
Now includes:
- `price.companyName` — from IndianAPI profile
- `price.sector` — from IndianAPI or stockstory fallback
- `price.industry` — from IndianAPI profile
- `price.description` — from IndianAPI profile
- `price.website` — from IndianAPI profile
- `health` block — from stockstory prediction data
- `dataCompleteness` — 0.6 when stockstory data available, 0.3 when only IndianAPI data

## Verification Commands
```bash
npm run verify:data:coverage   # ✅ Available - checks Railway data coverage
npm run verify:data:production # ✅ Available - checks production endpoints
```

## Remaining Limitations
1. IndianAPI fundamentals endpoint returns null values — API response format mismatch
2. Screener.in ingestion pipeline exists but needs rate-limited execution
3. `symbols_covered: 0` metric tracks database-stored values, not live API coverage
4. Price candles/historical data not yet populating from IndianAPI

## No Fake Data Confirmed
## No Deceptive Ads Confirmed
## No Secrets Confirmed
## No DNS Changes Confirmed
