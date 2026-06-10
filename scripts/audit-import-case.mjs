#!/usr/bin/env node
/**
 * audit-import-case.mjs — Validates relative imports match filesystem casing.
 * Scans .ts/.tsx/.js/.jsx/.mjs/.cjs in src/, scripts/, tests/
 * Ignores: node_modules/, dist/, data/, reports/, archives/
 */

import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, relative, parse as parsePath } from 'node:path';
import { cwd } from 'node:process';

const PROJECT_ROOT = resolve(cwd());
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'data', 'reports', 'archives', '.git', 'coverage', 'tmp', 'public', 'deployment']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

let errors = 0;
let checked = 0;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(full, files);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(parsePath(entry.name).ext)) {
      files.push(full);
    }
  }
  return files;
}

function extractRelativeImports(content) {
  const imports = [];
  const regex = /(?:from|require|import)\s*\(?\s*(['"])(\.\.?\/[^'"]+)\1\s*\)?/g;
  let match;
  while ((match = regex.exec(content)) !== null) imports.push(match[2]);
  return imports;
}

function findActualFile(baseDir, importPath) {
  const resolved = resolve(baseDir, importPath);
  if (existsSync(resolved) && statSync(resolved).isFile()) return realpathSync(resolved);
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(resolved + ext) && statSync(resolved + ext).isFile()) return realpathSync(resolved + ext);
  }
  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) {
      const idx = join(resolved, 'index' + ext);
      if (existsSync(idx) && statSync(idx).isFile()) return realpathSync(idx);
    }
  }
  return null;
}

console.log('═══════════════════════════════════════════');
console.log('  Import Case Sensitivity Audit');
console.log('═══════════════════════════════════════════');

const allFiles = [];
for (const dir of ['src', 'scripts', 'tests']) walk(join(PROJECT_ROOT, dir), allFiles);
console.log(`  Scanning ${allFiles.length} source files...\n`);

for (const filePath of allFiles) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { continue; }
  const imports = extractRelativeImports(content);
  for (const imp of imports) {
    checked++;
    const actualFile = findActualFile(dirname(filePath), imp);
    if (!actualFile) { console.log(`WARN  ${relative(PROJECT_ROOT, filePath)}: Cannot resolve '${imp}'`); continue; }
    const impSegments = resolve(dirname(filePath), imp).split('/');
    const actualSegments = actualFile.split('/');
    const projectSegments = PROJECT_ROOT.split('/');
    for (let i = projectSegments.length; i < Math.min(impSegments.length, actualSegments.length); i++) {
      if (impSegments[i] !== actualSegments[i] && impSegments[i].toLowerCase() === actualSegments[i].toLowerCase()) {
        const parsedActual = parsePath(actualFile);
        if (parsedActual.ext && SOURCE_EXTENSIONS.has(parsedActual.ext) && i === actualSegments.length - 1) continue;
        console.log(`FAIL  ${relative(PROJECT_ROOT, filePath)}: '${imp}' → ${impSegments[i]} should be ${actualSegments[i]}`);
        errors++;
        break;
      }
    }
  }
}

console.log(`\n═══════════════════════════════════════════`);
console.log(`  Total imports checked: ${checked}`);
if (errors === 0) { console.log('  RESULT: PASS — All imports have correct filesystem casing'); process.exit(0); }
else { console.log(`  RESULT: FAIL — ${errors} case mismatch(es) found`); process.exit(1); }