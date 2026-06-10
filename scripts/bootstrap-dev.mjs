#!/usr/bin/env node
/**
 * bootstrap-dev.mjs — One-command dev environment setup and health check.
 *
 * Usage: node scripts/bootstrap-dev.mjs
 *
 * Steps:
 *  1. Print platform/arch from node:process
 *  2. Verify Node >= 20
 *  3. Verify npm is available
 *  4. Verify package-lock.json exists
 *  5. If node_modules missing → run `npm ci`
 *  6. Check platform marker file against current platform/arch/Node major
 *     If mismatched → instruct user to run `npm run clean:install` and exit 1
 *  7. Run `npm run write:install-marker`
 *  8. Run `npm run doctor:platform`
 *  9. Run `npm run verify:native`
 * 10. Print useful next commands
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { platform, arch, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { cwd, exit } from 'node:process';

// ── Helpers ────────────────────────────────────────────────────────────────

const ROOT = resolve(cwd());
const MARKER_PATH = join(ROOT, 'node_modules', '.stockstory-platform.json');

function fmt(cmd) {
  return `\x1b[1m\x1b[36m${cmd}\x1b[0m`;
}

function step(label) {
  console.log(`\n── ${label} ──`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}

function fail(msg) {
  console.error(`\n  ✗ ${msg}`);
}

function run(cmd, label) {
  // label is optional — used for display when the script name differs from the command
  const display = label || cmd;
  console.log(`  → Running ${fmt(cmd)}…`);
  try {
    execSync(cmd, { encoding: 'utf8', stdio: 'inherit', cwd: ROOT });
    ok(`${display} completed`);
  } catch {
    fail(`${display} failed`);
    exit(1);
  }
}

// ── 1. Print platform info ─────────────────────────────────────────────────

console.log('══ Bootstrap Dev ══');
console.log(`  Platform : ${platform}`);
console.log(`  Arch     : ${arch}`);
console.log(`  Node     : ${nodeVersion}`);

// ── 2. Check Node >= 20 ────────────────────────────────────────────────────

step('Node version');
const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);
if (major >= 20) {
  ok(`Node ${major}.x — supported`);
} else {
  fail(`Node ${major}.x detected, but >= 20 is required. Upgrade Node and retry.`);
  exit(1);
}

// ── 3. Check npm available ─────────────────────────────────────────────────

step('npm check');
let npmVersion = 'unknown';
try {
  npmVersion = execSync('npm --version', { encoding: 'utf8', timeout: 15_000, cwd: ROOT }).trim();
  ok(`npm v${npmVersion}`);
} catch {
  fail('npm is not available. Install npm and retry.');
  exit(1);
}

// ── 4. Check package-lock.json exists ──────────────────────────────────────

step('package-lock.json');
if (existsSync(join(ROOT, 'package-lock.json'))) {
  ok('package-lock.json found');
} else {
  fail('package-lock.json is missing. Run npm install to generate it, then retry.');
  exit(1);
}

// ── 5. Check node_modules / run npm ci if missing ──────────────────────────

step('node_modules');
if (existsSync(join(ROOT, 'node_modules'))) {
  ok('node_modules exists');
} else {
  warn('node_modules not found');
  run('npm ci', 'npm ci');
}

// ── 6. Platform marker match ───────────────────────────────────────────────

step('Platform marker');

if (!existsSync(MARKER_PATH)) {
  fail('No platform install marker found.');
  console.error('  Dependencies were installed for a different machine or marker was deleted.');
  console.error(`  Run: ${fmt('npm run clean:install')}`);
  exit(1);
}

let marker;
try {
  marker = JSON.parse(readFileSync(MARKER_PATH, 'utf8'));
} catch {
  fail('Corrupted platform install marker.');
  console.error(`  Run: ${fmt('npm run clean:install')}`);
  exit(1);
}

const mismatches = [];
if (marker.platform !== platform) mismatches.push(`platform: ${marker.platform} → ${platform}`);
if (marker.arch !== arch) mismatches.push(`arch: ${marker.arch} → ${arch}`);
if (marker.nodeMajor !== major) mismatches.push(`Node major: ${marker.nodeMajor} → ${major}`);

if (mismatches.length > 0) {
  fail('Stale node_modules detected — platform marker mismatch!');
  console.error(`  Installed for : ${marker.platform}/${marker.arch} (Node ${marker.nodeMajor})`);
  console.error(`  Current       : ${platform}/${arch} (Node ${major})`);
  console.error(`  Differences   : ${mismatches.join('; ')}`);
  console.error('');
  console.error('  Dependencies were installed for a different machine.');
  console.error(`  Run: ${fmt('npm run clean:install')}`);
  exit(1);
}

ok(`Platform marker matches: ${platform}/${arch} (Node ${major})`);

// ── 7. Write install marker ────────────────────────────────────────────────

step('Write install marker');
run('npm run write:install-marker');

// ── 8. Platform doctor ─────────────────────────────────────────────────────

step('Platform doctor');
run('npm run doctor:platform');

// ── 9. Verify native modules ───────────────────────────────────────────────

step('Verify native modules');
run('npm run verify:native');

// ── 10. Print next commands ────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════');
console.log('  Dev environment is ready!');
console.log('══════════════════════════════════════════');
console.log('');
console.log('  Next commands:');
console.log(`    ${fmt('npm run dev')}              — Start Vite dev server`);
console.log(`    ${fmt('npm run start:dev')}        — Start backend dev server (tsx)`);
console.log(`    ${fmt('npm run test:unit')}        — Run unit tests (vitest)`);
console.log(`    ${fmt('npm run test:watch')}       — Run tests in watch mode`);
console.log(`    ${fmt('npm run test:coverage')}    — Run tests with coverage`);
console.log(`    ${fmt('npm run build')}            — Typecheck + Vite build`);
console.log(`    ${fmt('npm run lint')}             — ESLint check`);
console.log(`    ${fmt('npm run lint:fix')}         — ESLint auto-fix`);
console.log(`    ${fmt('npm run validate:portability')} — Full portability check`);
console.log(`    ${fmt('npm run release:gate')}     — Pre-release gate`);
console.log('');