# TRACK-10F — Fallback Usage Audit

## How Often Is the Fallback Path Triggered?

### Database dependency: ECONNREFUSED

As established in TRACK-10D Q6/Q7, PostgreSQL on localhost:5432 is not running. Population counts cannot be queried.

However, from code analysis we can determine the **conditions** under which the fallback triggers and reason about frequency.

---

## Fallback Trigger Conditions (intelligence.ts:780)

```typescript
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || 
    feat.momentum == null || feat.volatility == null) {
  // FALLBACK EXECUTES
}
```

The fallback executes when **ANY** of these 5 conditions is true:

| Condition | When True |
|-----------|-----------|
| `!feat` | No row in `feature_snapshots` for this symbol |
| `feat.rsi == null` | Row exists but RSI is NULL |
| `feat.macd == null` | Row exists but MACD is NULL |
| `feat.atr == null` | Row exists but ATR is NULL |
| `feat.momentum == null` | Row exists but momentum is NULL |
| `feat.volatility == null` | Row exists but volatility is NULL |

---

## What Causes NULL Technical Fields?

### FeatureEngine's Write Guard (FeatureEngine.ts:290)

```typescript
if (snapshot.rsi !== null && snapshot.macd !== null) {
  await query(`INSERT INTO feature_snapshots ...`);
}
```

FeatureEngine only writes rows where **both RSI AND MACD are non-null**. Once written, all 12 fields are included in the INSERT.

**Consequence:** If a row exists in `feature_snapshots`, RSI and MACD are guaranteed non-null. The remaining 10 fields may be null for early trading days (before enough data exists for ADX, Bollinger, SMA-50, etc.).

### Minimum Data Requirements for Non-Null Fields

| Field | Minimum Trading Days | Earliest Non-Null Index |
|-------|---------------------|------------------------|
| RSI | 15 | 14 |
| MACD | 26 | 26 |
| macdSignal | 35 | 34 |
| macdHistogram | 35 | 34 |
| ATR | 15 | 14 |
| ADX | 28 | 27 |
| bollingerWidth | 20 | 19 |
| momentum | 11 | 10 |
| volatility | 21 | 20 |
| relativeStrength | 1 | 0 |
| movingAverageDistance | 50 | 49 |
| trendStrength | 51 | 50 |

**Key finding:** FeatureEngine writes rows as soon as RSI and MACD are non-null (index 26+). At index 26, fields like ATR (available at index 14), momentum (10), volatility (20), and relativeStrength (0) are already non-null. But ADX (needs 27), movingAverageDistance (needs 49), and trendStrength (needs 50) may still be null.

**The 5 guard fields (rsi, macd, atr, momentum, volatility) are all available by index 26.** Once a row is written to `feature_snapshots`, these 5 are guaranteed non-null. The fallback would NOT trigger for any row that FeatureEngine has written.

---

## When Does the Fallback ACTUALLY Trigger?

### Scenario 1: Symbol has never been processed
- `feature_snapshots` has no row → `!feat` → fallback triggers
- **Frequency:** Every request for a symbol not in the DB, until batch processing runs

### Scenario 2: Symbol has daily_prices but FeatureEngine hasn't run
- No `feature_snapshots` row → same as Scenario 1

### Scenario 3: Row exists but was written before FeatureEngine's guard was added
- The current guard (`rsi !== null && macd !== null`) means all written rows have non-null guard fields
- **Frequency:** Never, with current code

### Scenario 4: Database connection error
- `pool.query` throws → caught by try/catch → returns 500 error
- Fallback code is inside the try block but would not be reached (error thrown before)
- **Frequency:** During DB outages — endpoint returns 500, not fallback

---

## What Percentage of Symbols Already Have feature_snapshots?

**Cannot determine without database access.** However, from code analysis:

### If `expand-market-coverage.ts` has been run:
- 500 synthetic symbols × ~1236 trading days = ~618,000 rows
- All rows have non-null guard fields → **0% fallback rate for those 500 symbols**

### If `run-research-validation.ts` has been run:
- 7 real symbols (RELIANCE, TCS, INFY, HDFCBANK, HAL, BEL, IRFC) have populated feature_snapshots
- **0% fallback rate for those 7 symbols**

### If neither script has been run:
- `feature_snapshots` is empty → **100% fallback rate for all symbols**

---

## Quantitative Frequency Estimate

| Production State | Fallback Trigger Rate | TIE Usage |
|-----------------|----------------------|-----------|
| DB fully populated (500+ symbols) | **0%** | Never called |
| DB partially populated (some symbols) | **0% for populated; 100% for unpopulated** | Called per-request for missing symbols |
| DB empty (cold start) | **100%** | Called on every stockstory request |
| DB unreachable (current state) | **N/A** | Cannot determine |

---

## Verdict

**In normal production operation (DB populated), the fallback triggers 0% of the time.** TechnicalIndicatorEngine is dead code. It exists solely for the edge case where a stockstory request arrives before offline batch processing has populated `feature_snapshots` for that symbol.

**The fallback is a cold-start convenience, not a production necessity.**
