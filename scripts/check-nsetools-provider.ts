export {};

import { execFileSync } from 'node:child_process';

async function main(): Promise<void> {
  const output = execFileSync('python3', ['scripts/probe-nsetools-provider.py'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  console.log(output.trim());
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});
