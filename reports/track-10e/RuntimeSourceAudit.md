# TRACK-10E — Runtime Source Audit

## For RELIANCE (and any symbol): Exact Technical Field Source Determination

---

## Source Decision Logic (intelligence.ts:780-795)

```typescript
let feat = featRes.rows[0];  // ← From feature_snapshots DB query, line 747

// FALLBACK TRIGGER: any of these 5 fields are null or feat is undefined
if (!feat || feat.rsi == null || feat.macd == null || 
    feat.atr == null || feat.momentum == null || feat.volatility == null) {
  
  // PATH B: Live computation
  const coordinator = new ProviderCoordinator();
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) {
    feat = { /* mapped from liveFeat */ };
  }
}
// else: PATH A — use feat from feature_snapshots as-is
```

---

## Per-Field Source Matrix for RELIANCE

| Field | Primary Source | Fallback Source | Source Determination |
|-------|---------------|-----------------|---------------------|
| rsi | `feature_snapshots.rsi` | `TechnicalIndicatorEngine.calculate()` | DB if non-null; live calc if null |
| macd | `feature_snapshots.macd` | `TechnicalIndicatorEngine.calculate()` | DB if non-null; live calc if null |
| macdSignal | `feature_snapshots.macd_signal` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| macdHistogram | `feature_snapshots.macd_histogram` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| adx | `feature_snapshots.adx` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| atr | `feature_snapshots.atr` | `TechnicalIndicatorEngine.calculate()` | DB if non-null; live calc if null |
| bollingerWidth | `feature_snapshots.bollinger_width` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| momentum | `feature_snapshots.momentum` | `TechnicalIndicatorEngine.calculate()` | DB if non-null; live calc if null |
| volatility | `feature_snapshots.volatility` | `TechnicalIndicatorEngine.calculate()` | DB if non-null; live calc if null |
| relativeStrength | `feature_snapshots.relative_strength` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| movingAverageDistance | `feature_snapshots.moving_average_distance` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |
| trendStrength | `feature_snapshots.trend_strength` | `TechnicalIndicatorEngine.calculate()` | DB if non-null (NOT in fallback check) |

**The fallback check only gates on 5 fields: rsi, macd, atr, momentum, volatility.** The other 7 fields are used from DB if available, or may be null if the DB row exists but those specific columns are NULL.

---

## Runtime Scenarios

### Scenario 1: Database is populated (expand-market-coverage.ts has run)

```
RELIANCE rsi      → feature_snapshots (FeatureEngine, from daily_prices synthetic candles)
RELIANCE macd     → feature_snapshots (FeatureEngine, from daily_prices)
RELIANCE atr      → feature_snapshots (FeatureEngine)
RELIANCE momentum → feature_snapshots (FeatureEngine)
RELIANCE volatility → feature_snapshots (FeatureEngine)
```

All 5 guard fields are non-null → **Path A used. No live computation occurs.**

### Scenario 2: Database is empty (no population scripts executed)

```
featRes.rows[0] → undefined
!feat → true → fallback triggered

RELIANCE rsi      → TechnicalIndicatorEngine (from YahooProvider 1Y history)
RELIANCE macd     → TechnicalIndicatorEngine (from YahooProvider 1Y history)
RELIANCE atr      → TechnicalIndicatorEngine (from YahooProvider 1Y history)
RELIANCE momentum → TechnicalIndicatorEngine (from YahooProvider 1Y history)
RELIANCE volatility → TechnicalIndicatorEngine (from YahooProvider 1Y history)
```

All fields from live computation → **Path B used. External API called.**

### Scenario 3: Database has rows but some technical fields are NULL

```
Example: row exists with rsi=55, macd=2.3, atr=null, momentum=0.02, volatility=null

Fallback check: feat.atr == null → true → fallback triggered

RELIANCE rsi      → feature_snapshots (55.0) — NOT recalculated because fallback overwrites ALL fields
RELIANCE macd     → TechnicalIndicatorEngine (recalculated even though DB had value)
RELIANCE atr      → TechnicalIndicatorEngine (DB was null, now live-calculated)
RELIANCE momentum → TechnicalIndicatorEngine (recalculated even though DB had value)
RELIANCE volatility → TechnicalIndicatorEngine (DB was null, now live-calculated)
```

**CRITICAL FINDING**: When the fallback triggers, it **replaces ALL technical fields** with live-computed values — even fields that were non-null in the DB. The code creates a new `feat` object from `liveFeat` rather than selectively backfilling only null fields.

### Evidence (intelligence.ts:787-795):
```typescript
if (liveFeat) {
  feat = {                          // ← NEW object, replaces entire feat
    trade_date: liveFeat.tradeDate,
    rsi: liveFeat.rsi,
    macd: liveFeat.macd,
    macd_signal: liveFeat.macdSignal,
    macd_histogram: liveFeat.macdHistogram,
    adx: liveFeat.adx,
    atr: liveFeat.atr,
    // ... all 12 fields overwritten
  };
}
```

---

## Which System Is Used By Each Consumer?

### StockStoryEngine (runtime, via intelligence.ts)

**Uses: Which ever path satisfied the fallback check.**
- If DB has all 5 guard fields → FeatureEngine data (from feature_snapshots)
- If DB missing any guard field → TechnicalIndicatorEngine data (live, in-memory)

**Evidence:** `stockStoryEngine.evaluate(engineInputs)` at intelligence.ts:853 — engineInputs is built from `feat` which is either DB-origin or live-calculated.

### FactorEngine (offline, via expand-market-coverage.ts / run-research-validation.ts)

**Uses: FeatureEngine data only (from feature_snapshots table).**

**Evidence:** `FactorEngine.ts:54` — `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date ASC`

FactorEngine never calls TechnicalIndicatorEngine. It directly queries `feature_snapshots` from PostgreSQL.

### MarketIntelligenceEngine (runtime, via intelligence.ts)

**Uses: FeatureEngine data only (from feature_snapshots table).**

**Evidence:** `MarketIntelligenceEngine.ts:20-21`:
```sql
SELECT COUNT(*)::float as total,
       SUM(CASE WHEN moving_average_distance > 0 THEN 1 ELSE 0 END)::float as positive
FROM feature_snapshots
WHERE trade_date = (SELECT MAX(trade_date) FROM feature_snapshots)
```

MarketIntelligenceEngine never calls TechnicalIndicatorEngine.

### intelligence.ts (API routes)

**Uses: Both.**
- `GET /api/intelligence/company/:symbol` → feature_snapshots only (lines 37, 583, 657)
- `GET /api/stockstory/:symbol` → feature_snapshots primary, TechnicalIndicatorEngine fallback (lines 743-795)
- `GET /api/company/:symbol/risks` → feature_snapshots only (line 583)
- `GET /api/company/:symbol/catalysts` → feature_snapshots only (line 657)

---

## Summary

| Consumer | Primary Source | Fallback Source | TechnicalIndicatorEngine used? |
|----------|---------------|-----------------|-------------------------------|
| StockStoryEngine | feature_snapshots | TechnicalIndicatorEngine | YES (conditional) |
| FactorEngine | feature_snapshots | NONE | NO |
| MarketIntelligenceEngine | feature_snapshots | NONE | NO |
| intelligence.ts (intelligence routes) | feature_snapshots | NONE (hardcoded fallback object) | NO |
| intelligence.ts (risks route) | feature_snapshots | NONE | NO |
| intelligence.ts (catalysts route) | feature_snapshots | NONE | NO |
| intelligence.ts (stockstory route) | feature_snapshots | TechnicalIndicatorEngine | YES (conditional) |

**TechnicalIndicatorEngine is used in exactly ONE place: the `GET /api/stockstory/:symbol` fallback in intelligence.ts:780-795. It is NOT used by any other consumer.**
