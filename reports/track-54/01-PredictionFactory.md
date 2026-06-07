# AGENT A — Daily Prediction Generator

## Implementation: src/predictions/PredictionFactory.ts

### Capabilities
- Runs for all symbols in factor_snapshots (last 7 days)
- Generates 30d, 90d, 365d horizon predictions
- Idempotent: checks prediction_registry before inserting
- Uses StockStory 7-engine composite scoring
- Model version tracked (SSI-V1) in created_by field
- Returns stats: total attempted, created, skipped, errors

### Output per symbol
- ranking_score (0-100 health composite)
- classification (Excellent/Healthy/Stable/Weakening/At Risk)
- confidence_score and confidence_level
- All 6 engine sub-scores (quality, growth, value, momentum, risk, sector)
- prediction_date, prediction_horizon, created_by

### Invocation
```typescript
import { predictionFactory } from './predictions/PredictionFactory';
await predictionFactory.generateDaily([30, 90, 365]);
```

### Success Criteria
- ✅ Generates predictions from existing factor/feature data
- ✅ Idempotent (no duplicates)
- ✅ Model version tracking
- ✅ Error isolation (single symbol failure doesn't block others)
