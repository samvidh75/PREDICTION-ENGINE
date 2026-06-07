# Recovery: Provider Failure

## Yahoo
1. Verify key: check YAHOO_API_KEY in .env
2. Test: `npx tsx -e "import {YahooProvider} from './src/services/providers/YahooProvider'; ..."`
3. Rate limit: 2000 calls/hr — wait 1 hr if exceeded
4. Fallback: price history fails → features/returns unavailable

## Screener
1. No API key needed
2. If failing: Screener may block scraping — add delay
3. Fallback: growth/margin data unavailable → falls through to Finnhub

## Finnhub
1. Verify: FINNHUB_API_KEY in .env
2. Free tier: 60 calls/min
3. Fallback: financials missing → Yahoo fills gaps

## Upstox
1. Token refresh: token expires every 24h, must re-authenticate
2. Verify: UPSTOX_ACCESS_TOKEN in .env
3. Test auth: UpstoxHealthEngine.check()
4. Fallback: primary ratios missing → Screener can only enrich, not replace