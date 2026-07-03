export {};

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

interface NselibProbeReport {
  probe: string;
  python_version: string;
  healthy_domains: number;
  total_domains: number;
  blocked_domains: number;
  domains: Record<string, { domain: string; status: string; detail?: string }>;
}

function runProbe(pythonBin: string): NselibProbeReport | null {
  try {
    const output = execFileSync(pythonBin, ['scripts/probe-nselib-provider.py'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(output) as NselibProbeReport;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const candidates = [
    process.env.NSELIB_PYTHON_BIN,
    existsSync('/tmp/nselib-probe-env/bin/python') ? '/tmp/nselib-probe-env/bin/python' : null,
    'python3',
  ].filter((value): value is string => Boolean(value));

  let report: NselibProbeReport | null = null;
  let usedPython = 'python3';

  for (const pythonBin of candidates) {
    const result = runProbe(pythonBin);
    if (result) {
      report = result;
      usedPython = pythonBin;
      break;
    }
  }

  if (!report) {
    console.log(JSON.stringify({
      provider: 'nselib',
      lifecycle: 'probe_only',
      status: 'probe_failed',
      detail: 'Could not execute probe-nselib-provider.py with any configured Python runtime',
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const usableDomains = Object.entries(report.domains)
    .filter(([name, domain]) => name !== 'import' && name !== 'api_discovery' && domain.status === 'healthy')
    .map(([name]) => name);

  console.log(JSON.stringify({
    provider: 'nselib',
    lifecycle: usableDomains.length > 0 ? 'probe_only' : 'archived',
    python_bin: usedPython,
    python_version: report.python_version,
    healthy_domains: report.healthy_domains,
    total_domains: report.total_domains,
    usable_domains: usableDomains,
    status: usableDomains.length > 0 ? 'limited_usable' : 'archived_unusable',
    domains: report.domains,
  }, null, 2));
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
