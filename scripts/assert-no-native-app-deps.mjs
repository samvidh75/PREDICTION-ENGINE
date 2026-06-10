#!/usr/bin/env node
/**
 * assert-no-native-app-deps.mjs — Audits package.json for native-app dependencies.
 * Fails if any native-app deps (better-sqlite3, sqlite3, bindings, node-gyp-build,
 * prebuild-install) are in direct dependencies. Allows @rollup/*, @esbuild/*,
 * lightningcss-* as transitive. Uses process.exitCode. Prints exact findings.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());
const BLOCKLIST = new Set([
  'better-sqlite3',
  'sqlite3',
  'bindings',
  'node-gyp-build',
  'prebuild-install',
]);

const ALLOW_TRANSITIVE = [
  /^@rollup\//,
  /^@esbuild\//,
  /^lightningcss-/,
];

function isTransitivelyAllowed(name) {
  return ALLOW_TRANSITIVE.some(pattern => pattern.test(name));
}

console.log('══ Assert No Native App Dependencies ══');
console.log('');

let pkg;
try {
  const pkgPath = join(ROOT, 'package.json');
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch (e) {
  console.log(`FAIL  Cannot read package.json: ${e.message}`);
  process.exitCode = 1;
  return;
}

const allDeps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
  ...(pkg.peerDependencies || {}),
  ...(pkg.optionalDependencies || {}),
};

const directDeps = new Set(Object.keys(pkg.dependencies || {}));
const findings = [];
const transitiveOk = [];

for (const [name, version] of Object.entries(allDeps)) {
  if (BLOCKLIST.has(name)) {
    if (directDeps.has(name)) {
      findings.push(`BLOCKED (direct): ${name}@${version}`);
    } else {
      transitiveOk.push(`ALLOWED (transitive): ${name}@${version}`);
    }
  }
}

console.log(`Scanned ${Object.keys(allDeps).length} total dependencies`);
console.log(`Direct dependencies: ${directDeps.size}`);
console.log(`Blocklist: [${[...BLOCKLIST].join(', ')}]`);
console.log('');

if (findings.length > 0) {
  console.log('--- BLOCKED ---');
  for (const f of findings) console.log(`  FAIL  ${f}`);
  console.log('');
  console.log('RESULT: FAIL — Native-app dependencies found in direct deps');
  process.exitCode = 1;
} else {
  console.log('--- BLOCKED ---');
  console.log('  (none)');
  console.log('');
  console.log('RESULT: PASS — No native-app dependencies in direct deps');
}

if (transitiveOk.length > 0) {
  console.log('');
  console.log('--- Transitive (allowed) ---');
  for (const t of transitiveOk) console.log(`  OK  ${t}`);
}

process.exitCode = process.exitCode || 0;