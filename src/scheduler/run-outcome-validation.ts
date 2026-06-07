/**
 * Runner: Outcome Validation
 * Called by GitHub Actions daily-pipeline.yml Phase 4
 */
import { outcomeValidator } from '../validation/OutcomeValidator';

async function main() {
  console.log('[OUTCOME-VAL] Starting outcome validation...');
  const results = await outcomeValidator.validateAll([30, 90, 180, 365]);
  await outcomeValidator.logRun(results);
  results.forEach(r => console.log(`  ${r.horizonDays}d: ${r.validated} validated, ${r.skipped} skipped, ${r.errors} errors`));
  const hasErrors = results.some(r => r.errors > 0);
  console.log(`[OUTCOME-VAL] Complete — ${hasErrors ? 'PARTIAL' : 'SUCCESS'}`);
  if (hasErrors) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
