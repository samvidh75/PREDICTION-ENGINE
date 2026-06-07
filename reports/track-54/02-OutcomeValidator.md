# AGENT B — Outcome Validator

## Design

### Process
1. Find predictions where (prediction_date + horizon) <= today
2. For each: fetch closing price at prediction_date and at today
3. Compute: actual_return = (price_today - price_at_prediction) / price_at_prediction
4. Compare: hit = (ranking_score > 50 and actual_return > 0) or (ranking_score < 50 and actual_return < 0)
5. Compute: alpha = actual_return - benchmark_return
6. UPDATE prediction_registry SET future_return, benchmark_return, alpha, validation_status = 'validated'

### SQL Pattern
```sql
SELECT * FROM prediction_registry
WHERE prediction_date <= (today - horizon_days)
AND validation_status = 'pending';
```

### Implementation Location
- Class: OutcomeValidator in src/predictions/OutcomeValidator.ts (to be created)
- Uses existing prediction_registry validation columns
- Requires daily_prices table for actual close prices
- Requires benchmark data (NIFTY 50) for alpha computation

### Success Criteria
- ✅ Finds matured predictions automatically
- ✅ Computes actual returns from price data
- ✅ Updates validation_status in prediction_registry
- ✅ No manual intervention needed
