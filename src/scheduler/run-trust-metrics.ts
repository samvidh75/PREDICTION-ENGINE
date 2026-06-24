/**
 * GitHub Actions runner — Phase 5: Trust Metrics Refresh
 */
import { outcomeRepository } from '../data/OutcomeRepository';
import fs from 'fs';
import path from 'path';

async function main() {
  console.info('[Phase 5] Computing trust metrics...');
  const summaries = await outcomeRepository.getAllSummaries();
  const totalValidated = await outcomeRepository.countValidated();
  const metrics: any = { generatedAt: new Date().toISOString(), totalValidatedPredictions: totalValidated, horizons: {} };
  for (const s of summaries) {
    metrics.horizons[`${s.horizonDays}d`] = {
      total: s.totalPredictions, validated: s.validatedCount,
      hitRate: s.hitRate, meanAlpha: s.meanAlpha, sharpeRatio: s.sharpeRatio,
      ci95: s.ci95Low !== null ? [s.ci95Low, s.ci95High] : null,
    };
  }
  const trustDir = path.join(process.cwd(), 'public', 'trust');
  if (!fs.existsSync(trustDir)) fs.mkdirSync(trustDir, { recursive: true });
  fs.writeFileSync(path.join(trustDir, 'live-metrics.json'), JSON.stringify(metrics, null, 2), 'utf-8');
  console.info(`[Phase 5] Complete: ${totalValidated} validated predictions`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Phase 5] Fatal:', err.message);
  process.exit(1);
});
