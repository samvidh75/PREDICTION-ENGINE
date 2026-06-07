# Recovery: Stale Data

## Detect
1. Run `SnapshotFreshnessMonitor.check()`
2. Check dates: `SELECT MAX(trade_date) FROM daily_prices;`
3. If > 2 days old: stale

## Recovery
1. Re-run `npx tsx src/scripts/populate-real-universe.ts`
2. Force re-fetch: delete stale rows: `DELETE FROM daily_prices WHERE trade_date < NOW() - INTERVAL '7 days';`
3. Corporate action check: look for >50% price moves → possible split

## Split detection
`SELECT symbol, trade_date, close, LAG(close) OVER (PARTITION BY symbol ORDER BY trade_date) prev_close FROM daily_prices`
Look for: `close > prev_close * 1.5 OR close < prev_close * 0.5`