#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { platform, arch, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

const ROOT = resolve(cwd());
const MARKER = join(ROOT, 'node_modules', '.stockstory-platform.json');
const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);

if (!existsSync(join(ROOT, 'node_modules'))) {
  console.error('ERROR: node_modules not found.');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

if (!existsSync(MARKER)) {
  console.error('ERROR: No platform install marker found.');
  console.error('Dependencies were installed for a different machine.');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

let marker;
try { marker = JSON.parse(readFileSync(MARKER, 'utf8')); }
catch {
  console.error('ERROR: Corrupted platform install marker.');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

const mismatches = [];
if (marker.platform !== platform) mismatches.push(`platform: ${marker.platform} -> ${platform}`);
if (marker.arch !== arch) mismatches.push(`arch: ${marker.arch} -> ${arch}`);
if (marker.nodeMajor !== major) mismatches.push(`Node: ${marker.nodeMajor} -> ${major}`);

if (mismatches.length > 0) {
  console.error('ERROR: Stale node_modules detected!');
  console.error(`  Installed for: ${marker.platform}/${marker.arch} (Node ${marker.nodeMajor})`);
  console.error(`  Current:       ${platform}/${arch} (Node ${major})`);
  console.error(`  Mismatches: ${mismatches.join(', ')}`);
  console.error('');
  console.error('Dependencies were installed for a different machine.');
  console.error('Run: npm run clean:install');
  process.exit(1);
}

console.log(`OK: node_modules matches ${platform}/${arch} (Node ${major})`);
