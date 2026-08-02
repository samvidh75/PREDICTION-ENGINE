/**
 * TRACK-P4B-P3 — Query-Schema Compatibility Audit
 * 
 * Scans active production files for obsolete prediction_registry references
 * (health_score, predicted_at, factors, sample_size) and verifies
 * canonical column usage.
 * 
 * Usage: npx tsx scripts/audit-query-schema-compatibility.ts
 */
import fs from 'fs';
import path from 'path';
import { REGISTRY_COLUMNS, OBSOLETE_COLUMNS } from '../src/predictions/PredictionRegistryContract';

const ACTIVE_FILES = [
  'src/backend/web/routes/stockstory.ts',
  'src/backend/web/routes/predictions/explain.ts',
  'src/intelligence/PredictionDiffEngine.ts',
  'src/intelligence/PredictionExplanationEngine.ts',
  'src/predictions/PredictionRegistry.ts',
  'src/predictions/PredictionFactory.ts',
];

let errors = 0;
let warnings = 0;

console.log('=== Query-Schema Compatibility Audit ===\n');

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sqlLikeFragments(source: string): string[] {
  const withoutComments = stripComments(source);
  const fragments: string[] = [];
  const stringLiteralPattern = /`([\s\S]*?)`|'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  for (const match of withoutComments.matchAll(stringLiteralPattern)) {
    const fragment = match[1] ?? match[2] ?? match[3] ?? '';
    if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|JOIN|WHERE|ORDER BY)\b/i.test(fragment)) {
      fragments.push(fragment);
    }
  }
  return fragments;
}

for (const filePath of ACTIVE_FILES) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  WARN: ${filePath} not found (skipping)`);
    warnings++;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const searchableSql = sqlLikeFragments(content).join('\n');

  // Check active query text for obsolete column names.
  const foundObsolete: string[] = [];
  for (const obsolete of OBSOLETE_COLUMNS) {
    const pattern = new RegExp(`\\b${obsolete}\\b`);
    if (pattern.test(searchableSql)) {
      foundObsolete.push(obsolete);
    }
  }

  if (foundObsolete.length > 0) {
    console.error(`  FAIL: ${filePath} references obsolete columns: ${foundObsolete.join(', ')}`);
    errors++;
  } else {
    console.log(`  PASS: ${filePath} — no obsolete column references`);
  }
}

// Verify migration schema has required columns
const migrationPath = path.join(process.cwd(), 'src/db/migrations/008_create_prediction_registry.sql');
if (fs.existsSync(migrationPath)) {
  const migration = fs.readFileSync(migrationPath, 'utf-8');
  const missingCanonical: string[] = [];
  for (const col of REGISTRY_COLUMNS) {
    if (!migration.includes(col)) {
      missingCanonical.push(col);
    }
  }
  if (missingCanonical.length > 0) {
    console.error(`  FAIL: Migration 008 missing columns: ${missingCanonical.join(', ')}`);
    errors++;
  } else {
    console.log(`  PASS: Migration 008 has all ${REGISTRY_COLUMNS.length} canonical columns`);
  }
}

// Verify SQLite schema has required columns
const sqlitePath = path.join(process.cwd(), 'src/db/SQLiteAdapter.ts');
if (fs.existsSync(sqlitePath)) {
  const sqlite = fs.readFileSync(sqlitePath, 'utf-8');
  const predictionRegistrySection = sqlite.match(/prediction_registry[^;]*\([^;]*\)/gi);
  if (predictionRegistrySection) {
    const missing = REGISTRY_COLUMNS.filter(col => {
      // Check if column appears in any prediction_registry CREATE TABLE block
      return !predictionRegistrySection.some(section => section.includes(col));
    });
    if (missing.length > 0) {
      console.error(`  FAIL: SQLiteAdapter prediction_registry missing columns: ${missing.join(', ')}`);
      errors++;
    } else {
      console.log(`  PASS: SQLiteAdapter prediction_registry has canonical columns`);
    }
  } else {
    console.warn(`  WARN: Could not find SQLite prediction_registry CREATE TABLE`);
    warnings++;
  }
}

console.log(`\n=== Compatibility Audit Complete ===`);
console.log(`Errors: ${errors}, Warnings: ${warnings}`);

if (errors > 0) {
  console.error('FAIL: Schema compatibility issues found');
  process.exit(1);
} else {
  console.log('PASS: All active files use canonical prediction_registry columns');
  process.exit(0);
}
