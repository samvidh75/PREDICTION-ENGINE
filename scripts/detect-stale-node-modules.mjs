#!/usr/bin/env node
/**
 * Detect Stale node_modules — prevents running with copied/Wrong-platform binaries.
 *
 * Compares the .platform-install.json marker in node_modules against the
 * current platform, architecture, and Node.js major version.
 *
 * Exits non-zero with a clear error message if a mismatch is detected.
 */

import { existsSync, readFileSync } from 'node:fs';
import { platform, arch, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());
const MARKER = join(ROOT, 'node_modules', '.platform-install.json');
const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);

if (!existsSync(join(ROOT, 'node_modules'))) {
  console.error('ERROR: node_modules not found. Run: npm ci');
  process.exit(1);
}

if (!existsSync(MARKER)) {
  console.error('WARNING: No platform install marker found.');
  console.error('node_modules may have been copied from another machine.');
  console.error('');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

let marker;
try {
  marker = JSON.parse(readFileSync(MARKER, 'utf8'));
} catch {
  console.error('ERROR: Corrupted platform install marker.');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

const mismatches = [];
if (marker.platform !== platform) mismatches.push(`platform: ${marker.platform} → ${platform}`);
if (marker.arch !== arch) mismatches.push(`arch: ${marker.arch} → ${arch}`);
if (marker.nodeMajor !== major) mismatches.push(`Node major: ${marker.nodeMajor} → ${major}`);

if (mismatches.length > 0) {
  console.error('ERROR: Stale node_modules detected!');
  console.error(`  Installed for: ${marker.platform}/${marker.arch} (Node ${marker.nodeMajor})`);
  console.error(`  Current:       ${platform}/${arch} (Node ${major})`);
  console.error(`  Mismatches: ${mismatches.join(', ')}`);
  console.error('');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

console.log(`OK: node_modules matches ${platform}/${arch} (Node ${major})`);
process.exit(0);
