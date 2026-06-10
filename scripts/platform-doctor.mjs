#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.cwd());
let failures = 0;

async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS  ${label}: ${String(result)}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(`FAIL  ${label}: ${message}`);
    failures += 1;
  }
}

console.log('══ Platform Doctor ══');
console.log('');

await check('OS', async () => process.platform);
await check('Arch', async () => process.arch);
await check('Node', async () => process.version);

await check('npm', async () =>
  execFileSync('npm', ['--version'], {
    encoding: 'utf8',
  }).trim(),
);

console.log('');
console.log('-- Files --');

await check('package.json', async () => {
  if (!existsSync(join(root, 'package.json'))) {
    throw new Error('missing');
  }
  return 'yes';
});

await check('package-lock.json', async () => {
  if (!existsSync(join(root, 'package-lock.json'))) {
    throw new Error('missing');
  }
  return 'yes';
});

await check('node_modules', async () => {
  if (!existsSync(join(root, 'node_modules'))) {
    throw new Error('missing — run npm ci');
  }
  return 'yes';
});

await check('platform marker', async () => {
  const markerPath = join(
    root,
    'node_modules',
    '.stockstory-platform.json',
  );

  if (!existsSync(markerPath)) {
    throw new Error(
      'missing — run npm run write:install-marker',
    );
  }

  const marker = JSON.parse(
    readFileSync(markerPath, 'utf8'),
  );

  return `${marker.platform}/${marker.arch}`;
});

console.log('');
console.log('-- Portable SQLite --');

await check('sql.js WASM CRUD', async () => {
  const module = await import('sql.js');
  const initSqlJs = module.default;
  const SQL = await initSqlJs();

  const db = new SQL.Database();

  db.run(
    'CREATE TABLE doctor_test (id INTEGER PRIMARY KEY, value TEXT)',
  );

  db.run(
    'INSERT INTO doctor_test (value) VALUES (?)',
    ['ok'],
  );

  const result = db.exec(
    'SELECT value FROM doctor_test WHERE id = 1',
  );

  const value = result[0]?.values[0]?.[0];

  if (value !== 'ok') {
    throw new Error(
      `Expected ok, received ${String(value)}`,
    );
  }

  db.close();

  return 'ok';
});

console.log('');
console.log('-- Build Tools --');

await check('esbuild', async () => {
  await import('esbuild');
  return 'available';
});

await check('rollup', async () => {
  await import('rollup');
  return 'available';
});

await check('vite', async () => {
  await import('vite');
  return 'available';
});

console.log('');
console.log('-- Filesystem --');

await check('project tmp writable', async () => {
  const dir = join(root, 'tmp');

  if (!existsSync(dir)) {
    mkdirSync(dir, {
      recursive: true,
    });
  }

  const file = join(
    dir,
    `platform-doctor-${Date.now()}.txt`,
  );

  writeFileSync(file, 'ok', 'utf8');

  const value = readFileSync(file, 'utf8');

  unlinkSync(file);

  if (value !== 'ok') {
    throw new Error('project tmp mismatch');
  }

  return dir;
});

await check('OS tmp writable', async () => {
  const file = join(
    tmpdir(),
    `platform-doctor-${Date.now()}.txt`,
  );

  writeFileSync(file, 'ok', 'utf8');

  const value = readFileSync(file, 'utf8');

  unlinkSync(file);

  if (value !== 'ok') {
    throw new Error('OS tmp mismatch');
  }

  return tmpdir();
});

console.log('');

if (failures > 0) {
  console.error(`RESULT: FAIL (${failures})`);
  process.exitCode = 1;
} else {
  console.log('RESULT: PASS');
}
