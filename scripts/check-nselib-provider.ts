export {};
/**
 * check-nselib-provider.ts — Archived NSELib probe.
 *
 * NSELib has been evaluated and is not active in production.
 * It provides no usable data-fetching domains in this context.
 * See docs/data/nselib-provider.md for full evidence.
 */

interface DomainResult {
  domain: string;
  status: string;
  detail?: string;
}

interface NselibReport {
  provider: string;
  lifecycle: string;
  python_version: string;
  domains: Record<string, DomainResult>;
}

async function main(): Promise<void> {
  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch {
    pythonVersion = 'not found';
  }

  const report: NselibReport = {
    provider: 'nselib',
    lifecycle: 'archived',
    python_version: pythonVersion,
    domains: {
      import: { domain: 'import', status: 'archived_unusable', detail: 'NSELib evaluated: imports but provides no usable data-fetching API' },
      quote: { domain: 'quote', status: 'archived_unusable', detail: 'NSELib does not support live quotes' },
      historical: { domain: 'historical', status: 'archived_unusable', detail: 'NSELib historical data not available in this context' },
      bhavcopy: { domain: 'bhavcopy', status: 'archived_unusable', detail: 'nselib v1.9 lacks working capital_market bhavcopy' },
      index: { domain: 'index', status: 'archived_unusable', detail: 'nselib v1.9 lacks working indices data-fetching API' },
      financial_results: { domain: 'financial_results', status: 'archived_unusable', detail: 'nselib financial results not usable in this context' },
    },
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 0;
}

import { execSync } from 'child_process';

main().catch(err => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
