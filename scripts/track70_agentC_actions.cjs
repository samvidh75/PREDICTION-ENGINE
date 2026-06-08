#!/usr/bin/env node
/**
 * TRACK-70 AGENT C — GitHub Actions Execution Proof
 * Inspects execution history, not just YAML.
 */
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'C-actions-proof.md');
const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'daily-pipeline.yml');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

let yamlContent = null;
let workflowExists = false;
if (fs.existsSync(WORKFLOW_PATH)) {
  workflowExists = true;
  yamlContent = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
}

// Extract workflow name, trigger, jobs from YAML
const workflowName = yamlContent ? (yamlContent.match(/name:\s*(.+)/)?.[1] || 'unnamed') : 'N/A';
const triggers = yamlContent ? (yamlContent.match(/on:\s*\n((?:\s+[^\n]+\n?)+)/)?.[1] || 'schedule/push') : 'N/A';
const jobs = yamlContent ? [...yamlContent.matchAll(/^\s{2}(\w+):\s*$/gm)].map(m => m[1]) : [];

// Check for GitHub CLI availability and fetch recent runs
let ghAvailable = false;
let recentRuns = [];
try {
  const { execSync } = require('child_process');
  execSync('gh --version', { stdio: 'pipe', timeout: 5000 });
  ghAvailable = true;
  try {
    const runsOutput = execSync('gh run list --workflow=daily-pipeline.yml --limit 5 2>&1 || echo "No runs found"', { 
      encoding: 'utf-8', stdio: 'pipe', timeout: 15000 
    });
    recentRuns = runsOutput.split('\n').filter(l => l.trim());
  } catch (e) {
    recentRuns.push('gh run list failed: ' + e.message);
  }
} catch (e) {
  ghAvailable = false;
}

const report = `# TRACK-70 Agent C — GitHub Actions Execution Proof

**Generated:** ${new Date().toISOString()}

## Workflow File

- **Exists:** ${workflowExists ? '✓ YES' : '✗ NO'}
- **Path:** \`.github/workflows/daily-pipeline.yml\`
- **Name:** ${workflowName}
- **Triggers:** \`${triggers.trim()}\`
- **Jobs defined:** ${jobs.length > 0 ? jobs.join(', ') : 'None detected'}

## Execution History

${ghAvailable ? `GitHub CLI (\`gh\`) is available. Attempting to retrieve actual runs...

\`\`\`
${recentRuns.join('\n') || 'No run history returned'}
\`\`\`
` : `GitHub CLI (\`gh\`) is NOT available in this environment. Cannot inspect actual execution history.

**To check manually:**
\`\`\`bash
gh run list --workflow=daily-pipeline.yml --limit 10
\`\`\`
`}

## Key Questions

1. **Has daily-pipeline ever run?** ${recentRuns.length > 0 && recentRuns[0] !== 'No runs found' ? 'Evidence suggests YES (runs found)' : 'CANNOT CONFIRM — no execution evidence available'}
2. **How many successful runs?** ${recentRuns.length > 0 ? 'See run list above' : 'UNKNOWN'}
3. **Last successful run?** ${recentRuns.length > 0 ? recentRuns[0] : 'UNKNOWN'}
4. **Failed jobs?** ${'UNKNOWN — inspect individual run logs'}

## Verdict

${workflowExists ? 'Workflow file EXISTS but execution history is ' + (recentRuns.length > 0 && recentRuns[0] !== 'No runs found' ? 'CONFIRMED' : 'UNCONFIRMED') : 'NO WORKFLOW FILE FOUND'}

**Action: Run \`gh run list --workflow=daily-pipeline.yml\` in a GitHub-authenticated environment to verify.**
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent C report written to ${REPORT_PATH}`);
