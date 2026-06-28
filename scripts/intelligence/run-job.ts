#!/usr/bin/env node
/**
 * run-job.ts — CLI entry point for the intelligence job runner.
 *
 * Usage:
 *   npx tsx scripts/intelligence/run-job.ts <job-name> [options]
 *
 * Options:
 *   --dry-run           Simulate run without side effects
 *   --limit <n>         Limit symbols processed
 *   --symbols <csv>     Comma-separated symbols to process
 *   --changed-only      Only process symbols with changed inputs
 *   --batch <n>         Batch size (default: all)
 *
 * Examples:
 *   npx tsx scripts/intelligence/run-job.ts generate-research --limit 50
 *   npx tsx scripts/intelligence/run-job.ts refresh-rankings --dry-run
 *   npx tsx scripts/intelligence/run-job.ts generate-watchlist-alerts --symbols RELIANCE,TCS
 */

import { createJobRunner } from '../../src/stockstory/jobs/JobRegistry';

function parseArgs(): { jobName: string; options: Record<string, any> } {
  const args = process.argv.slice(2);
  const jobName = args[0];

  if (!jobName || jobName.startsWith('--')) {
    console.error('Usage: run-job.ts <job-name> [options]');
    console.error('Available jobs: generate-research, refresh-rankings, generate-watchlist-alerts');
    process.exit(1);
  }

  const options: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--symbols':
        options.symbols = args[++i].split(',').map(s => s.trim()).filter(Boolean);
        break;
      case '--changed-only':
        options.changedOnly = true;
        break;
      case '--batch':
        options.batchSize = parseInt(args[++i], 10);
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return { jobName, options };
}

async function main() {
  const { jobName, options } = parseArgs();

  // Build stub adapters (replace with real DB in production)
  const runner = createJobRunner({
    research: [
      {
        analyze: async (_symbol: string) => {
          throw new Error('Orchestrator not configured for CLI mode');
        },
        inputHash: async (_symbol: string) => null,
      },
      {
        exists: async () => false,
        save: async () => {},
        getSymbols: async () => [],
      },
    ],
    rankings: [
      {
        getLatestScores: async () => [],
      },
    ],
    alerts: [
      {
        saveAlert: async () => {},
        alertExists: async () => false,
      },
    ],
  });

  console.log(`\n🚀 Running job: ${jobName}`);
  if (options.dryRun) console.log('   [DRY RUN — no side effects]');
  console.log('');

  const startTime = Date.now();
  const result = await runner.run(jobName, options);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Job completed in ${elapsed}s`);
  console.log(`   Status:        ${result.success ? 'success' : 'failure'}`);
  console.log(`   Symbols:       ${result.symbolsProcessed}`);
  console.log(`   Success:       ${result.successCount}`);
  console.log(`   Failures:      ${result.failureCount}`);
  console.log(`   Duration:      ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`   • ${err}`);
    }
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more`);
    }
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
