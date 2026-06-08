# AGENT F — Temporal Integrity Verification

## Call Chain Trace

### Expected: Data Provider → Factor Snapshot → PredictionFactory → Prediction Registry
### Guard points: TemporalGuard should gate at Factor Snapshot and PredictionFactory stages.

## TemporalGuard Import & Usage

| File | Imports TemporalGuard | Calls guardFactorInsert | Calls guardQualityAgainstPrediction |
|------|----------------------|------------------------|-----------------------------------|
| PredictionFactory.ts | ✅ YES | ✅ YES | ❌ NO |
| DailyPredictionCapture.ts | ❌ NO | ❌ NO | ❌ NO |

### PredictionFactory.evaluateSymbol() Temporal Flow

```
1. Query factor_snapshots → get fact.trade_date
2. TemporalGuard.guardFactorInsert(factor, tradeDate)    ← ✅ ACTIVE
3. If !result.allowed → return null (BLOCK prediction)
4. Otherwise → evaluate via stockStoryEngine
5. INSERT INTO prediction_registry
```

### Gap: QualityGuard Against Prediction
- `TemporalGuard.guardQualityAgainstPrediction()` is defined but not called anywhere in PredictionFactory or DailyPredictionCapture.
- **Potential look-ahead leakage**: If quality_registry.data_date > prediction_registry.prediction_date, predictions may use future quality data.

## Verdict
**PARTIAL BLOCKER:**
- ✅ `guardFactorInsert` is called in PredictionFactory — factor snapshots are temporally gated
- ❌ `guardQualityAgainstPrediction` is NOT called — quality registry temporal leakage possible
- ❌ DailyPredictionCapture does not use TemporalGuard at all — snapshots bypass temporal checks
- Recommendation: Add TemporalGuard.guardQualityAgainstPrediction() call in PredictionFactory.evaluateSymbol() before running engine evaluation
