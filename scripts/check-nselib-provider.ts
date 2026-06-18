export {};
/**
 * check-nselib-provider.ts — TypeScript probe wrapper for nselib.
 *
 * nselib requires Python 3.10+ (uses PEP 604 union syntax).
 * On Python 3.9 (both local and Railway), the import fails with:
 *   TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
 *
 * This probe checks if nselib is usable and reports status.
 * If nselib is unavailable, this is expected and non-blocking.
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProbeResult {
  status: 'healthy' | 'import_failed' | 'endpoint_failed' | 'parse_failed' | 'no_rows' | 'rate_limited' | 'blocked' | 'timeout' | 'unavailable';
  detail: string;
  pythonVersion?: string;
}

async function main(): Promise<void> {
  console.log('=== NSELib Provider Probe ===\n');

  // Check Python version
  let pythonVersion = 'unknown';
  try {
    pythonVersion = execSync('python3 --version 2>&1', { encoding: 'utf-8' }).trim();
  } catch { pythonVersion = 'not found'; }
  console.log(`Python: ${pythonVersion}`);

  // Run nselib probe via Python
  try {
    const probePath = join(__dirname, 'probe-nselib-provider.py');
    const output = execSync(`python3 "${probePath}" 2>&1`, { encoding: 'utf-8', timeout: 120_000 });
    console.log(output);

    // Parse JSON result from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      const healthy = Object.values(results).filter((r: any) => r.status === 'healthy').length;
      const total = Object.keys(results).length;
      console.log(`\n=== NSELib Result: ${healthy}/${total} domains healthy ===`);
      if (healthy === 0) {
        console.log('⚠️  No nselib domains work (expected on Python 3.9)');
      }
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
