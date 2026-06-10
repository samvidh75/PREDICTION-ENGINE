#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { platform, arch, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(cwd());
let failures = 0;

function check(label, fn) {
  try { console.log(`PASS  ${label}: ${fn()}`); }
  catch (e) { console.log(`FAIL  ${label}: ${e.message}`); failures++; }
}

console.log('══ Platform Doctor ══');
console.log('');
check('OS', () => platform);
check('Arch', () => arch);
check('Node', () => nodeVersion);
let npmV = 'unknown'; try { npmV = execSync('npm --version', { encoding: 'utf8' }).trim(); } catch {}
check('npm', () => npmV);

console.log('');
console.log('-- Files --');
check('package.json', () => existsSync(join(ROOT, 'package.json')) ? 'yes' : 'no');
check('package-lock.json', () => existsSync(join(ROOT, 'package-lock.json')) ? 'yes' : 'no');
check('node_modules', () => existsSync(join(ROOT, 'node_modules')) ? 'yes' : 'no');

console.log('');
console.log('-- Bundlers --');
check('esbuild', () => `v${require('esbuild/package.json').version}`);
check('rollup', () => `v${require('rollup/package.json').version}`);
check('vite', () => `v${require('vite/package.json').version}`);

console.log('');
console.log('-- SQLite (sql.js WASM) --');
check('sql.js', () => `v${require('sql.js/package.json').version}`);

console.log('');
console.log('-- FS --');
check('tmp writable', () => {
  const f = join(tmpdir(), `doc-${Date.now()}.txt`);
  writeFileSync(f, 'p'); const c = readFileSync(f, 'utf8'); unlinkSync(f);
  if (c !== 'p') throw new Error('mismatch');
  return tmpdir();
});

console.log('');
if (failures === 0) { console.log('RESULT: PASS'); process.exit(0); }
else { console.log(`RESULT: FAIL (${failures})`); process.exit(1); }
