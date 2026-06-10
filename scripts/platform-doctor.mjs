#!/usr/bin/env node
/**
 * platform-doctor.mjs — Prints and validates platform state.
 * Checks: OS, Arch, Node, npm, package-lock, node_modules, temp writable,
 * sql.js init + in-memory CRUD, esbuild, rollup, vite resolvable.
 * Exits 1 on any failure.
 */

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

function syncCheck(label, fn) {
  try { console.log(`PASS  ${label}: ${fn()}`); }
  catch (e) { console.log(`FAIL  ${label}: ${e.message}`); failures++; }
}

async function asyncCheck(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS  ${label}: ${result}`);
  } catch (e) {
    console.log(`FAIL  ${label}: ${e.message}`);
    failures++;
  }
}

console.log('══ Platform Doctor ══');
console.log('');
syncCheck('OS', () => platform);
syncCheck('Arch', () => arch);
syncCheck('Node', () => nodeVersion);
let npmV = 'unknown'; try { npmV = execSync('npm --version', { encoding: 'utf8' }).trim(); } catch {}
syncCheck('npm', () => npmV);

console.log('');
console.log('-- Files --');
syncCheck('package.json', () => existsSync(join(ROOT, 'package.json')) ? 'yes' : 'no');
syncCheck('package-lock.json', () => existsSync(join(ROOT, 'package-lock.json')) ? 'yes' : 'no');
syncCheck('node_modules', () => existsSync(join(ROOT, 'node_modules')) ? 'yes' : 'no');

console.log('');
console.log('-- Bundlers --');
syncCheck('esbuild', () => `v${require('esbuild/package.json').version}`);
syncCheck('rollup', () => `v${require('rollup/package.json').version}`);
syncCheck('vite', () => `v${require('vite/package.json').version}`);

console.log('');
console.log('-- SQLite (sql.js WASM) --');
syncCheck('sql.js', () => `v${require('sql.js/package.json').version}`);

console.log('');
console.log('-- FS --');
syncCheck('tmp writable', () => {
  const f = join(tmpdir(), `doc-${Date.now()}.txt`);
  writeFileSync(f, 'p'); const c = readFileSync(f, 'utf8'); unlinkSync(f);
  if (c !== 'p') throw new Error('mismatch');
  return tmpdir();
});

// Run async checks, then finalise
(async () => {
  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch (e) {
    syncCheck('sql.js load', () => { throw e; });
  }

  if (initSqlJs) {
    await asyncCheck('sql.js init + CRUD', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      db.run('CREATE TABLE doctor (id INTEGER PRIMARY KEY, val TEXT)');
      db.run('INSERT INTO doctor (val) VALUES (?)', ['healthy']);
      const rows = db.exec('SELECT * FROM doctor');
      if (rows.length === 0 || rows[0].values.length !== 1) throw new Error('SELECT returned unexpected rows');
      if (rows[0].values[0][1] !== 'healthy') throw new Error('INSERT/SELECT value mismatch');
      db.close();
      return 'in-memory CRUD OK';
    });
  }

  console.log('');
  if (failures === 0) { console.log('RESULT: PASS'); process.exit(0); }
  else { console.log(`RESULT: FAIL (${failures})`); process.exit(1); }
})();