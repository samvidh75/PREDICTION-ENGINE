#!/usr/bin/env node
/**
 * generate-filing-briefs.ts
 */

import { filingToThesisEngine } from '../../src/stockstory/analyst/filings/FilingToThesisEngine';

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

const SYMBOLS = ['HBL', 'ENGRO', 'SYS', 'UBL', 'NESTLE', 'LUCK', 'FFC', 'POL', 'OGDC', 'HUBC'];

async function main() {
  const opts = parseArgs();
  const symbols = opts.symbol ? [opts.symbol.toUpperCase()] : SYMBOLS.slice(0, opts.limit);

  if (opts.dryRun) {
    console.log('[dry-run] Would generate filing briefs for:', symbols.join(', '));
    process.exit(0);
  }

  for (const sym of symbols) {
    const result = filingToThesisEngine.process({
      symbol: sym,
      filingType: 'corp_announcement',
      subject: null,
      summary: null,
    });
    console.log(`${sym}: ${result.brief.headline} (${result.brief.materiality})`);
  }
  process.exit(0);
}

main().catch(() => process.exit(1));
