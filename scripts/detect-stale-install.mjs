#!/usr/bin/env node
/**
 * detect-stale-install.mjs — Compares the platform marker to current machine.
 * Reads node_modules/.stockstory-platform.json and checks platform, arch, nodeMajor.
 * On mismatch: advises clean:install and exits 1. On match: prints OK and exits 0.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd, platform, arch, version as nodeVersion } from 'node:process';

const ROOT = resolve(cwd());
const MARKER = join(ROOT, 'node_modules', '.stockstory-platform.json');

if (!existsSync(MARKER)) {
  console.log('STALE  No platform marker found. Dependencies may not be installed.');
  console.log('Dependencies were installed for a different machine. Run: npm run clean:install');
  process.exit(1);
}

let marker;
try {
  marker = JSON.parse(readFileSync(MARKER, 'utf8'));
} catch (e) {
  console.log(`STALE  Failed to parse platform marker: ${e.message}`);
  console.log('Dependencies were installed for a different machine. Run: npm run clean:install');
  process.exit(1);
}

const currentNodeMajor = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);
const mismatches = [];

if (marker.platform !== platform) mismatches.push(`platform: ${marker.platform} → ${platform}`);
if (marker.arch !== arch) mismatches.push(`arch: ${marker.arch} → ${arch}`);
if (marker.nodeMajor !== currentNodeMajor) mismatches.push(`nodeMajor: ${marker.nodeMajor} → ${currentNodeMajor}`);

if (mismatches.length > 0) {
  console.log('STALE  Dependencies were installed for a different machine.');
  for (const m of mismatches) console.log(`  Mismatch: ${m}`);
  console.log('Dependencies were installed for a different machine. Run: npm run clean:install');
  process.exit(1);
}

console.log(`OK  Platform matches: ${platform}/${arch} Node ${currentNodeMajor}`);
process.exit(0);