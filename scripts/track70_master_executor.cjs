#!/usr/bin/env node
/**
 * TRACK-70 MASTER EXECUTOR — REPOSITORY TRUTH RECONCILIATION
 * 
 * Runs all 10 agent audits sequentially.
 * Each agent produces a report in reports/track-70/
 * 
 * Usage: node scripts/track70_master_executor.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-70');
const SCRIPT_DIR = path.join(__dirname, '..', 'scripts');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const agents = [
  { name: 'Agent A — OutcomeRepository Enforcement', script: 'track70_agentA_outcome.cjs' },
  { name: 'Agent B — TemporalGuard Verification', script: 'track70_agentB_temporal.cjs' },
  { name: 'Agent C — GitHub Actions Proof', script: 'track70_agentC_actions.cjs' },
  { name: 'Agent D — PostgreSQL Reality', script: 'track70_agentD_postgres.cjs' },
  { name: 'Agent E — NIFTY100 Gap Report', script: 'track70_agentE_nifty100.cjs' },
  { name: 'Agent F — Production Build Certification', script: 'track70_agentF_build.cjs' },
  { name: 'Agent G — Trust Centre Evidence', script: 'track70_agentG_trust.cjs' },
  { name: 'Agent H — Operational Runtime Audit', script: 'track70_agentH_runtime.cjs' },
  { name: 'Agent I — Public Beta Readiness Score', script: 'track70_agentI_beta.cjs' },
  { name: 'Agent J — Final Authority', script: 'track70_agentJ_final.cjs' },
];

console.log('='.repeat(70));
console.log('TRACK-70: REPOSITORY TRUTH RECONCILIATION');
console.log('Started:', new Date().toISOString());
console.log('='.repeat(70));

let allPassed = true;

for (const agent of agents) {
  console.log(`\n--- ${agent.name} ---`);
  try {
    const scriptPath = path.join(SCRIPT_DIR, agent.script);
    if (!fs.existsSync(scriptPath)) {
      console.log(`SKIPPED: Script ${agent.script} not found.`);
      continue;
    }
    execSync(`node "${scriptPath}"`, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe', 
      timeout: 120000,
      encoding: 'utf-8'
    });
    console.log(`  ✓ Completed`);
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    if (err.stdout) console.log(`  stdout: ${err.stdout.slice(0, 500)}`);
    if (err.stderr) console.log(`  stderr: ${err.stderr.slice(0, 500)}`);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(70));
console.log(`TRACK-70 COMPLETE: ${allPassed ? 'ALL AGENTS PASSED' : 'SOME AGENTS FAILED (see above)'}`);
console.log('Reports directory:', REPORT_DIR);
console.log('='.repeat(70));

// List generated reports
if (fs.existsSync(REPORT_DIR)) {
  const files = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.md'));
  console.log(`\nGenerated ${files.length} reports:`);
  files.forEach(f => console.log(`  - ${f}`));
}
