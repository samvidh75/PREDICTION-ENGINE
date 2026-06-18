export {};
/**
 * check-nselib-provider.ts — TypeScript wrapper that calls probe-nselib-provider.py.
 *
 * nselib requires Python 3.10+ (PEP 604 union syntax with `|`).
 * On Python 3.9 (both local and Railway) the import fails with:
 *   TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
 *
 * This probe classifies nselib availability as:
 *   - healthy:  ≥1 useful domain works
 *   - degraded:  module imported but no useful domains work
 *   - unavailable: module import failed
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface NselibReport {
  probe: string;
  python_version: string;
  healthy_probes: number;
  total_probes: number;
  domain_summary: Record<string, string>;
  results: Record<string, { status: string; elapsed?: number; detail: unknown }>;
}

interface HealthResult {
  status: 'healthy' | 'degraded' | 'unavailable';
  detail: string;
  pythonVersion: string;
  healthyProbes: number;
  totalProbes: number;
  domainSummary: Record<string, string>;
}

async function main(): Promise<void> {
  console.log('=== NSELib Provider Probe ===\n');

  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch {
    pythonVersion = 'not found';
  }
  console.log(`Python: ${pythonVersion}\n`);

  const probePath = join(__dirname, 'probe-nselib-provider.py');

  let result: HealthResult;
  try {
    const output = execSync(`python3 "${probePath}"`, {
      encoding: 'utf-8',
      timeout: 120_000,
    });

    // Extract JSON from stdout (ignore stderr warnings)
    const jsonStart = output.indexOf('{');
    const jsonStr = jsonStart >= 0 ? output.slice(jsonStart) : output;
    const raw = JSON.parse(jsonStr);

    // Handle both formats: direct results dict or structured report with healthy_probes/total_probes
    const isStructured = 'healthy_probes' in raw || 'total_probes' in raw;
    const results = isStructured ? (raw as any).results ?? raw : raw;
    const healthyProbes = isStructured ? (raw as any).healthy_probes ?? 0 : 0;
    const totalProbes = isStructured ? (raw as any).total_probes ?? 0 : Object.keys(raw).length;
    const domainSummary: Record<string, string> = {};
    for (const [k, v] of Object.entries(results)) {
      domainSummary[k] = (v as any).status ?? 'unknown';
    }

    const allHealthy = Object.values(results).every((v: any) => v.status === 'healthy');
    const anyHealthy = Object.values(results).some((v: any) => v.status === 'healthy');

    result = {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unavailable',
      detail: `${healthyProbes}/${totalProbes} probes healthy`,
      pythonVersion,
      healthyProbes,
      totalProbes,
      domainSummary,
    };

    console.log(JSON.stringify(jsonStart >= 0 ? JSON.parse(jsonStr) : {}, null, 2));
    console.log(`\nClassification: ${result.status}`);
    console.log(`Healthy probes: ${result.healthyProbes}/${result.totalProbes}`);
  } catch (err: any) {
    const isTimeout = err.message?.includes('timeout') ?? false;
    result = {
      status: 'unavailable',
      detail: isTimeout ? 'Python probe timed out after 120s' : `Probe execution failed: ${err.message}`,
      pythonVersion,
      healthyProbes: 0,
      totalProbes: 0,
      domainSummary: {},
    };
    console.log(`\nClassification: ${result.status}`);
    console.log(result.detail);
  }

  process.exitCode = 0;
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
