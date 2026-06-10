/**
 * fs-portable.mjs — Cross-platform filesystem utilities for PREDICTION-ENGINE.
 *
 * Uses only Node.js standard library. No shell commands, no platform-specific
 * assumptions. Safe to use in npm scripts, CI, and any Node.js environment.
 */

import { rmSync, existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function safeRmDir(dirPath) {
  if (existsSync(dirPath)) rmSync(dirPath, { recursive: true, force: true });
}

export function safeRmFile(filePath) {
  if (existsSync(filePath)) unlinkSync(filePath);
}

export function safeRmDbFiles(dbPath) {
  safeRmFile(dbPath);
  safeRmFile(dbPath + '-wal');
  safeRmFile(dbPath + '-shm');
}

export function safeCopyFile(src, dest) {
  const destDir = join(dest, '..');
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
}

export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

export function safeRmMatching(dir, pattern) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (pattern.test(entry)) {
      const full = join(dir, entry);
      safeRmFile(full);
    }
  }
}

export function cleanSqliteJournals(dir) {
  safeRmMatching(dir, /\.db-wal$/);
  safeRmMatching(dir, /\.db-shm$/);
  safeRmMatching(dir, /\.db-journal$/);
}