#!/usr/bin/env node
/**
 * validate-temp-cleanup.mjs — Tests cross-platform temp-file cleanup.
 * NEVER touches production paths (data/, node_modules/, dist/).
 */

import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { tmpdir } from 'node:os';

const PROJECT_ROOT = resolve(cwd());
const TMP_DIR = join(PROJECT_ROOT, 'tmp');
const VALIDATION_DIR = join(TMP_DIR, `temp-cleanup-test-${Date.now()}`);

let passed = 0;
let failed = 0;

function check(label, fn) {
  try { fn(); console.log(`PASS  ${label}`); passed++; }
  catch (e) { console.log(`FAIL  ${label}: ${e.message}`); failed++; }
}

console.log('═══════════════════════════════════════════');
console.log('  Temp File Cleanup Validation');
console.log('═══════════════════════════════════════════\n');

if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
if (existsSync(VALIDATION_DIR)) rmSync(VALIDATION_DIR, { recursive: true, force: true });
mkdirSync(VALIDATION_DIR, { recursive: true });

const testFile = join(VALIDATION_DIR, 'test.txt');
const testDb = join(VALIDATION_DIR, 'test.db');
const testWal = join(VALIDATION_DIR, 'test.db-wal');
const testShm = join(VALIDATION_DIR, 'test.db-shm');
const testJournal = join(VALIDATION_DIR, 'test.db-journal');
const testSubDir = join(VALIDATION_DIR, 'subdir');

writeFileSync(testFile, 'hello');
mkdirSync(testSubDir, { recursive: true });
writeFileSync(join(testSubDir, 'nested.txt'), 'nested');
writeFileSync(testDb, 'sqlite');
writeFileSync(testWal, 'wal');
writeFileSync(testShm, 'shm');
writeFileSync(testJournal, 'journal');

check('Created temp files + SQLite sidecars', () => {
  if (!existsSync(testWal)) throw new Error('WAL missing');
  if (!existsSync(testShm)) throw new Error('SHM missing');
  if (!existsSync(testJournal)) throw new Error('Journal missing');
});

unlinkSync(testFile); unlinkSync(testDb); unlinkSync(testWal); unlinkSync(testShm); unlinkSync(testJournal);

check('Removed individual temp files', () => {
  if (existsSync(testWal)) throw new Error('WAL still exists');
  if (existsSync(testDb)) throw new Error('DB still exists');
});

check('Removed temp directory recursively', () => {
  rmSync(VALIDATION_DIR, { recursive: true, force: true });
  if (existsSync(VALIDATION_DIR)) throw new Error('Dir still exists');
});

check('OS tmpdir() is writable and cleanable', () => {
  const f = join(tmpdir(), `validate-temp-${Date.now()}.txt`);
  writeFileSync(f, 'test');
  unlinkSync(f);
  if (existsSync(f)) throw new Error('OS temp file not cleaned');
});

console.log(`\n═══════════════════════════════════════════`);
console.log(`  Passed: ${passed}  Failed: ${failed}`);
if (failed === 0) { console.log('  RESULT: PASS'); process.exit(0); }
else { console.log('  RESULT: FAIL'); process.exit(1); }