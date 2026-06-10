#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { platform, arch, cwd, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(cwd());
let failures = 0;

function check(label, fn) {
  try { console.log(`PASS  ${label}: ${fn()}`); } 
  catch (e) { console.log(`FAIL  ${label}: ${e.message}`); failures++; }
}

console.log('══ PREDICTION-ENGINE Platform Doctor ══');
console.log('');
console.log('-- System --');
check('OS', () => platform);
check('Arch', () => arch);
check('Node.js', () => nodeVersion);
let npmV = 'unknown'; try { npmV = execSync('npm --version', { encoding: 'utf8', timeout: 10_000 }).trim(); } catch {}
check('npm', () => npmV);
check('Project root', () => ROOT);

console.log('');
console.log('-- Project files --');
check('package.json', () => existsSync(join(ROOT, 'package.json')) ? 'yes' : 'missing');
check('package-lock.json', () => existsSync(join(ROOT, 'package-lock.json')) ? 'yes' : 'missing');
check('node_modules', () => existsSync(join(ROOT, 'node_modules')) ? 'yes' : 'missing');
check('.gitignore excludes node_modules', () => {
  const gi = join(ROOT, '.gitignore');
  if (!existsSync(gi)) throw new Error('not found');
  if (!readFileSync(gi, 'utf8').split('\n').some(l => l.trim() === 'node_modules' || l.trim() === 'node_modules/')) throw new Error('not in .gitignore');
  return 'yes';
});

console.log('');
console.log('-- Native modules --');
check('better-sqlite3', () => `v${require('better-sqlite3/package.json').version}`);
check('esbuild', () => `v${require('esbuild/package.json').version}`);
check('vite', () => `v${require('vite/package.json').version}`);
check('rollup', () => `v${require('rollup/package.json').version}`);

console.log('');
console.log('-- SQLite CRUD --');
check('SQLite create/read/write/delete', () => {
  const tmp = join(ROOT, 'tmp'); if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });
  const dbPath = join(tmp, `doctor-${Date.now()}.db`);
  const db = new (require('better-sqlite3'))(dbPath);
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
  db.prepare('INSERT INTO t (v) VALUES (?)').run('ok');
  const row = db.prepare('SELECT v FROM t WHERE id=1').get();
  if (!row || row.v !== 'ok') throw new Error('mismatch');
  db.close();
  unlinkSync(dbPath); try { unlinkSync(dbPath + '-wal'); } catch {} try { unlinkSync(dbPath + '-shm'); } catch {}
  return 'CRUD passed';
});

console.log('');
console.log('-- Filesystem --');
check('Temp writable', () => {
  const tf = join(tmpdir(), `doc-${Date.now()}.txt`);
  writeFileSync(tf, 'portable'); const c = readFileSync(tf, 'utf8'); unlinkSync(tf);
  if (c !== 'portable') throw new Error('mismatch'); return tmpdir();
});

console.log('');
if (failures === 0) { console.log('RESULT: PASS'); process.exit(0); }
else { console.log(`RESULT: FAIL — ${failures} check(s)`); process.exit(1); }
