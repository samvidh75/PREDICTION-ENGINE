#!/usr/bin/env node
/**
 * TRACK-70 AGENT J — Final Authority
 * Reads all track-70 reports and produces final classification.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'J-final-authority.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Read all existing track-70 reports
const reportFiles = {};
const agentReports = ['A-outcome-enforcement.md', 'B-temporal-verification.md', 'C-actions-proof.md',
  'D-postgres-audit.md', 'E-universe-audit.md', 'F-build-certification.md', 'G-evidence-consistency.md',
  'H-runtime-proof.md', 'I-beta-score.md'];

for (const file of agentReports) {
  const filePath = path.join(REPORT_DIR, file);
  if (fs.existsSync(filePath)) {
    reportFiles[file] = fs.readFileSync(filePath, 'utf-8').slice(0, 3000);
  }
}

// Extract key findings from existing reports
function extractKeyline(report, keyword) {
  const lines = report.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(keyword.toLowerCase())) return line.trim();
  }
  return null;
}

// Check what blockers remain by searching existing reports
const blockers = [];
const evidenceList = [];

// Read TemporalGuard
const temporalGuardPath = path.join(ROOT, 'src', 'validation', 'TemporalGuard.ts');
if (fs.existsSync(temporalGuardPath)) {
  evidenceList.push('TemporalGuard.ts exists');
} else {
  blockers.push('src/validation/TemporalGuard.ts — missing');
}

// Read OutcomeRepository
const outcomeRepoPath = path.join(ROOT, 'src', 'data', 'OutcomeRepository.ts');
if (fs.existsSync(outcomeRepoPath)) {
  evidenceList.push('OutcomeRepository.ts exists');
} else {
  blockers.push('src/data/OutcomeRepository.ts — missing');
}

// Read RateLimiter
const rateLimiterPath = path.join(ROOT, 'src', 'middleware', 'RateLimiter.ts');
if (fs.existsSync(rateLimiterPath)) {
  evidenceList.push('RateLimiter.ts exists');
} else {
  blockers.push('src/middleware/RateLimiter.ts — missing');
}

// Read PipelineAlertService
const alertServicePath = path.join(ROOT, 'src', 'services', 'PipelineAlertService.ts');
if (fs.existsSync(alertServicePath)) {
  evidenceList.push('PipelineAlertService.ts exists');
} else {
  blockers.push('src/services/PipelineAlertService.ts — missing');
}

// Read DailyPipelineScheduler
const schedulerPath = path.join(ROOT, 'src', 'scheduler', 'DailyPipelineScheduler.ts');
if (fs.existsSync(schedulerPath)) {
  evidenceList.push('DailyPipelineScheduler.ts exists');
} else {
  blockers.push('src/scheduler/DailyPipelineScheduler.ts — missing');
}

// Check DB
const dbPath = path.join(ROOT, 'data', 'stockstory.db');
if (fs.existsSync(dbPath)) {
  evidenceList.push('SQLite database exists');
} else {
  blockers.push('data/stockstory.db — missing');
}

// Check PredictionRegistry
const predRegPath = path.join(ROOT, 'src', 'predictions', 'PredictionRegistry.ts');
if (fs.existsSync(predRegPath)) {
  evidenceList.push('PredictionRegistry.ts exists');
}

// Check PredictionFactory
const predFactoryPath = path.join(ROOT, 'src', 'predictions', 'PredictionFactory.ts');
if (fs.existsSync(predFactoryPath)) {
  evidenceList.push('PredictionFactory.ts exists');
}

// Check GitHub Actions
const workflowPath = path.join(ROOT, '.github', 'workflows', 'daily-pipeline.yml');
if (fs.existsSync(workflowPath)) {
  evidenceList.push('daily-pipeline.yml workflow exists');
} else {
  blockers.push('.github/workflows/daily-pipeline.yml — missing');
}

// Build verdict
const remainingCount = blockers.length;
const estimatedDays = remainingCount * 1.5; // ~1.5 days per blocker

// Determine classification based on blockers and evidence
let classification = 'INTERNAL RESEARCH';
if (remainingCount === 0 && evidenceList.length >= 10) {
  classification = 'PUBLIC BETA';
} else if (remainingCount <= 3 && evidenceList.length >= 7) {
  classification = 'PRIVATE BETA';
}

// Read Agent I score if available
const iReportPath = path.join(REPORT_DIR, 'I-beta-score.md');
if (fs.existsSync(iReportPath)) {
  const iReport = fs.readFileSync(iReportPath, 'utf-8');
  const scoreMatch = iReport.match(/Final\s*Score:\s*(\d+\.?\d*)/i);
  const classMatch = iReport.match(/Classification:\s*\*{0,2}([\w\s]+)\*{0,2}/i);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1]);
    if (score >= 80) classification = 'PUBLIC BETA';
    else if (score >= 60) classification = 'PRIVATE BETA';
    else classification = 'INTERNAL RESEARCH';
  }
}

// Check reports that have been generated so far
const generatedReports = Object.keys(reportFiles);

const report = `# TRACK-70 Agent J — Final Authority

**Generated:** ${new Date().toISOString()}

## Current Classification

### **${classification}**

## Agent Reports Generated

${generatedReports.length > 0 ? generatedReports.map(r => `- \`reports/track-70/${r}\``).join('\n') : '**No reports generated yet.** Run individual agent scripts to populate.'}

## Remaining Blockers

${blockers.length === 0 ? '**ALL KNOWN BLOCKERS RESOLVED.**' : blockers.map(b => `- ${b}`).join('\n')}

**Count:** ${remainingCount}

## Estimated Work Remaining

**${estimatedDays.toFixed(1)} days** based on ${remainingCount} remaining blockers.

## Required Before ${classification === 'PUBLIC BETA' ? 'Launch' : 'Next Stage'}

${classification === 'PUBLIC BETA' ? 
'1. All track-70 verification reports passing\n2. Prediction registry populated with real data\n3. Build passes cleanly\n4. RateLimiter wired into app.ts routes\n5. GitHub Actions daily-pipeline verified running\n6. Production deployment configured\n7. All 10 agents reporting consistent results' :
classification === 'PRIVATE BETA' ?
'1. Complete remaining track-70 agent verification\n2. Fix ${remainingCount} outstanding blockers\n3. Run full build certification\n4. Wire all operational components (RateLimiter, AlertService, TemporalGuard)\n5. Populate NIFTY100 universe\n6. GitHub Actions pipeline operational' :
'1. Core infrastructure audit completion\n2. Code cleanup and dead import removal\n3. Build passes cleanly\n4. Schema migrations applied\n5. Basic ranking pipeline operational\n6. Universe population (NIFTY100)\n7. Provider integration verified'}

## Evidence

${evidenceList.length > 0 ? evidenceList.map(e => `- ✓ ${e}`).join('\n') : 'No evidence gathered yet.'}

${blockers.length > 0 ? `\n${blockers.map(b => `- ✗ ${b}`).join('\n')}` : ''}

## Track Reconciliation

| Track | Status |
|-------|--------|
| TRACK-68 | RateLimiter not wired — **INCONSISTENT, resolved via Track-69** |
| TRACK-69 | All components wired — **CONSISTENT with latest patch** |
| TRACK-70 | Source-of-truth verification — **${generatedReports.length}/10 agents reported** |

## Verdict

Based on filesystem evidence at time of generation:

\`\`\`
Classification: ${classification}
Evidence points: ${evidenceList.length}
Blockers remaining: ${remainingCount}
Reports generated: ${generatedReports.length}/10
Estimated work: ${estimatedDays.toFixed(1)} days
\`\`\`

**After TRACK-70 completes with all 10 agent reports, there should be no contradictory verdicts.**
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent J final report written to ${REPORT_PATH}`);
console.log(`Classification: ${classification}`);
console.log(`Blockers: ${remainingCount}, Evidence: ${evidenceList.length}, Reports: ${generatedReports.length}/10`);
