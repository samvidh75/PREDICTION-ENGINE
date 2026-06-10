#!/usr/bin/env node
import { platform, arch, version as nodeVersion } from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const results = [];

function test(label, fn) {
  try { fn(); console.log(`PASS ${label}`); results.push({ pass: true }); }
  catch (e) { console.log(`FAIL ${label}: ${e.message}`); results.push({ pass: false, error: e.message }); }
}

console.log('══ Native Module Verifier ══');
console.log(`  Platform:    ${platform}`);
console.log(`  Architecture: ${arch}`);
console.log(`  Node.js:     ${nodeVersion}`);
console.log('');

test('better-sqlite3: load + CRUD', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('CREATE TABLE v (id INTEGER PRIMARY KEY, data TEXT)');
  db.prepare('INSERT INTO v (data) VALUES (?)').run('native-verified');
  const row = db.prepare('SELECT data FROM v WHERE id = 1').get();
  if (!row || row.data !== 'native-verified') throw new Error('Data mismatch');
  db.close();
});

test('esbuild: import', () => {
  require('esbuild');
  console.log(`   esbuild v${require('esbuild/package.json').version}`);
});

test('rollup: import', () => {
  console.log(`   rollup v${require('rollup/package.json').version}`);
});

console.log('');
const failures = results.filter(r => !r.pass);
if (failures.length === 0) { console.log('RESULT: PASS'); process.exit(0); }
else { console.log(`RESULT: FAIL — ${failures.length} check(s)`); process.exit(1); }
