export {};
/**
 * check-nsepython-provider.ts — TypeScript probe wrapper for nsepython / nsepythonserver.
 *
 * nsepython is available on Python 3.9 (both local and Railway).
 * It provides:
 *   - Index quotes (NIFTY 50, NIFTY BANK, etc.) — healthy
 *   - NSE equity symbols list (2374 symbols) — healthy
 *   - Market status (open/closed) — healthy
 *   - Index list (213 indices) — healthy
 *   - Individual equity quotes — unreliable (NSE requires session cookies)
 *   - Historical data — unreliable (NSE API restrictions)
 *
 * This is a no-credential public data provider. Useful for index/sector coverage
 * and NSE universe sync, but not for individual stock quotes or historical data.
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProbeResult {
  status: string;
  detail: string;
}

async function main(): Promise<void> {
  console.log('=== NSEPython Provider Probe ===\n');

  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch { pythonVersion = 'not found'; }
  console.log(`Python: ${pythonVersion}`);

  try {
    const probePath = join(__dirname, 'probe-nsepython-provider.py');
    const output = execSync(`python3 "${probePath}" 2>&1`, { encoding: 'utf-8', timeout: 120_000 });
    console.log(output);

    const resultsMatch = output.match(/\{[\s\S]*\}/);
    if (resultsMatch) {
      const results = JSON.parse(resultsMatch[0]);
      const healthy = Object.values(results).filter((r: any) => r.status === 'healthy').length;
      const total = Object.keys(results).length;
      console.log(`\n=== NSEPython Result: ${healthy}/${total} domains healthy ===`);
    }
  } catch (err: any) {
    console.error(`Probe execution failed: ${err.message}`);
  }

  process.exitCode = 0;
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
