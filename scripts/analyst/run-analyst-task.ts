#!/usr/bin/env node
/**
 * run-analyst-task.ts — CLI for running analyst tasks.
 */

import { AnalystTaskRunner } from '../../src/stockstory/analyst/tasks/AnalystTaskRunner';
import { InMemoryAnalystTaskStore } from '../../src/stockstory/analyst/tasks/AnalystTaskStore';
import { analystDeskService } from '../../src/stockstory/analyst/AnalystDeskService';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run'),
    symbol: get('--symbol'),
    sector: get('--sector'),
    taskType: get('--task-type') ?? 'company_deep_dive',
    limit: Number(get('--limit') ?? '10'),
    since: get('--since'),
    changedOnly: args.includes('--changed-only'),
  };
}

async function main() {
  const opts = parseArgs();

  if (opts.dryRun) {
    console.log('[dry-run] Would run analyst task:', opts);
    process.exit(0);
  }

  const store = new InMemoryAnalystTaskStore();
  const runner = new AnalystTaskRunner(store);

  runner.registerHandler('company_deep_dive', async (task) => {
    const sym = task.symbol!;
    const result = await analystDeskService.getDeepDive(sym);
    return { status: 'completed', outputId: sym, output: result.publicOutput };
  });

  const task = await runner.createAndRun({
    taskType: opts.taskType,
    symbol: opts.symbol,
    sector: opts.sector,
    input: { limit: opts.limit, since: opts.since, changedOnly: opts.changedOnly },
  });

  console.log(JSON.stringify({ id: task.id, status: task.status, outputId: task.outputId }, null, 2));
  process.exit(task.status === 'failed_safely' ? 1 : 0);
}

main().catch((err) => {
  console.error('Task failed safely:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
