# TRACK-34 AGENT-3: Historical Price Backfill
**Generated:** 2026-06-06T18:39:26.581Z

## Target
Populate `daily_prices` with historical OHLCV data for all symbols.

## Source Availability

| Source | Coverage | Status |
|--------|----------|--------|
| YahooProvider.getHistory(symbol, "2Y") | ~2 years daily | API KEY MISSING |
| YahooProvider.getHistory(symbol, "5Y") | ~5 years daily | API KEY MISSING |

## Pipeline Logic

`populate-real-universe.ts` already implements:
- Fetches 2-year daily candles via Yahoo
- Detects duplicate rows via `ON CONFLICT (symbol, trade_date) DO NOTHING`
- Chunks inserts in batches of 100 for performance
- Validates: open, high, low, close, adjusted_close, volume

## Backfill Coverage Target

| Period | Expected Rows (500 symbols) | Status |
|--------|-----------------------------|--------|
| 2021-2022 | ~125,000 | NOT POPULATED |
| 2022-2023 | ~125,000 | NOT POPULATED |
| 2023-2024 | ~125,000 | NOT POPULATED |
| 2024-2026 | ~125,000 | NOT POPULATED |
| **Total** | **~500,000** | **0 actual** |

## Verdict

**INSUFFICIENT EVIDENCE** — Historical price backfill requires a running database + Yahoo API key. The backfill pipeline is coded in `populate-real-universe.ts` but cannot execute.

## Required Actions
1. Configure `YAHOO_API_KEY` in `.env`
2. Start PostgreSQL
3. Run `npx tsx src/scripts/populate-real-universe.ts`
