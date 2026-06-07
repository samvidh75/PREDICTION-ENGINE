# AGENT A — OutcomeValidator Implementation

## File: src/validation/OutcomeValidator.ts

### Capabilities
- Validates matured predictions at 30d/90d/180d/365d horizons
- Computes: actual_return = (current_price - prediction_price) / prediction_price
- Computes alpha vs NIFTY 50 benchmark
- Updates prediction_registry: future_return, benchmark_return, alpha, validation_status = 'validated'
- Idempotent: only updates predictions where validation_status = 'pending'
- Restart-safe: if killed mid-run, re-running picks up remaining pending predictions
- Logs results to pipeline_health table

### Usage
```typescript
import { outcomeValidator } from './validation/OutcomeValidator';
const results = await outcomeValidator.validateAll([30, 90, 180, 365]);
await outcomeValidator.logRun(results);
// results: [{ horizonDays, totalMatured, validated, skipped, errors }]
```

### Integration with PredictionFactory
```typescript
// Daily pipeline
await predictionFactory.generateDaily([30, 90, 365]);
await outcomeValidator.validateAll([30, 90, 180, 365]);
```
