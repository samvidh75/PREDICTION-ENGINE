export {};
/**
 * check-nsepython-provider.ts — TypeScript wrapper that calls probe-nsepython-provider.py.
 *
 * nsepython v2.97+ provides public NSE data without credentials.
 * Available on Python 3.9+.
 *
 * Classification:
 *   - healthy:  module imported, ≥1 endpoint works
 *   - degraded: module imported but all endpoints fail
 *   - unavailable: module import failed
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface NsepythonReport {
  probe: string;
  healthy_probes: number;
  total_probes: number;
  results: Record<string, { status: string; elapsed?: number; detail: unknown }>;
}

interface HealthResult {
  status: 'healthy' | 'degraded' | 'unavailable';
  detail: string;
  pythonVersion: string;
  healthyProbes: number;
  totalProbes: number;
}

async function main(): Promise<void> {
  console.log('=== NSEPython Provider Probe ===\n');

  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch {
    pythonVersion = 'not found';
  }
  console.log(`Python: ${pythonVersion}\n`);

  const probePath = join(__dirname, 'probe-nsepython-provider.py');

  let result: HealthResult;

  try {
    const output = execSync(`python3 "${probePath}"`, {
      encoding: 'utf-8',
      timeout: 120_000,
    });

    // Extract JSON from stdout (ignore stderr warnings)
    const jsonStart = output.indexOf('{');
    const jsonStr = jsonStart >= 0 ? output.slice(jsonStart) : output;
    const report: NsepythonReport = JSON.parse(jsonStr);
    result = {
      status: report.healthy_probes > 0 ? 'healthy' : 'degraded',
      detail: `${report.healthy_probes}/${report.total_probes} probes healthy`,
      pythonVersion,
      healthyProbes: report.healthy_probes,
      totalProbes: report.total_probes,
    };

    console.log(JSON.stringify(report, null, 2));
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
