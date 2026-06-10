#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { platform, arch, version as nodeVersion } from 'node:process';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { execSync } from 'node:child_process';

const ROOT = resolve(cwd());
const MARKER = join(ROOT, 'node_modules', '.stockstory-platform.json');

let npmV = 'unknown';
try { npmV = execSync('npm --version', { encoding: 'utf8', timeout: 10000 }).trim(); } catch (e) {}

const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);

const marker = { platform, arch, nodeMajor: major, npmVersion: npmV, installedAt: new Date().toISOString() };

mkdirSync(join(ROOT, 'node_modules'), { recursive: true });
writeFileSync(MARKER, JSON.stringify(marker, null, 2));
console.log(`Platform marker written: ${platform}/${arch} Node ${major}`);
