# AGENT C — Daily Scheduler Implementation

## Pipeline Architecture

### dailyPipeline.ts (to be deployed as cron job)
```typescript
import { predictionFactory } from './predictions/PredictionFactory';
import { outcomeValidator } from './validation/OutcomeValidator';

export async function dailyPipeline() {
  console.log('[PIPELINE] Phase 1: Data Refresh');
  // Data population: run yfinance/Screener scripts

  console.log('[PIPELINE] Phase 2: Factor Recompute');
  // Factor snapshots recomputed from new price data (existing FactorEngine)

  console.log('[PIPELINE] Phase 3: Prediction Generation');
  const genResult = await predictionFactory.generateDaily([30, 90, 365]);
  console.log(`  Created: ${genResult.created}, Skipped: ${genResult.skipped}, Errors: ${genResult.errors.length}`);

  console.log('[PIPELINE] Phase 4: Outcome Validation');
  const valResult = await outcomeValidator.validateAll([30, 90, 180, 365]);
  await outcomeValidator.logRun(valResult);
  valResult.forEach(r => console.log(`  ${r.horizonDays}d: ${r.validated} validated, ${r.skipped} skipped`));

  console.log('[PIPELINE] Phase 5: Trust Metrics Refresh');
  // Trust Centre reads live from prediction_registry — auto-updated

  console.log('[PIPELINE] Phase 6: Daily Feed Generation');
  // Feed events computed from today's predictions + factor changes

  console.log('[PIPELINE] Complete');
}
```

### Deployment Options
- **Node-cron**: `cron.schedule('0 8 * * *', dailyPipeline)`
- **OS cron**: `0 8 * * * /usr/bin/node /app/scripts/dailyPipeline.mjs`
- **Serverless**: Cloud Scheduler → Cloud Run / Lambda

### Idempotency
- PredictionFactory checks for existing predictions → skip duplicates
- OutcomeValidator checks validation_status = 'pending' → skip validated
- Safe to re-run at any time
