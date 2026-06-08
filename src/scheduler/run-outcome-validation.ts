/**
 * GitHub Actions runner — Phase 4: Outcome Validation
 */
import { outcomeValidator } from '../validation/OutcomeValidator';

async function main() {
  console.log('[Phase 4] Starting outcome validation...');
  const results = await outcomeValidator.validateAll([30, 90, 180, 365]);
  await outcomeValidator.logRun(results);
  const totalValidated = results.reduce((sum, r) => sum + r.validated, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  console.log(`[Phase 4] Complete: ${totalValidated} validated, ${totalErrors} errors`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[Phase 4] Fatal:', err.message);
  process.exit(1);
});
