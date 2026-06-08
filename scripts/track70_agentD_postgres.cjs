#!/usr/bin/env node
/**
 * TRACK-70 AGENT D — PostgreSQL Reality Audit
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'D-postgres-audit.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Search .env and all relevant files for PG references
const searchTerms = ['DATABASE_URL', 'pg', 'postgres', 'PostgreSQL', 'PGHOST', 'PGDATABASE',
  'PGUSER', 'PGPASSWORD', 'PGPORT', 'pg.Client', 'pg.Pool', 'createPool'];
const findings = { files: [], totalPgRefs: 0, totalPgImportRefs: 0 };

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') continue;
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { searchDir(full); continue; }
      const ext = path.extname(entry);
      if (!['.ts', '.js', '.sql', '.env', '.cjs', '.mjs', '.json', '.yml', '.yaml', '.md', '.example', '.config', '.cfg'].includes(ext) && !entry.startsWith('.env')) continue;
      const content = fs.readFileSync(full, 'utf-8');
      const fileMatches = [];
      for (const term of searchTerms) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
          const count = (content.match(new RegExp(term, 'gi')) || []).length;
          fileMatches.push({ term, count });
        }
      }
      if (fileMatches.length > 0) {
        findings.files.push({ file: path.relative(ROOT, full).replace(/\\/g, '/'), matches: fileMatches });
        findings.totalPgRefs += fileMatches.reduce((s, m) => s + m.count, 0);
        if (content.includes('require(\'pg\')') || content.includes('from \'pg\'') || content.includes('require("pg")') || content.includes('from "pg"')) {
          findings.totalPgImportRefs += 1;
        }
      }
    } catch(e) { /* skip unreadable */ }
  }
}
searchDir(ROOT);

// Check .env specifically
const envPath = path.join(ROOT, '.env');
let envHasPg = false;
let envDbUrl = null;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envHasPg = /DATABASE_URL|postgres|pg/i.test(envContent);
  const m = envContent.match(/DATABASE_URL\s*=\s*(.+)/);
  if (m) envDbUrl = m[1].trim();
}

// Check production env example
const prodEnvPath = path.join(ROOT, '.env.production.example');
let prodEnvHasPg = false;
if (fs.existsSync(prodEnvPath)) {
  prodEnvHasPg = /DATABASE_URL|postgres|pg/i.test(fs.readFileSync(prodEnvPath, 'utf-8'));
}

// Check SQLiteAdapter
const sqliteAdapterPath = path.join(ROOT, 'src', 'db', 'SQLiteAdapter.ts');
let sqliteAdapterExists = fs.existsSync(sqliteAdapterPath);
let hasPgSwitch = false;
if (sqliteAdapterExists) {
  hasPgSwitch = /pg|postgres|DATABASE_URL/i.test(fs.readFileSync(sqliteAdapterPath, 'utf-8'));
}

// Check db/index.ts
const dbIndexPath = path.join(ROOT, 'src', 'db', 'index.ts');
let dbIndexHasPg = false;
if (fs.existsSync(dbIndexPath)) {
  dbIndexHasPg = /pg|postgres|DATABASE_URL/i.test(fs.readFileSync(dbIndexPath, 'utf-8'));
}

// Check package.json for pg dependency
const pkgPath = path.join(ROOT, 'package.json');
let hasPgDep = false;
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  hasPgDep = !!(pkg.dependencies?.pg || pkg.devDependencies?.pg);
}

const report = `# TRACK-70 Agent D — PostgreSQL Reality Audit

**Generated:** ${new Date().toISOString()}

## 1. Is PostgreSQL installed as a dependency?

- **pg package in package.json:** ${hasPgDep ? '✓ YES' : '✗ NO'}

## 2. Environment Configuration

- **.env has DATABASE_URL or postgres references:** ${envHasPg ? '✓ YES' : '✗ NO'}
- **DATABASE_URL value:** \`${envDbUrl || 'Not set'}\`
- **.env.production.example has PG refs:** ${prodEnvHasPg ? '✓ YES' : '✗ NO'}

## 3. Database Adapter Layer

- **SQLiteAdapter.ts exists:** ${sqliteAdapterExists ? '✓ YES' : '✗ NO'}
- **SQLiteAdapter has PG switching capability:** ${hasPgSwitch ? '✓ YES' : '✗ NO'}
- **db/index.ts has PG references:** ${dbIndexHasPg ? '✓ YES' : '✗ NO'}

## 4. Codebase References ($-pg/postgres/DATABASE_URL)

- **Files with PG references:** ${findings.files.length}
- **Total PG-related text matches:** ${findings.totalPgRefs}
- **Files that import 'pg' package:** ${findings.totalPgImportRefs}

${findings.files.map(f => `- **\`${f.file}\`** — ${f.matches.map(m => m.term + ' (' + m.count + ')').join(', ')}`).join('\n')}

## Verdict

### Is PostgreSQL actually active?
${envDbUrl ? 'A DATABASE_URL pointing to PostgreSQL is CONFIGURED in .env.' : 'NO PostgreSQL URL configured in .env.'}
${hasPgDep ? 'pg package IS a dependency.' : 'pg package is NOT a dependency.'}
${findings.totalPgImportRefs > 0 ? findings.totalPgImportRefs + ' files actively import the pg package.' : 'No files actively import the pg package.'}

**Assessment: PostgreSQL is ${envDbUrl && hasPgDep ? 'LIKELY CONFIGURED BUT NOT ACTIVE' : 'NOT ACTIVE'} — SQLite is the current runtime database.**

### Is code capable of switching?
${hasPgSwitch ? 'SQLiteAdapter.ts CONTAINS PG switching logic.' : 'SQLiteAdapter.ts does NOT contain PG switching logic.'}
${dbIndexHasPg ? 'db/index.ts references PG.' : 'db/index.ts does not reference PG.'}

### Exact migration remaining
${hasPgDep && hasPgSwitch ? 'Code is ready for PG. Migration: run schema migrations against PG, switch DATABASE_URL, restart.' : 'Code needs: 1) Add pg package dependency, 2) Write PG adapter, 3) Add DATABASE_URL to .env, 4) Run migrations against PG, 5) Add DB switch logic to db/index.ts'}
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent D report written to ${REPORT_PATH}`);
console.log(`Files with PG refs: ${findings.files.length}, PG import refs: ${findings.totalPgImportRefs}`);
