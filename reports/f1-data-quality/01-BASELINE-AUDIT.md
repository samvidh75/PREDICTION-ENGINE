# F1 Baseline Audit

Branch: `codex/f1-data-quality-and-score-differentiation`
Database: `data/stockstory.db`
Audit date: 2026-06-12

## Queries Used

Latest two snapshots for the ten required symbols:

```sql
WITH ranked AS (
  SELECT symbol,prediction_date,prediction_horizon,quality_score,growth_score,value_score,
         momentum_score,risk_score,sector_score,ranking_score,confidence_score,classification,
         ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY prediction_date DESC, prediction_horizon ASC) rn
  FROM prediction_registry
  WHERE symbol IN ('RELIANCE','HDFCBANK','INFY','ICICIBANK','TCS','SBIN','BHARTIARTL','ITC','LT','TATASTEEL')
)
SELECT * FROM ranked WHERE rn <= 2 ORDER BY symbol,rn;
```

Invalid OHLC rows:

```sql
SELECT symbol, trade_date, open, high, low, close, volume
FROM daily_prices
WHERE open=0 OR high=0 OR low=0 OR close=0 OR volume=0 OR volume IS NULL
ORDER BY trade_date DESC, symbol
LIMIT 50;
```

Invalid price counts by symbol:

```sql
SELECT symbol, COUNT(*) rows, MIN(trade_date) min_date, MAX(trade_date) max_date
FROM daily_prices
WHERE open<=0 OR high<=0 OR low<=0 OR close<=0
   OR high<low OR open<low OR open>high OR close<low OR close>high
   OR volume<0 OR volume IS NULL
GROUP BY symbol
ORDER BY rows DESC
LIMIT 50;
```

Sentinel/domain violations:

```sql
SELECT symbol,prediction_date,prediction_horizon,growth_score,quality_score,value_score,
       momentum_score,risk_score,sector_score,ranking_score,confidence_score
FROM prediction_registry
WHERE growth_score <= -100
   OR quality_score NOT BETWEEN 0 AND 100
   OR growth_score NOT BETWEEN 0 AND 100
   OR value_score NOT BETWEEN 0 AND 100
   OR momentum_score NOT BETWEEN 0 AND 100
   OR risk_score NOT BETWEEN 0 AND 100
   OR sector_score NOT BETWEEN 0 AND 100
   OR ranking_score NOT BETWEEN 0 AND 100
   OR confidence_score NOT BETWEEN 0 AND 100
ORDER BY prediction_date DESC
LIMIT 50;
```

Fallback constants:

```sql
SELECT 'quality_score' factor, SUM(CASE WHEN quality_score=50 THEN 1 ELSE 0 END) constant_50,
       SUM(CASE WHEN quality_score=0 THEN 1 ELSE 0 END) constant_0, COUNT(*) total FROM prediction_registry
UNION ALL SELECT 'growth_score', SUM(CASE WHEN growth_score=50 THEN 1 ELSE 0 END), SUM(CASE WHEN growth_score=0 THEN 1 ELSE 0 END), COUNT(*) FROM prediction_registry
UNION ALL SELECT 'value_score', SUM(CASE WHEN value_score=50 THEN 1 ELSE 0 END), SUM(CASE WHEN value_score=0 THEN 1 ELSE 0 END), COUNT(*) FROM prediction_registry
UNION ALL SELECT 'momentum_score', SUM(CASE WHEN momentum_score=50 THEN 1 ELSE 0 END), SUM(CASE WHEN momentum_score=0 THEN 1 ELSE 0 END), COUNT(*) FROM prediction_registry
UNION ALL SELECT 'risk_score', SUM(CASE WHEN risk_score=50 THEN 1 ELSE 0 END), SUM(CASE WHEN risk_score=0 THEN 1 ELSE 0 END), COUNT(*) FROM prediction_registry
UNION ALL SELECT 'sector_score', SUM(CASE WHEN sector_score=50 THEN 1 ELSE 0 END), SUM(CASE WHEN sector_score=0 THEN 1 ELSE 0 END), COUNT(*) FROM prediction_registry;
```

Financial snapshot sparsity:

```sql
SELECT COUNT(*) total_rows, COUNT(DISTINCT symbol) symbols, MIN(period_end) min_period, MAX(period_end) max_period,
       SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) pe_present,
       SUM(CASE WHEN eps IS NOT NULL THEN 1 ELSE 0 END) eps_present,
       SUM(CASE WHEN roe IS NOT NULL THEN 1 ELSE 0 END) roe_present,
       SUM(CASE WHEN debt_to_equity IS NOT NULL THEN 1 ELSE 0 END) debt_present,
       SUM(CASE WHEN revenue_growth IS NOT NULL THEN 1 ELSE 0 END) revenue_growth_present
FROM financial_snapshots;
```

## Findings

All ten required symbols receive identical latest vectors. The latest two rows per symbol are the 30-day and 90-day rows for `2026-06-08`, and every symbol has:

```text
quality_score=51, growth_score=0, value_score=50, momentum_score=50,
risk_score=38, sector_score=50, ranking_score=12,
confidence_score=30, classification='At Risk'
```

This is synthetic/template behavior, not real stock-specific analysis.

Weekend zero OHLC rows exist. Example rows on `2026-06-07` include `ABB`, `ADANIGREEN`, `ADANIPORTS`, `BHARTIARTL`, and many others with `open=0`, `high=0`, `low=0`, `close=0`, `volume=0`. These rows are invalid market records and must be quarantined or removed before scoring.

Sentinel values exist. Example rows on `2026-06-07` show `growth_score=-250` and negative `ranking_score` values such as `-20.96`. These are invalid analytical values and should be treated as unavailable, not real scores.

Fallback constants are widespread across `107484` prediction rows:

```text
quality_score: 870 rows equal 0
growth_score: 33 rows equal 50, 696 rows equal 0
value_score: 597 rows equal 50
momentum_score: 522 rows equal 50
sector_score: 107484 rows equal 50
```

`financial_snapshots` is sparse: 60 rows for 30 symbols, period range `2026-06-05` to `2026-06-06`. None of the ten required symbols have rows in `financial_snapshots`. `revenue_growth` is absent for all 60 rows.

## Classification Of Values

The ten-symbol latest scores are synthetic/template values. They are not traceable to current stock-specific fundamentals because the ten symbols have no financial snapshot rows.

The `2026-06-07` OHLC rows are invalid. They are weekend/non-trading placeholders with zero prices and zero volume.

`growth_score=-250` is a sentinel, not a real analytical score.

`sector_score=50` across every prediction row is a fallback/template constant.

Sparse fundamentals cause neutral defaults and partial fabricated vectors in the current pipeline.

