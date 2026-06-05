# TRACK-10D — Population Audit

## Database Reachability

**Status: UNREACHABLE**

**Connection details:**
- DATABASE_URL (from `.env`): `postgresql://postgres:postgres@localhost:5432/stockstory`
- Connection test: `node` script using `pg` Pool with 3000ms timeout
- **Error code**: `ECONNREFUSED`
- **Error message**: Connection refused — PostgreSQL is not running on `localhost:5432`

---

## Queries That Could Not Be Executed

### Q6: RELIANCE Latest Row

```sql
SELECT *
FROM feature_snapshots
WHERE symbol='RELIANCE'
ORDER BY created_at DESC
LIMIT 1;
```

**Result**: Not executed — database unreachable.

### Q7: Population Counts

```sql
SELECT
  COUNT(*) as total_rows,
  COUNT(rsi) as rsi_count,
  COUNT(macd) as macd_count,
  COUNT(adx) as adx_count,
  COUNT(atr) as atr_count,
  COUNT(momentum) as momentum_count,
  COUNT(volatility) as volatility_count,
  COUNT(trend_strength) as trend_strength_count
FROM feature_snapshots;
```

**Result**: Not executed — database unreachable.

### NULL Percentage Query

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN rsi IS NULL AND macd IS NULL AND adx IS NULL AND atr IS NULL AND momentum IS NULL AND volatility IS NULL THEN 1 ELSE 0 END) as all_technical_null,
  SUM(CASE WHEN rsi IS NOT NULL AND macd IS NOT NULL AND adx IS NOT NULL AND atr IS NOT NULL AND momentum IS NOT NULL AND volatility IS NOT NULL THEN 1 ELSE 0 END) as all_technical_populated
FROM feature_snapshots;
```

**Result**: Not executed — database unreachable.

---

## What We Know From Code Analysis

Based on HEAD code, the population state depends entirely on offline script execution:

### Script: `src/scripts/expand-market-coverage.ts`

This is the **primary population script**. It:
1. **Truncates** `feature_snapshots` (along with symbols, daily_prices, financial_snapshots, factor_snapshots)
2. Generates **500 synthetic Indian stocks** via `generate500Stocks()`
3. Generates **5 years of synthetic daily candles** (~1250 trading days per stock)
4. Runs `featureEngine.calculateAndStoreFeatures()` for all 500 stocks
5. Runs `factorEngine.calculateAndStoreFactors()` for all 500 stocks

**Evidence line 14**: `await pool.query("TRUNCATE TABLE symbols, daily_prices, financial_snapshots, feature_snapshots, factor_snapshots CASCADE");`

**If this script has been run**, technical fields should be populated for all 500 synthetic stocks for ~1236 trading days each (total ~618,000 rows).

### Script: `src/scripts/run-research-validation.ts`

This is the **research pipeline** for 7 real symbols (RELIANCE, TCS, INFY, HDFCBANK, HAL, BEL, IRFC). It:
1. Fetches real price history from YahooProvider via `ProviderCoordinator.getHistory(sym, "5Y")`
2. Stores prices in `daily_prices`
3. Runs `featureEngine.calculateAndStoreFeatures(sym)`
4. Runs `factorEngine.calculateAndStoreFactors(sym)`

**If this script has been run**, technical fields should be populated for 7 real symbols with real historical data.

---

## Truth Assessment

Since we cannot query the database, we cannot report actual population counts or RELIANCE field values.

**However**, from code analysis we can state:

1. **The schema supports populated technical fields** — all columns exist, the INSERT statement writes all 12 fields
2. **The FeatureEngine produces real calculated values** — from daily price data using standard indicator math
3. **Whether fields are populated depends on whether the population scripts have been executed against a running PostgreSQL instance**
4. **The API has a fallback**: If `feature_snapshots` returns NULL technical fields, `intelligence.ts` computes them live via `TechnicalIndicatorEngine`

---

## Recommendation

To complete this audit with runtime evidence:
1. Start PostgreSQL on localhost:5432
2. Run `expand-market-coverage.ts` to populate synthetic data
3. Re-run the population queries above
