# TRACK-10D — Snapshot Schema Audit

## Table: `feature_snapshots`

**Source:** `src/db/migrations/002_create_feature_factor_tables.sql`

### Full Column Specification

```sql
CREATE TABLE IF NOT EXISTS feature_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    rsi NUMERIC(12, 4),
    macd NUMERIC(12, 4),
    macd_signal NUMERIC(12, 4),
    macd_histogram NUMERIC(12, 4),
    adx NUMERIC(12, 4),
    atr NUMERIC(12, 4),
    bollinger_width NUMERIC(12, 4),
    momentum NUMERIC(12, 4),
    volatility NUMERIC(12, 4),
    relative_strength NUMERIC(12, 4),
    moving_average_distance NUMERIC(12, 4),
    trend_strength NUMERIC(12, 4),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, trade_date)
);
```

### Column Nullability

| Column | Type | Nullable? | Default |
|--------|------|-----------|---------|
| symbol | VARCHAR(20) | **NOT NULL** | — |
| trade_date | DATE | **NOT NULL** | — |
| rsi | NUMERIC(12,4) | **YES** (nullable) | NULL |
| macd | NUMERIC(12,4) | **YES** (nullable) | NULL |
| macd_signal | NUMERIC(12,4) | **YES** (nullable) | NULL |
| macd_histogram | NUMERIC(12,4) | **YES** (nullable) | NULL |
| adx | NUMERIC(12,4) | **YES** (nullable) | NULL |
| atr | NUMERIC(12,4) | **YES** (nullable) | NULL |
| bollinger_width | NUMERIC(12,4) | **YES** (nullable) | NULL |
| momentum | NUMERIC(12,4) | **YES** (nullable) | NULL |
| volatility | NUMERIC(12,4) | **YES** (nullable) | NULL |
| relative_strength | NUMERIC(12,4) | **YES** (nullable) | NULL |
| moving_average_distance | NUMERIC(12,4) | **YES** (nullable) | NULL |
| trend_strength | NUMERIC(12,4) | **YES** (nullable) | NULL |
| created_at | TIMESTAMP | NO | NOW() |

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_feature_snapshots_date ON feature_snapshots(trade_date);
```

- **PRIMARY KEY**: `(symbol, trade_date)` — unique constraint, automatically indexed
- **idx_feature_snapshots_date**: on `trade_date` — supports date-range scans for market-wide queries
- **No index on individual technical fields** (rsi, macd, adx, etc.)

### Nullability Assessment

**ALL 12 technical indicator columns are nullable.** There is no NOT NULL constraint on any of `rsi`, `macd`, `macd_signal`, `macd_histogram`, `adx`, `atr`, `bollinger_width`, `momentum`, `volatility`, `relative_strength`, `moving_average_distance`, `trend_strength`.

This is consistent with the `FeatureEngine.ts` INSERT logic, which only writes rows when `rsi` AND `macd` are non-null:

```typescript
// FeatureEngine.ts line ~290
if (snapshot.rsi !== null && snapshot.macd !== null) {
  await query(`INSERT INTO feature_snapshots (...) VALUES (...) ON CONFLICT ...`);
}
```

This means:
1. A row may exist for a (symbol, trade_date) with some technical fields NULL (early days before 50-day SMA is calculable)
2. Some symbols may have no rows at all if they have fewer than 14 price data points
3. The application code (`intelligence.ts`) explicitly checks for nulls and falls back to `TechnicalIndicatorEngine`

### Comparison: `factor_snapshots`

For reference, `factor_snapshots` has a stricter schema:

```sql
CREATE TABLE IF NOT EXISTS factor_snapshots (
    symbol VARCHAR(20) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    quality_factor NUMERIC(6, 2),
    value_factor NUMERIC(6, 2),
    growth_factor NUMERIC(6, 2),
    momentum_factor NUMERIC(6, 2),
    risk_factor NUMERIC(6, 2),
    sector_strength_factor NUMERIC(6, 2),
    factor_score NUMERIC(6, 2) NOT NULL,    -- REQUIRED
    explanations JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (symbol, trade_date)
);
```

The `factor_score` column is **NOT NULL** — meaning factor snapshots always have a score, while feature snapshots may have all-NULL technical fields.
