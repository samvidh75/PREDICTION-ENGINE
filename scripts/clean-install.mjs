#!/usr/bin/env node
/**
 * clean-install.mjs — Safely removes build artifacts and reinstalls from scratch.
 *
 * Deletes: node_modules, dist, coverage, tmp/, and SQLite WAL/SHM sidecars.
 * NEVER deletes: .git, source files, package-lock.json, .env* files.
 * Reinstalls via npm ci, then runs the full platform verification chain.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());

/**
 * Print a removed path in a consistent format.
 * @param {string} path - Absolute path that was removed.
 */
function logRemoved(path) {
  console.log(`REMOVED  ${path}`);
}

/**
 * Remove a path if it exists, using rmSync. Logs the action.
 * @param {string} absolutePath
 * @param {boolean} [recursive=true]
 */
function removeIfExists(absolutePath, recursive = true) {
  if (!existsSync(absolutePath)) return;
  try {
    rmSync(absolutePath, { recursive, force: true });
    logRemoved(absolutePath);
  } catch (err) {
    console.error(`ERROR removing ${absolutePath}: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Remove files matching a glob-like suffix pattern from the project root.
 * Only scans the root directory (non-recursive).
 * @param {string} suffix - e.g. '.db-wal' or '.db-shm'
 */
function removeRootFilesBySuffix(suffix) {
  const entries = readdirSync(ROOT);
  for (const entry of entries) {
    if (!entry.endsWith(suffix)) continue;
    const fullPath = resolve(ROOT, entry);
    // Safety: ensure it's a file, not a directory
    const st = statSync(fullPath);
    if (!st.isFile()) continue;
    try {
      rmSync(fullPath, { force: true });
      logRemoved(fullPath);
    } catch (err) {
      console.error(`ERROR removing ${fullPath}: ${err.message}`);
      process.exit(1);
    }
  }
}

/**
 * Safety gate: verify we are deleting the right things.
 * Returns true if all safety checks pass.
 */
function safetyCheck() {
  const required = [
    resolve(ROOT, 'package.json'),
    resolve(ROOT, 'package-lock.json'),
  ];
  for (const p of required) {
    if (!existsSync(p)) {
      console.error(`SAFETY ERROR: Missing required file: ${p}`);
      console.error('Refusing to run in a directory that does not look like the project root.');
      process.exit(1);
    }
  }

  // Ensure we are NOT deleting .git
  const gitDir = resolve(ROOT, '.git');
  if (!existsSync(gitDir)) {
    console.warn('WARNING: No .git directory found. Proceeding anyway, but double-check your working directory.');
  }

  return true;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  Clean Install — Safe Rebuild');
console.log('═══════════════════════════════════════════');
console.log('');

safetyCheck();

// 1. Remove node_modules
console.log('-- Removing build artifacts --');
removeIfExists(resolve(ROOT, 'node_modules'));

// 2. Remove dist
removeIfExists(resolve(ROOT, 'dist'));

// 3. Remove coverage
removeIfExists(resolve(ROOT, 'coverage'));

// 4. Remove tmp/ directory
removeIfExists(resolve(ROOT, 'tmp'));

// 5. Remove *.db-wal and *.db-shm files from project root
removeRootFilesBySuffix('.db-wal');
removeRootFilesBySuffix('.db-shm');

console.log('');
console.log('-- Reinstalling dependencies (npm ci) --');
try {
  execSync('npm ci', { cwd: ROOT, stdio: 'inherit', timeout: 300_000 });
} catch (err) {
  console.error('ERROR: npm ci failed.');
  process.exit(1);
}

console.log('');
console.log('-- Verifying platform --');

// 6. Write install marker
console.log('');
console.log('[1/4] write:install-marker');
try {
  execSync('npm run write:install-marker', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch (err) {
  console.error('ERROR: write:install-marker failed.');
  process.exit(1);
}

// 7. Verify install platform
console.log('');
console.log('[2/4] verify:install-platform');
try {
  execSync('npm run verify:install-platform', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch (err) {
  console.error('ERROR: verify:install-platform failed.');
  process.exit(1);
}

// 8. Verify native modules
console.log('');
console.log('[3/4] verify:native');
try {
  execSync('npm run verify:native', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch (err) {
  console.error('ERROR: verify:native failed.');
  process.exit(1);
}

// 9. Run platform doctor
console.log('');
console.log('[4/4] doctor:platform');
try {
  execSync('npm run doctor:platform', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch (err) {
  console.error('ERROR: doctor:platform failed.');
  process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log('  Clean install complete. Platform verified.');
console.log('═══════════════════════════════════════════');