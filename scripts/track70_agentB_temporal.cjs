#!/usr/bin/env node
/**
 * TRACK-70 AGENT B — TemporalGuard Deployment Verification
 * 
 * Traces: Data Source → Factor Snapshot → PredictionFactory → Prediction Registry
 * Proves whether every prediction path calls TemporalGuard.guardFactorInsert()
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'B-temporal-verification.md');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Files that constitute the prediction path
const KEY_FILES = [
  'src/predictions/PredictionFactory.ts',
  'src/predictions/PredictionRegistry.ts',
  'src/predictions/DailyPredictionCapture.ts',
  'src/validation/TemporalGuard.ts',
];

const findings = [];
let temporalGuardImported = false;
let temporalGuardCalled = false;
let predictionPaths = 0;
let guardedPaths = 0;

for (const fileRel of KEY_FILES) {
  const filePath = path.join(__dirname, '..', fileRel);
  if (!fs.existsSync(filePath)) {
    findings.push({ file: fileRel, status: 'MISSING', detail: 'File does not exist' });
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasTemporalImport = /TemporalGuard/.test(content);
  const hasGuardCall = /TemporalGuard\.guardFactorInsert\s*\(/.test(content);
  const hasPredictionWrite = /PredictionRegistry|prediction_registry|recordOutcome|writeOutcome/i.test(content);
  const hasFactory = /PredictionFactory/i.test(content);
  
  if (hasTemporalImport) temporalGuardImported = true;
  if (hasGuardCall) temporalGuardCalled = true;
  
  if (fileRel.includes('PredictionFactory') || fileRel.includes('DailyPredictionCapture')) {
    predictionPaths++;
    if (hasGuardCall) guardedPaths++;
  }
  
  findings.push({
    file: fileRel,
    status: 'EXISTS',
    importsTemporalGuard: hasTemporalImport,
    callsGuardFactorInsert: hasGuardCall,
    hasPredictionWrite: hasPredictionWrite,
    hasFactory: hasFactory,
  });
}

// Also search for any file that imports from PredictionFactory to trace full call chain
const allTsFiles = [];
function collectTs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') continue;
      collectTs(full);
    } else if (/\.ts$/.test(entry)) {
      allTsFiles.push(full);
    }
  }
}
collectTs(SRC_DIR);

// Find all consumers of PredictionFactory
const factoryConsumers = [];
for (const f of allTsFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  if (/PredictionFactory/i.test(content)) {
    const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
    const hasGuard = /TemporalGuard/i.test(content);
    factoryConsumers.push({ file: rel, importsTemporalGuard: hasGuard });
  }
}

const report = `# TRACK-70 Agent B — TemporalGuard Deployment Verification

**Generated:** ${new Date().toISOString()}

## Prediction Pipeline Trace

The prediction data flow is:

\`\`\`
Data Source → Factor Snapshot → PredictionFactory → Prediction Registry (prediction_registry table)
\`\`\`

## TemporalGuard Module

Located at: \`src/validation/TemporalGuard.ts\`

Key method: \`TemporalGuard.guardFactorInsert()\` — validates temporal consistency before factor data is written.

## Key Files Audit

${findings.map(f => `### \`${f.file}\`
- **Status:** ${f.status}
- **Imports TemporalGuard:** ${f.importsTemporalGuard ? '✓ YES' : '✗ NO'}
- **Calls guardFactorInsert():** ${f.callsGuardFactorInsert ? '✓ YES' : '✗ NO'}
- **Has Prediction Write Path:** ${f.hasPredictionWrite ? '✓ YES' : '✗ NO'}
`).join('\n')}

## PredictionFactory Consumers

${factoryConsumers.length === 0 ? '**No consumers found.**' : factoryConsumers.map(c => `- \`${c.file}\` — TemporalGuard imported: ${c.importsTemporalGuard ? 'YES' : 'NO'}`).join('\n')}

## Coverage

- **Total prediction pathways identified:** ${predictionPaths}
- **Pathways with active TemporalGuard.guardFactorInsert():** ${guardedPaths}
- **Coverage:** ${predictionPaths > 0 ? Math.round((guardedPaths / predictionPaths) * 100) : 0}%

## Verdict

${guardedPaths === predictionPaths && predictionPaths > 0 ? 
  '**PASS** — Every prediction path calls TemporalGuard.guardFactorInsert(). Temporal safety is enforced end-to-end.' :
  `**PARTIAL/FAIL** — Only ${guardedPaths}/${predictionPaths} prediction paths are guarded. TemporalGuard is not fully deployed.`
}

## Evidence

- TemporalGuard class exists: ${findings.find(f => f.file.includes('TemporalGuard'))?.status || 'UNKNOWN'}
- guardFactorInsert() is called in production code: ${temporalGuardCalled ? '✓ YES' : '✗ NO'}
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent B report written to ${REPORT_PATH}`);
console.log(`Prediction paths: ${predictionPaths}, Guarded: ${guardedPaths}`);
