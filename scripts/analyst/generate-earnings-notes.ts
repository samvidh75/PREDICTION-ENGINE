#!/usr/bin/env node
/**
 * generate-earnings-notes.ts
 */

import { earningsNoteGenerator } from '../../src/stockstory/analyst/earnings/EarningsNoteGenerator';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run'),
    symbol: get('--symbol'),
    limit: Number(get('--limit') ?? '10'),
    since: get('--since'),
    changedOnly: args.includes('--changed-only'),
  };
}

const SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ITC', 'WIPRO', 'LT', 'AXISBANK', 'SBIN', 'MARUTI'];

async function main() {
  const opts = parseArgs();
  const symbols = opts.symbol ? [opts.symbol.toUpperCase()] : SYMBOLS.slice(0, opts.limit);

  if (opts.dryRun) {
    console.log('[dry-run] Would generate earnings notes for:', symbols.join(', '));
    process.exit(0);
  }

  for (const sym of symbols) {
    const note = earningsNoteGenerator.generate(sym, {});
    console.log(`${sym}: ${note.headline} (${note.confidence})`);
  }
  process.exit(0);
}

main().catch(() => process.exit(1));
