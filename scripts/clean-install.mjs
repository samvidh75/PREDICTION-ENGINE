#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { rmSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());
if (!existsSync(join(ROOT, 'package.json'))) { console.error('ERROR: Run from project root'); process.exit(1); }

const dirs = ['node_modules', 'dist', 'coverage'];
console.log('══ Clean Install ══');
console.log(`  Project: ${ROOT}`);
console.log('');

console.log('-- Removing artifacts --');
for (const d of dirs) {
  const p = join(ROOT, d);
  if (existsSync(p)) { console.log(`  Removing: ${d}`); rmSync(p, { recursive: true, force: true }); }
  else console.log(`  Skip: ${d}`);
}
const tmp = join(ROOT, 'tmp');
if (existsSync(tmp)) { console.log('  Removing: tmp/'); rmSync(tmp, { recursive: true, force: true }); }
for (const e of readdirSync(ROOT)) {
  if (e.endsWith('.db-wal') || e.endsWith('.db-shm')) { console.log(`  Removing WAL: ${e}`); unlinkSync(join(ROOT, e)); }
}

console.log('');
console.log('-- npm ci --');
try { execSync('npm ci', { cwd: ROOT, stdio: 'inherit', timeout: 300_000 }); }
catch { console.error('ERROR: npm ci failed'); process.exit(1); }

console.log('');
console.log('-- verify:native --');
try { execSync('npm run verify:native', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 }); }
catch { console.error('ERROR: Native verification failed'); process.exit(1); }

console.log('');
console.log('RESULT: PASS — Clean install complete');
