#!/usr/bin/env node
/**
 * Bootstrap Development — one-command setup for PREDICTION-ENGINE.
 *
 * Usage: npm run bootstrap:dev
 *
 * 1. Print platform and architecture
 * 2. Verify Node >= 20
 * 3. Verify npm available
 * 4. Verify package-lock exists
 * 5. Detect stale/copied node_modules
 * 6. Run npm ci if needed
 * 7. Run platform doctor
 * 8. Run native verifier
 * 9. Print next commands
 * 10. Never print secrets
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { platform, arch, version as nodeVersion, cwd } from 'node:process';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(cwd());
const PASS = '\u2705';
const FAIL = '\u274C';
const WARN = '\u26A0\uFE0F';

let errors = 0;

function check(label, ok) {
  if (ok) {
    console.log(`${PASS} ${label}`);
  } else {
    console.log(`${FAIL} ${label}`);
    errors++;
  }
}

console.log('═'.repeat(50));
console.log('  PREDICTION-ENGINE Bootstrap');
console.log('═'.repeat(50));
console.log(`  Platform:    ${platform}`);
console.log(`  Architecture: ${arch}`);
console.log(`  Node.js:     ${nodeVersion}`);
console.log('');

// Step 1: Verify Node >= 20
const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);
check(`Node.js >= 20 (got ${major})`, major >= 20);

// Step 2: Verify npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8', timeout: 10_000 }).trim();
  console.log(`${PASS} npm available: v${npmVersion}`);
} catch {
  console.log(`${FAIL} npm not available`);
  errors++;
}

// Step 3: Verify package-lock.json
const lockPath = join(ROOT, 'package-lock.json');
check('package-lock.json exists', existsSync(lockPath));

// Step 4: Detect stale node_modules
const markerPath = join(ROOT, 'node_modules', '.platform-install.json');
const nodeModulesExists = existsSync(join(ROOT, 'node_modules'));
let needsInstall = !nodeModulesExists;

if (nodeModulesExists && existsSync(markerPath)) {
  try {
    const marker = JSON.parse(readFileSync(markerPath, 'utf8'));
    if (marker.platform !== platform || marker.arch !== arch || marker.nodeMajor !== major) {
      console.log(`${WARN} node_modules was installed on ${marker.platform}/${marker.arch} (Node ${marker.nodeMajor})`);
      console.log(`${WARN} Current: ${platform}/${arch} (Node ${major}) — MISMATCH`);
      needsInstall = true;
    } else {
      console.log(`${PASS} node_modules platform matches (${platform}/${arch})`);
    }
  } catch {
    needsInstall = true;
  }
} else if (!nodeModulesExists) {
  console.log(`${WARN} node_modules not found`);
  needsInstall = true;
}

// Step 5: Install if needed
if (needsInstall) {
  console.log('');
  console.log('── Installing dependencies (npm ci) ──');
  try {
    execSync('npm ci', { cwd: ROOT, stdio: 'inherit', timeout: 300_000 });
    console.log(`${PASS} npm ci completed`);
  } catch {
    console.log(`${FAIL} npm ci failed`);
    errors++;
  }
}

// Step 6: Run platform doctor
console.log('');
console.log('── Running platform doctor ──');
try {
  execSync('npm run doctor:platform', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch {
  errors++;
}

// Step 7: Run native verifier
console.log('');
console.log('── Running native verifier ──');
try {
  execSync('npm run verify:native', { cwd: ROOT, stdio: 'inherit', timeout: 30_000 });
} catch {
  errors++;
}

// Step 8: Write platform marker
try {
  const markerDir = join(ROOT, 'node_modules');
  if (!existsSync(markerDir)) {
    require('node:fs').mkdirSync(markerDir, { recursive: true });
  }
  require('node:fs').writeFileSync(markerPath, JSON.stringify({
    platform,
    arch,
    nodeMajor: major,
    installedAt: new Date().toISOString(),
  }, null, 2));
} catch {}

// Step 9: Print next commands
console.log('');
console.log('═'.repeat(50));
if (errors === 0) {
  console.log('  RESULT: PASS — Development environment ready');
  console.log('═'.repeat(50));
  console.log('');
  console.log('Next commands:');
  console.log('  npm run dev              Start Vite dev server');
  console.log('  npm run start:dev        Start backend server');
  console.log('  npm run test:unit        Run unit tests');
  console.log('  npm run test:integration:sqlite  Run SQLite integration tests');
  process.exit(0);
} else {
  console.log(`  RESULT: FAIL — ${errors} check(s) failed`);
  console.log('═'.repeat(50));
  console.log('');
  console.log('Try: npm run clean:install');
  process.exit(1);
}
