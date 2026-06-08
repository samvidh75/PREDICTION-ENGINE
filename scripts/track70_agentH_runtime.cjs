#!/usr/bin/env node
/**
 * TRACK-70 AGENT H — Operational Runtime Audit
 * Proves actual execution — NOT code existence. Runtime evidence only.
 * Searches: log files, execution output, timestamped records, LIVE_*.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'H-runtime-proof.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const runtimeEvidence = {
  schedulerRan: { found: false, evidence: [] },
  alertsDispatched: { found: false, evidence: [] },
  recoveryExecuted: { found: false, evidence: [] },
  freshnessMonitorExecuted: { found: false, evidence: [] },
  otherEvidence: [],
};

// Search for execution proof files
const searchDirs = [ROOT];
const searchFiles = [];

function collectFiles(dir, depth) {
  if (depth > 5) return;
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.vite') continue;
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { collectFiles(full, depth + 1); continue; }
        // Look for runtime evidence: .log, LIVE_*, execution_proof, runtime, timestamped JSON
        const ext = path.extname(entry);
        const isLogOrProof = entry.includes('execution_proof') || entry.includes('runtime') || 
                            entry.startsWith('LIVE_') || ext === '.log' ||
                            entry.includes('timestamp') || entry.includes('trace') ||
                            entry.includes('execution') || entry.includes('scheduler') ||
                            entry.includes('alert') || entry.includes('recovery') ||
                            entry.includes('freshness');
        if (isLogOrProof) {
          searchFiles.push(full);
        }
      } catch(e) {}
    }
  } catch(e) {}
}

collectFiles(ROOT, 0);

// Analyze each file for runtime evidence
for (const filePath of searchFiles) {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8').slice(0, 50000);
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);

    // Check for scheduler evidence
    if (/scheduler|pipeline.*run|daily.*pipeline|orchestrat/i.test(content) &&
        (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|timestamp|executed|completed|success/i.test(content))) {
      runtimeEvidence.schedulerRan.found = true;
      runtimeEvidence.schedulerRan.evidence.push({ file: relPath, size: stat.size, mtime: stat.mtime.toISOString() });
    }

    // Check for alert evidence
    if (/alert|dispatch|notif/i.test(content) &&
        (/sent|delivered|fired|triggered|dispatched/i.test(content))) {
      runtimeEvidence.alertsDispatched.found = true;
      runtimeEvidence.alertsDispatched.evidence.push({ file: relPath, size: stat.size, mtime: stat.mtime.toISOString() });
    }

    // Check for recovery evidence
    if (/recover|retry|failover|restore|rollback/i.test(content) &&
        (/executed|completed|success|initiated/i.test(content))) {
      runtimeEvidence.recoveryExecuted.found = true;
      runtimeEvidence.recoveryExecuted.evidence.push({ file: relPath, size: stat.size, mtime: stat.mtime.toISOString() });
    }

    // Check for freshness evidence
    if (/freshness|stale|data.*age|latency/i.test(content) &&
        (/checked|monitored|measured|executed|seconds|minutes|hours/i.test(content))) {
      runtimeEvidence.freshnessMonitorExecuted.found = true;
      runtimeEvidence.freshnessMonitorExecuted.evidence.push({ file: relPath, size: stat.size, mtime: stat.mtime.toISOString() });
    }

    // Any timestamped content
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(content)) {
      const timestamps = content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g);
      if (timestamps && timestamps.length > 0) {
        runtimeEvidence.otherEvidence.push({
          file: relPath,
          timestamps: timestamps.slice(0, 3),
          mtime: stat.mtime.toISOString(),
        });
      }
    }
  } catch(e) { /* skip */ }
}

const report = `# TRACK-70 Agent H — Operational Runtime Audit

**Generated:** ${new Date().toISOString()}

## Runtime Evidence: Code is running — or is it?

### 1. Scheduler Execution

**Scheduler ran?** ${runtimeEvidence.schedulerRan.found ? 'EVIDENCE FOUND' : 'NO EVIDENCE'}

${runtimeEvidence.schedulerRan.evidence.length > 0 ? runtimeEvidence.schedulerRan.evidence.map(e => `- \`${e.file}\` (${e.size} bytes, last modified ${e.mtime})`).join('\n') : 'No scheduler execution logs or output files found.'}

### 2. Alerts Dispatched

**Alerts sent?** ${runtimeEvidence.alertsDispatched.found ? 'EVIDENCE FOUND' : 'NO EVIDENCE'}

${runtimeEvidence.alertsDispatched.evidence.length > 0 ? runtimeEvidence.alertsDispatched.evidence.map(e => `- \`${e.file}\` (${e.size} bytes, last modified ${e.mtime})`).join('\n') : 'No alert dispatch logs or output files found.'}

### 3. Recovery Executed

**Recovery ran?** ${runtimeEvidence.recoveryExecuted.found ? 'EVIDENCE FOUND' : 'NO EVIDENCE'}

${runtimeEvidence.recoveryExecuted.evidence.length > 0 ? runtimeEvidence.recoveryExecuted.evidence.map(e => `- \`${e.file}\` (${e.size} bytes, last modified ${e.mtime})`).join('\n') : 'No recovery execution logs found.'}

### 4. Freshness Monitor Executed

**Freshness checked?** ${runtimeEvidence.freshnessMonitorExecuted.found ? 'EVIDENCE FOUND' : 'NO EVIDENCE'}

${runtimeEvidence.freshnessMonitorExecuted.evidence.length > 0 ? runtimeEvidence.freshnessMonitorExecuted.evidence.map(e => `- \`${e.file}\` (${e.size} bytes, last modified ${e.mtime})`).join('\n') : 'No freshness monitor logs found.'}

### 5. Other Timestamped Evidence

${runtimeEvidence.otherEvidence.length > 0 ? runtimeEvidence.otherEvidence.map(e => `- \`${e.file}\` — timestamps: ${e.timestamps.join(', ')} — modified: ${e.mtime}`).join('\n') : 'No timestamped runtime evidence found in any file.'}

### 6. All Files Searched

${searchFiles.length > 0 ? searchFiles.map(f => `- \`${path.relative(ROOT, f).replace(/\\/g, '/')}\``).join('\n') : '**No matching files found** — no .log, LIVE_*, execution_proof, runtime, or trace files.'}

## Verdict

**Operational runtime status:**

| Check | Evidence |
|-------|----------|
| Scheduler ran | ${runtimeEvidence.schedulerRan.found ? 'CONFIRMED' : 'NOT FOUND'} |
| Alerts dispatched | ${runtimeEvidence.alertsDispatched.found ? 'CONFIRMED' : 'NOT FOUND'} |
| Recovery executed | ${runtimeEvidence.recoveryExecuted.found ? 'CONFIRMED' : 'NOT FOUND'} |
| Freshness monitored | ${runtimeEvidence.freshnessMonitorExecuted.found ? 'CONFIRMED' : 'NOT FOUND'} |

**Overall: ${(runtimeEvidence.schedulerRan.found || runtimeEvidence.alertsDispatched.found || runtimeEvidence.recoveryExecuted.found || runtimeEvidence.freshnessMonitorExecuted.found) ? 'SOME RUNTIME EVIDENCE EXISTS — operational components may have executed.' : 'NO RUNTIME EVIDENCE FOUND — system appears to never have run operationally.'}**
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent H report written to ${REPORT_PATH}`);
console.log(`Files searched: ${searchFiles.length}, Scheduler: ${runtimeEvidence.schedulerRan.found}, Alerts: ${runtimeEvidence.alertsDispatched.found}, Recovery: ${runtimeEvidence.recoveryExecuted.found}, Freshness: ${runtimeEvidence.freshnessMonitorExecuted.found}`);
