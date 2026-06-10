#!/usr/bin/env node

import process from 'node:process';

console.log('══ Portable Dependency Verifier ══');
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node.js: ${process.version}`);
console.log('');

let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`PASS  ${label}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(`FAIL  ${label}: ${message}`);
    failed += 1;
  }
}

await test('sql.js WASM load + in-memory CRUD', async () => {
  const module = await import('sql.js');
  const initSqlJs = module.default;
  const SQL = await initSqlJs();

  const db = new SQL.Database();

  db.run('CREATE TABLE portable_test (id INTEGER PRIMARY KEY, value TEXT)');
  db.run('INSERT INTO portable_test (value) VALUES (?)', ['verified']);

  const result = db.exec(
    'SELECT value FROM portable_test WHERE id = 1',
  );

  const value = result[0]?.values[0]?.[0];

  if (value !== 'verified') {
    throw new Error(`Expected verified, received ${String(value)}`);
  }

  const exported = db.export();

  if (!(exported instanceof Uint8Array) || exported.length === 0) {
    throw new Error('sql.js export did not return bytes');
  }

  db.close();
});

await test('esbuild import', async () => {
  await import('esbuild');
});

await test('rollup import', async () => {
  await import('rollup');
});

console.log('');

if (failed > 0) {
  console.error(`RESULT: FAIL (${failed})`);
  process.exitCode = 1;
} else {
  console.log('RESULT: PASS');
}
