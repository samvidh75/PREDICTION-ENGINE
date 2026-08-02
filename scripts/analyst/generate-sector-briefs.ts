#!/usr/bin/env node
/**
 * generate-sector-briefs.ts
 */

import { sectorBriefGenerator } from '../../src/stockstory/analyst/sector/SectorBriefGenerator';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run'),
    sector: get('--sector'),
    limit: Number(get('--limit') ?? '5'),
    since: get('--since'),
    changedOnly: args.includes('--changed-only'),
  };
}

const SECTORS = ['Technology', 'Banking', 'Pharma', 'Auto', 'FMCG'];

async function main() {
  const opts = parseArgs();
  const sectors = opts.sector ? [opts.sector] : SECTORS.slice(0, opts.limit);

  if (opts.dryRun) {
    console.log('[dry-run] Would generate sector briefs for:', sectors.join(', '));
    process.exit(0);
  }

  for (const sector of sectors) {
    const brief = sectorBriefGenerator.generate(sector, []);
    console.log(`${sector}: ${brief.confidence}`);
  }
  process.exit(0);
}

main().catch(() => process.exit(1));
