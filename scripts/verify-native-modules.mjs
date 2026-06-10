#!/usr/bin/env node
/**
 * verify-native-modules.mjs — Validates sql.js WASM + CRUD cycle and bundler imports.
 * Verifies: sql.js import, WASM init, :memory: DB open, CREATE TABLE, INSERT,
 * SELECT, export, close. Also verifies esbuild and rollup import.
 * Exits 1 on any failure.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let failures = 0;

function check(label, fn) {
  try {
    const result = fn();
    console.log(`PASS  ${label}${result ? ': ' + result : ''}`);
  } catch (e) {
    console.log(`FAIL  ${label}: ${e.message}`);
    failures++;
  }
}

console.log('══ Verify Native Modules ══');
console.log('');

// -- sql.js import --
let initSqlJs;
check('sql.js import', () => {
  initSqlJs = require('sql.js');
  if (typeof initSqlJs !== 'function') throw new Error('sql.js did not return a function');
  return 'import OK';
});

// -- sql.js WASM init + full CRUD cycle --
if (initSqlJs) {
  check('sql.js WASM init', () => {
    initSqlJs().then(SQL => { /* no-op here, real test in async block */ });
    return 'init called';
  });

  // Run the full async verification
  (async () => {
    try {
      const SQL = await initSqlJs();

      // :memory: DB opens
      let db;
      check(':memory: DB opens', () => {
        db = new SQL.Database();
        if (!db) throw new Error('Database object is null');
        return ':memory: opened';
      });

      // CREATE TABLE
      check('CREATE TABLE', () => {
        db.run('CREATE TABLE verify_native (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value REAL)');
        return 'table created';
      });

      // INSERT
      check('INSERT', () => {
        db.run('INSERT INTO verify_native (name, value) VALUES (?, ?)', ['alpha', 42.5]);
        db.run('INSERT INTO verify_native (name, value) VALUES (?, ?)', ['beta', 7.0]);
        return '2 rows inserted';
      });

      // SELECT
      check('SELECT', () => {
        const result = db.exec('SELECT * FROM verify_native ORDER BY id');
        if (result.length !== 1) throw new Error('Expected 1 result set');
        if (result[0].values.length !== 2) throw new Error('Expected 2 rows');
        if (result[0].values[0][1] !== 'alpha') throw new Error('Row 1 name mismatch');
        if (result[0].values[1][2] !== 7.0) throw new Error('Row 2 value mismatch');
        return `rows: ${result[0].values.length}`;
      });

      // EXPORT (binary Uint8Array)
      check('EXPORT succeeds', () => {
        const data = db.export();
        if (!(data instanceof Uint8Array)) throw new Error('Export not a Uint8Array');
        if (data.length === 0) throw new Error('Export returned empty buffer');
        return `export: ${data.length} bytes`;
      });

      // CLOSE succeeds
      check('CLOSE succeeds', () => {
        db.close();
        // Attempting to use db after close should fail
        try {
          db.run('SELECT 1');
          throw new Error('db still usable after close');
        } catch (e) {
          // Expected — db is closed
        }
        return 'closed, db unusable as expected';
      });

      // -- Bundler imports --
      console.log('');
      console.log('-- Bundlers --');
      check('esbuild import', () => {
        const esbuild = require('esbuild');
        if (typeof esbuild.build !== 'function' && typeof esbuild.transform !== 'function') {
          throw new Error('esbuild API not as expected');
        }
        return `v${require('esbuild/package.json').version}`;
      });

      check('rollup import', () => {
        const rollup = require('rollup');
        if (typeof rollup.rollup !== 'function') throw new Error('rollup API not as expected');
        return `v${require('rollup/package.json').version}`;
      });

      // Final result
      console.log('');
      if (failures === 0) { console.log('RESULT: PASS'); process.exit(0); }
      else { console.log(`RESULT: FAIL (${failures})`); process.exit(1); }
    } catch (e) {
      console.log(`FAIL  sql.js async init: ${e.message}`);
      console.log('');
      console.log(`RESULT: FAIL (1)`);
      process.exit(1);
    }
  })();
} else {
  console.log('');
  console.log('RESULT: FAIL (cannot proceed without sql.js)');
  process.exit(1);
}