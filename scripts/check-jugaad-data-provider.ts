import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  console.log('\n=== Jugaad-Data Provider Probe ===\n');
  const probePath = join(__dirname, 'probe-jugaad-data-provider.py');
  try {
    const output = execSync(`python3 "${probePath}"`, { encoding: 'utf-8', timeout: 120000 });
    console.log(output.trim());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Probe execution failed: ${msg}`);
    process.exit(1);
  }
}

main();
