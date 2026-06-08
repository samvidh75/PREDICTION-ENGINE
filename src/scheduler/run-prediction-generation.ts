/**
 * GitHub Actions runner — Phase 3: Prediction Generation
 * Invokes PredictionFactory.generateDaily() for 30/90/365d horizons.
 */
import { predictionFactory } from '../predictions/PredictionFactory';

async function main() {
  console.log('[Phase 3] Starting prediction generation...');
  const result = await predictionFactory.generateDaily([30, 90, 365]);
  console.log(`[Phase 3] Complete: ${result.created} created, ${result.skipped} skipped`);
  if (result.errors.length > 0) {
    console.error(`[Phase 3] Errors: ${result.errors.slice(0, 5).join('; ')}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('[Phase 3] Fatal:', err.message);
  process.exit(1);
});
