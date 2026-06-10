#!/usr/bin/env node
/**
 * clean-install.mjs — Cleans and reinstalls dependencies from scratch.
 * Removes: node_modules, dist, coverage (Node fs APIs only).
 * Then runs sequentially via execSync: npm ci, write:install-marker,
 * verify:install-platform, verify:no-native-app-deps, verify:native,
 * doctor:platform. Prints each step.
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());

function step(label, cmd, opts = {}) {
  console.log(`\n--- ${label} ---`);
  if (cmd) {
    try {
      const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', cwd: ROOT, ...opts });
      if (output.trim()) console.log(output.trim());
    } catch (e) {
      if (e.stdout) console.log(e.stdout.trim());
      if (e.stderr) console.error(e.stderr.trim());
      throw new Error(`${label} failed with code ${e.status}`);
    }
  }
  console.log(`✓ ${label} complete`);
}

const dirsToRemove = ['node_modules', 'dist', 'coverage'];

console.log('══ Clean Install ══');

// Step 1: Remove dirs
for (const dir of dirsToRemove) {
  const fullPath = join(ROOT, dir);
  if (existsSync(fullPath)) {
    process.stdout.write(`Removing ${dir}... `);
    rmSync(fullPath, { recursive: true, force: true });
    console.log('done');
  } else {
    console.log(`${dir} not present, skipping`);
  }
}

// Step 2: npm ci
step('npm ci', 'npm ci');

// Step 3: write install marker
step('write:install-marker', 'npm run write:install-marker');

// Step 4: verify install platform
step('verify:install-platform', 'npm run verify:install-platform');

// Step 5: verify no native app deps
step('verify:no-native-app-deps', 'npm run verify:no-native-app-deps');

// Step 6: verify native
step('verify:native', 'npm run verify:native');

// Step 7: doctor platform
step('doctor:platform', 'npm run doctor:platform');

console.log('\n══ Clean Install Complete ══');
process.exit(0);