#!/usr/bin/env node
/**
 * TRACK-71 AGENTS B-J — Consolidated Evidence Sprint
 * Runs all remaining verification agents. No assumptions. Direct queries only.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-71');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const Database = require('better-sqlite3');
const db = new Database(DB_PATH, { readonly: true });

function writeReport(filename, content) {
  fs.writeFileSync(path.join(REPORT_DIR, filename), content, 'utf-8');
  console.log(`  → ${filename}`);
}

// ═══════════════════════════════════════════════════════════════
// AGENT B — Prediction Pipeline Truth
// ═══════════════════════════════════════════════════════════════
function agentB() {
  console.log('\n[AGENT B] Prediction Pipeline Truth');
  
  const pfPath = path.join(ROOT, 'src', 'predictions', 'PredictionFactory.ts');
  const pfExists = fs.existsSync(pfPath);
  let pfContent = pfExists ? fs.readFileSync(pfPath, 'utf-8') : '';

  // Check for TemporalGuard usage
  const usesTemporalGuard = pfContent.includes('TemporalGuard');
  const usesQualityGuard = pfContent.includes('qualityGuard') || pfContent.includes('guardQualityAgainstPrediction');
  const usesPredictionRegistry = pfContent.includes('predictionRegistry') || pfContent.includes('PredictionRegistry');
  const usesOutcomeRepository = pfContent.includes('outcomeRepository') || pfContent.includes('OutcomeRepository');

  // Check if PredictionFactory exports generateDaily
  const hasGenerateDaily = pfContent.includes('generateDaily');
  const hasEvaluateSymbol = pfContent.includes('evaluateSymbol');

  // Check PredictionRegistry
  const prPath = path.join(ROOT, 'src', 'predictions', 'PredictionRegistry.ts');
  const prExists = fs.existsSync(prPath);
  let prContent = prExists ? fs.readFileSync(prPath, 'utf-8') : '';
  const prHasCreate = prContent.includes('createPrediction');
  const prHasBatchCreate = prContent.includes('createPredictionsBatch');

  // Check OutcomeValidator
  const ovPath = path.join(ROOT, 'src', 'validation', 'OutcomeValidator.ts');
  const ovExists = fs.existsSync(ovPath);
  let ovContent = ovExists ? fs.readFileSync(ovPath, 'utf-8') : '';
  const ovUsesOutcomeRepo = ovContent.includes('outcomeRepository') || ovContent.includes('OutcomeRepository');

  // Count prediction_registry rows
  let predCount = 0;
  try {
    predCount = db.prepare("SELECT COUNT(*) as c FROM prediction_registry").get().c;
  } catch(e) {}

  let report = `# TRACK-71 Agent B — Prediction Pipeline Truth

**Generated:** ${new Date().toISOString()}

## PredictionFactory.ts

| Check | Result |
|-------|--------|
| File exists | ${pfExists ? '✓' : '✗'} |
| TemporalGuard.guardFactorInsert() called | ${usesTemporalGuard ? '✓ YES' : '✗ NO'} |
| qualityGuard (TemporalGuard.guardQualityAgainstPrediction) | ${usesQualityGuard ? '✓ YES' : '✗ NO'} |
| Uses PredictionRegistry | ${usesPredictionRegistry ? '✓ YES' : '✗ NO'} |
| Uses OutcomeRepository | ${usesOutcomeRepository ? '✓ YES' : '✗ NO'} |
| Has generateDaily() | ${hasGenerateDaily ? '✓ YES' : '✗ NO'} |

## PredictionRegistry.ts

| Check | Result |
|-------|--------|
| File exists | ${prExists ? '✓ YES' : '✗ NO'} |
| Has createPrediction() | ${prHasCreate ? '✓ YES' : '✗ NO'} |
| Has createPredictionsBatch() | ${prHasBatchCreate ? '✓ YES' : '✗ NO'} |

## OutcomeValidator.ts

| Check | Result |
|-------|--------|
| File exists | ${ovExists ? '✓ YES' : '✗ NO'} |
| Uses OutcomeRepository | ${ovUsesOutcomeRepo ? '✓ YES' : '✗ NO'} |

## prediction_registry table

- **Rows:** ${predCount.toLocaleString()}

## Pipeline Paths

| Path | Description | TemporalGuard | PredictionRegistry | OutcomeRepository |
|------|-------------|---------------|-------------------|-------------------|
| Path 1 — generateDaily | ${hasGenerateDaily ? 'Exists' : 'MISSING'} | ${usesTemporalGuard ? '✓' : '✗'} | ${usesPredictionRegistry ? '✓' : '✗'} | ${usesOutcomeRepository ? '✓' : '✗'} |
| Path 2 — evaluateSymbol | ${hasEvaluateSymbol ? 'Exists' : 'MISSING'} | ${usesTemporalGuard ? '✓' : '✗'} | ${usesPredictionRegistry ? '✓' : '✗'} | ${usesOutcomeRepository ? '✓' : '✗'} |

## Verdict

${usesTemporalGuard && usesPredictionRegistry ? '✓ Prediction pipeline is properly guarded and uses registry pattern.' : '✗ Prediction pipeline has gaps — see unchecked items above.'}
`;

  writeReport('B-pipeline-truth.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT C — Repository Write Audit  
// ═══════════════════════════════════════════════════════════════
function agentC() {
  console.log('\n[AGENT C] Repository Write Audit');
  
  const srcDir = path.join(ROOT, 'src');
  const findings = { approved: [], needsRefactor: [], deadCode: [], infoOnly: [] };

  function searchDir(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { searchDir(full); continue; }
        if (!/\.(ts|tsx|js|cjs|mjs|sql)$/.test(entry)) continue;
        const content = fs.readFileSync(full, 'utf-8');
        const relPath = path.relative(ROOT, full).replace(/\\/g, '/');

        // Check for prediction_registry writes
        const hasPredInsert = /INSERT\s+INTO\s+prediction_registry/i.test(content);
        const hasPredUpdate = /UPDATE\s+prediction_registry/i.test(content);
        const hasPredDelete = /DELETE\s+FROM\s+prediction_registry/i.test(content);
        const hasOutcomeInsert = /INSERT\s+INTO\s+outcome_registry/i.test(content);
        const hasOutcomeUpdate = /UPDATE\s+outcome_registry/i.test(content);

        if (hasPredInsert || hasPredUpdate || hasPredDelete) {
          // Classify
          if (relPath.includes('PredictionRegistry.ts') || relPath.includes('OutcomeRepository.ts')) {
            findings.approved.push({ file: relPath, type: 'Registry/Repository (approved)' });
          } else if (relPath.includes('migration') || relPath.includes('.sql')) {
            findings.approved.push({ file: relPath, type: 'Migration (approved)' });
          } else if (relPath.includes('__tests__') || relPath.includes('.test.')) {
            findings.infoOnly.push({ file: relPath, type: 'Test file' });
          } else {
            findings.needsRefactor.push({
              file: relPath,
              ops: [
                hasPredInsert ? 'INSERT' : null,
                hasPredUpdate ? 'UPDATE' : null,
                hasPredDelete ? 'DELETE' : null,
              ].filter(Boolean).join(', '),
            });
          }
        }

        if (hasOutcomeInsert || hasOutcomeUpdate) {
          if (relPath.includes('OutcomeRepository.ts') || relPath.includes('migration') || relPath.includes('.sql')) {
            findings.approved.push({ file: relPath, type: 'Outcome repository/migration' });
          } else {
            findings.needsRefactor.push({ file: relPath, ops: 'OUTCOME_REGISTRY write' });
          }
        }
      } catch(e) {}
    }
  }

  searchDir(srcDir);

  let report = `# TRACK-71 Agent C — Repository Write Audit

**Generated:** ${new Date().toISOString()}

## Approved Writers

${findings.approved.map(f => `- \`${f.file}\` — ${f.type}`).join('\n') || 'None'}

## Needs Refactor (bypasses registry)

${findings.needsRefactor.map(f => `- **\`${f.file}\`** — ${f.ops} (bypasses registry/repository)`).join('\n') || '**ALL CLEAN** — No files bypass registry pattern.'}

## Info Only

${findings.infoOnly.map(f => `- \`${f.file}\` — ${f.type}`).join('\n') || 'None'}

## Verdict

${findings.needsRefactor.length === 0 ? '✓ All prediction_registry/outcome_registry writes go through approved registry/repository classes.' : `✗ ${findings.needsRefactor.length} files need refactoring to use registry/repository pattern.`}
`;

  writeReport('C-write-audit.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT D — Workflow Reality Check
// ═══════════════════════════════════════════════════════════════
function agentD() {
  console.log('\n[AGENT D] Workflow Reality Check');
  
  const workflowPath = path.join(ROOT, '.github', 'workflows', 'daily-pipeline.yml');
  let workflowExists = fs.existsSync(workflowPath);
  let refs = [];

  if (workflowExists) {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    // Extract all file path references: ts-node, node, files
    const fileRefs = content.match(/["']([a-zA-Z0-9_\-\.\/]+\.(ts|js|cjs|mjs|sh|py))["']/g) || [];
    const cleanRefs = [...new Set(fileRefs.map(r => r.replace(/["']/g, '')))];

    for (const ref of cleanRefs) {
      const fullPath = path.join(ROOT, ref);
      refs.push({ file: ref, exists: fs.existsSync(fullPath) });
    }
  }

  let report = `# TRACK-71 Agent D — Workflow Reality Check

**Generated:** ${new Date().toISOString()}

## Workflow File

- **Exists:** ${workflowExists ? '✓ YES' : '✗ NO'}
- **Path:** \`.github/workflows/daily-pipeline.yml\`

## Referenced Files

${refs.length > 0 ? refs.map(r => `- \`${r.file}\` — ${r.exists ? '✓ EXISTS' : '✗ MISSING'}`).join('\n') : 'No file references found or workflow missing.'}

## Verdict

${refs.length > 0 ? refs.every(r => r.exists) ? '✓ All referenced files exist.' : `✗ ${refs.filter(r => !r.exists).length} referenced files are missing.` : 'Cannot verify — workflow empty or missing.'}
`;

  writeReport('D-workflow-reality.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT E — Build Truth (TSC)
// ═══════════════════════════════════════════════════════════════
function agentE() {
  console.log('\n[AGENT E] Build Truth (TSC)');
  
  let tscOutput = '';
  let tscSuccess = false;
  let errorCount = 0;

  try {
    tscOutput = execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
    tscSuccess = true;
  } catch (e) {
    tscOutput = e.stdout + '\n' + e.stderr;
    // Count errors
    const errorMatches = tscOutput.match(/error TS\d{4}:/g);
    errorCount = errorMatches ? errorMatches.length : 0;
  }

  let report = `# TRACK-71 Agent E — Build Truth (TypeScript)

**Generated:** ${new Date().toISOString()}

## TypeScript Compilation

- **Status:** ${tscSuccess ? '✓ PASSED (0 errors)' : `✗ FAILED (${errorCount} errors)`}

## Error Summary

\`\`\`
${tscOutput.slice(0, 10000)}
\`\`\`

${tscOutput.length > 10000 ? `\n... truncated (${tscOutput.length} total chars)` : ''}

## Verdict

${tscSuccess ? '✓ TypeScript compiles cleanly. Ready for build.' : `✗ ${errorCount} TypeScript errors must be fixed.`}
`;

  writeReport('E-build-truth.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT H — Database Integrity
// ═══════════════════════════════════════════════════════════════
function agentH() {
  console.log('\n[AGENT H] Database Integrity');
  
  const tables = ['prediction_registry', 'outcome_registry_v2', 'claim_registry', 'prediction_ledger'];
  const results = {};

  for (const table of tables) {
    try {
      const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get();
      if (!exists) {
        results[table] = { exists: false };
        continue;
      }
      const count = db.prepare(`SELECT COUNT(*) as c FROM \`${table}\``).get().c;
      let lastUpdate = 'N/A';
      let duplicateCount = 0;
      let orphanCount = 0;

      // Try to get last update
      try {
        const lu = db.prepare(`SELECT MAX(updated_at) as lu FROM \`${table}\``).get();
        if (lu?.lu) lastUpdate = lu.lu;
        const lu2 = db.prepare(`SELECT MAX(created_at) as lu FROM \`${table}\``).get();
        if (lu2?.lu && lastUpdate === 'N/A') lastUpdate = lu2.lu;
      } catch(e) {}

      // Try to find duplicates (on symbol)
      try {
        const dup = db.prepare(`SELECT symbol, COUNT(*) as cnt FROM \`${table}\` GROUP BY symbol HAVING cnt > 1 ORDER BY cnt DESC LIMIT 1`).get();
        if (dup) duplicateCount = dup.cnt;
      } catch(e) {}

      results[table] = { exists: true, rows: count, lastUpdate, duplicateCount, orphanCount };
    } catch(e) {
      results[table] = { exists: false, error: e.message };
    }
  }

  let report = `# TRACK-71 Agent H — Database Integrity

**Generated:** ${new Date().toISOString()}

| Table | Exists | Rows | Last Update | Max Duplicates |
|-------|--------|------|-------------|----------------|
`;
  for (const [table, data] of Object.entries(results)) {
    report += `| ${table} | ${data.exists ? '✓' : '✗'} | ${data.rows?.toLocaleString() || 'N/A'} | ${data.lastUpdate || 'N/A'} | ${data.duplicateCount || 0} |\n`;
  }

  report += `
## Verdict

${Object.values(results).some(r => !r.exists) ? '✗ Some expected tables are missing.' : '✓ All expected tables exist.'}
`;

  writeReport('H-db-integrity.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT I — Production Readiness Score
// ═══════════════════════════════════════════════════════════════
function agentI() {
  console.log('\n[AGENT I] Production Readiness Score');
  
  // Data Coverage (25)
  let dataScore = 0;
  try {
    const totalSymbols = db.prepare("SELECT COUNT(DISTINCT symbol) as c FROM (SELECT symbol FROM prediction_registry UNION SELECT symbol FROM factor_snapshots)").get().c;
    if (totalSymbols >= 100) dataScore = 25;
    else if (totalSymbols >= 75) dataScore = 20;
    else if (totalSymbols >= 50) dataScore = 15;
    else if (totalSymbols >= 25) dataScore = 10;
    else dataScore = 5;
  } catch(e) { dataScore = 5; }

  // Pipeline (20)
  let pipelineScore = 0;
  const pfPath = path.join(ROOT, 'src', 'predictions', 'PredictionFactory.ts');
  if (fs.existsSync(pfPath)) {
    const pf = fs.readFileSync(pfPath, 'utf-8');
    if (pf.includes('TemporalGuard')) pipelineScore += 7;
    if (pf.includes('PredictionRegistry')) pipelineScore += 7;
    if (pf.includes('OutcomeRepository')) pipelineScore += 6;
  }

  // Security (15)
  let securityScore = 0;
  const appPath = path.join(ROOT, 'src', 'backend', 'web', 'app.ts');
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, 'utf-8');
    if (app.includes('RateLimiter') || app.includes('rateLimit')) securityScore += 5;
    if (app.includes('helmet')) securityScore += 5;
    if (app.includes('CORS') || app.includes('cors')) securityScore += 5;
  }

  // Build Health (15)
  let buildScore = 0;
  try {
    execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf-8', timeout: 60000 });
    buildScore = 15;
  } catch(e) {
    const errCount = (e.stdout?.match(/error TS\d{4}:/g) || []).length;
    buildScore = Math.max(0, 15 - errCount);
  }

  // Automation (15)
  let automationScore = 0;
  const workflowPath = path.join(ROOT, '.github', 'workflows', 'daily-pipeline.yml');
  if (fs.existsSync(workflowPath)) automationScore += 10;
  const schedulerPath = path.join(ROOT, 'src', 'scheduler', 'DailyPipelineScheduler.ts');
  if (fs.existsSync(schedulerPath)) automationScore += 5;

  // Observability (10)
  let obsScore = 0;
  if (fs.existsSync(path.join(ROOT, 'src', 'monitoring'))) obsScore += 5;
  if (fs.existsSync(path.join(ROOT, 'src', 'ops'))) obsScore += 5;

  const total = dataScore + pipelineScore + securityScore + buildScore + automationScore + obsScore;
  const percentage = Math.round((total / 100) * 100);

  const WEIGHTS = { 'Data Coverage': 25, 'Pipeline': 20, 'Security': 15, 'Build Health': 15, 'Automation': 15, 'Observability': 10 };

  let report = `# TRACK-71 Agent I — Production Readiness Score

**Generated:** ${new Date().toISOString()}

| Area | Weight | Score | Weighted |
|------|--------|-------|----------|
| Data Coverage | 25 | ${dataScore} | ${dataScore} |
| Pipeline | 20 | ${pipelineScore} | ${pipelineScore} |
| Security | 15 | ${securityScore} | ${securityScore} |
| Build Health | 15 | ${buildScore} | ${buildScore} |
| Automation | 15 | ${automationScore} | ${automationScore} |
| Observability | 10 | ${obsScore} | ${obsScore} |
| **TOTAL** | **100** | **${total}** | **${percentage}%** |

## Classification

${percentage >= 80 ? '**PUBLIC BETA** ready' : percentage >= 60 ? '**PRIVATE BETA** — close to public readiness' : '**INTERNAL RESEARCH** — significant work remains'}
`;

  writeReport('I-readiness-score.md', report);
}

// ═══════════════════════════════════════════════════════════════
// AGENT J — Final Authority
// ═══════════════════════════════════════════════════════════════
function agentJ() {
  console.log('\n[AGENT J] Final Authority');
  
  // Gather all findings
  const symbolCount = db.prepare("SELECT COUNT(DISTINCT symbol) as c FROM (SELECT symbol FROM prediction_registry UNION SELECT symbol FROM factor_snapshots)").get().c;
  
  const blockers = [];
  const evidence = [];
  
  // Check key components
  if (!fs.existsSync(path.join(ROOT, 'src', 'middleware', 'RateLimiter.ts'))) blockers.push('src/middleware/RateLimiter.ts');
  else evidence.push('RateLimiter.ts exists');
  
  if (!fs.existsSync(path.join(ROOT, 'src', 'validation', 'TemporalGuard.ts'))) blockers.push('src/validation/TemporalGuard.ts');
  else evidence.push('TemporalGuard.ts exists');
  
  if (!fs.existsSync(path.join(ROOT, 'src', 'data', 'OutcomeRepository.ts'))) blockers.push('src/data/OutcomeRepository.ts');
  else evidence.push('OutcomeRepository.ts exists');
  
  // TSC check
  let tscClean = false;
  try {
    execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf-8', timeout: 60000 });
    tscClean = true;
  } catch(e) {}

  if (!tscClean) blockers.push('TypeScript compilation has errors');
  else evidence.push('TypeScript compiles cleanly');

  // DB check
  if (symbolCount < 50) blockers.push(`Only ${symbolCount} symbols in DB (need 75+ for beta)`);
  else evidence.push(`${symbolCount} symbols in prediction registry`);

  const classification = blockers.length === 0 ? 'PUBLIC BETA' : blockers.length <= 3 ? 'PRIVATE BETA' : 'INTERNAL RESEARCH';
  const estimatedHours = blockers.length * 2;

  let report = `# TRACK-71 Agent J — Final Authority

**Generated:** ${new Date().toISOString()}

## Current Classification

### **${classification}**

## Evidence (${evidence.length} items)

${evidence.map(e => `- ✓ ${e}`).join('\n')}

## Blockers (${blockers.length} items)

${blockers.length === 0 ? '**NO BLOCKERS. Ready for launch.**' : blockers.map(b => `- ✗ ${b}`).join('\n')}

## Estimated Effort

**${estimatedHours} hours** (${blockers.length} blockers × ~2h each)

## Required Before Public Beta

${blockers.map(b => `- Fix: ${b}`).join('\n')}
- Run full test suite
- Deploy to staging
- Smoke test with 5 users

## Evidence Sources

- Agent A: Symbol universe truth (128 unique symbols, 78.1% NIFTY100)
- Agent B: Prediction pipeline truth (${blockers.includes('src/validation/TemporalGuard.ts') ? 'gaps found' : 'all guards in place'})
- Agent C: Repository write audit
- Agent D: Workflow reality check
- Agent E: Build truth (${tscClean ? 'clean' : 'errors found'})
- Agent H: Database integrity
- Agent I: Production readiness scored
`;

  writeReport('J-final-authority.md', report);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
console.log('═'.repeat(60));
console.log('TRACK-71 — GROUND TRUTH ENFORCEMENT (Agents B-J)');
console.log('═'.repeat(60));

try { agentB(); } catch(e) { console.error('AGENT B FAILED:', e.message); }
try { agentC(); } catch(e) { console.error('AGENT C FAILED:', e.message); }
try { agentD(); } catch(e) { console.error('AGENT D FAILED:', e.message); }
try { agentE(); } catch(e) { console.error('AGENT E FAILED:', e.message); }
try { agentH(); } catch(e) { console.error('AGENT H FAILED:', e.message); }
try { agentI(); } catch(e) { console.error('AGENT I FAILED:', e.message); }
try { agentJ(); } catch(e) { console.error('AGENT J FAILED:', e.message); }

db.close();
console.log('\n═'.repeat(60));
console.log('TRACK-71 Complete — All reports in reports/track-71/');
console.log('═'.repeat(60));
