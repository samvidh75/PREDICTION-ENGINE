/**
 * Runner: Prediction Generation
 * Called by GitHub Actions daily-pipeline.yml Phase 3
 */
import { predictionFactory } from '../predictions/PredictionFactory';

async function main() {
  console.log('[PREDICTION-GEN] Starting prediction generation...');
  const result = await predictionFactory.generateDaily([30, 90, 365]);
  console.log(`  Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors.slice(0, 5).join('; '));
    process.exit(1);
  }
  console.log('[PREDICTION-GEN] Complete');
}

main().catch(err => { console.error(err); process.exit(1); });
