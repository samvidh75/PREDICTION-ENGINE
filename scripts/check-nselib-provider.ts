export {};
/**
 * check-nselib-provider.ts — Domain-grade nselib probe.
 *
 * Calls probe-nselib-provider.py and classifies each domain independently.
 * nselib requires Python 3.10+ (PEP 604 union syntax with `|`).
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DomainResult {
  domain: string;
  status: string;
  elapsed?: number;
  rows?: number;
  latest_date?: string;
  sample?: unknown;
  detail?: string;
}

interface NselibReport {
  probe: string;
  python_version: string;
  healthy_domains: number;
  total_domains: number;
  blocked_domains: number;
  domains: Record<string, DomainResult>;
}

async function main(): Promise<void> {
  console.log('=== NSELib Domain-Grade Probe ===\n');

  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch {
    pythonVersion = 'not found';
  }
  console.log(`Python: ${pythonVersion}\n`);

  const probePath = join(__dirname, 'probe-nselib-provider.py');

  try {
    const output = execSync(`python3 "${probePath}"`, {
      encoding: 'utf-8',
      timeout: 120_000,
    });

    const jsonStart = output.indexOf('{');
    const jsonStr = jsonStart >= 0 ? output.slice(jsonStart) : output;
    const raw: NselibReport = JSON.parse(jsonStr);

    console.log(JSON.stringify(raw, null, 2));

    const active = Object.values(raw.domains).filter(d => d.status === 'healthy').length;
    const blocked = Object.values(raw.domains).filter(d => d.status === 'blocked').length;
    const failed = Object.values(raw.domains).filter(d => d.status !== 'healthy' && d.status !== 'blocked').length;

    console.log(`\n=== Summary ===`);
    console.log(`Python:      ${raw.python_version}`);
    console.log(`Domains:     ${active} healthy, ${blocked} blocked, ${failed} failed (${raw.total_domains} total)`);
    console.log(`Import:      ${raw.domains.import?.status ?? 'unknown'}`);

    const byDomain: Record<string, string> = {};
    for (const [name, result] of Object.entries(raw.domains)) {
      byDomain[name] = result.status;
    }
    console.log(`\nDomain status:`);
    for (const [name, status] of Object.entries(byDomain)) {
      const icon = status === 'healthy' ? '✓' : status === 'blocked' ? '⊘' : '✗';
      console.log(`  ${icon} ${name}: ${status}`);
    }
  } catch (err: any) {
    const isTimeout = err.message?.includes('timeout') ?? false;
    console.log(`\nProbe failed: ${isTimeout ? 'timeout after 120s' : err.message}`);
    process.exitCode = 0;
  }

  process.exitCode = 0;
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
