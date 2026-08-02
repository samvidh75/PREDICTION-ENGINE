#!/usr/bin/env node
/**
 * TRACK-70 AGENT I — Public Beta Readiness Score
 * Scores across 6 dimensions, weighted final out of 100.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'I-beta-score.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Weights for final score
const WEIGHTS = { Data: 25, Research: 20, Infrastructure: 20, Automation: 15, Scalability: 10, Security: 10 };

// Gather evidence from the filesystem
const dbPath = path.join(ROOT, 'data', 'stockstory.db');
const dbExists = fs.existsSync(dbPath);
let dbSize = 0, dbTableCount = 0;
if (dbExists) {
  dbSize = fs.statSync(dbPath).size;
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    dbTableCount = db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'").get().c;
    db.close();
  } catch(e) {}
}

// Check source files
const srcDir = path.join(ROOT, 'src');
function countTsFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { count += countTsFiles(full); continue; }
      if (/\.(ts|tsx)$/.test(entry.name)) count++;
    }
  } catch(e) {}
  return count;
}
const tsFileCount = countTsFiles(srcDir);

// Check routes
const appPath = path.join(ROOT, 'src', 'App.tsx');
let routeCount = 0;
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf-8');
  const matches = content.match(/activePageKey === "([^"]+)"/g);
  routeCount = matches ? matches.length : 0;
}

// Check migrations
const migrationsDir = path.join(ROOT, 'src', 'db', 'migrations');
let migrationCount = 0;
if (fs.existsSync(migrationsDir)) {
  migrationCount = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).length;
}

// Check GitHub Actions
const workflowsDir = path.join(ROOT, '.github', 'workflows');
let workflowCount = 0;
if (fs.existsSync(workflowsDir)) {
  workflowCount = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).length;
}

// Check deployment configs
const deployFiles = ['docker-compose.yml', 'Dockerfile', 'nginx.conf', 'vercel.json', 'render.yaml'];
let deployConfigCount = 0;
for (const f of deployFiles) {
  if (fs.existsSync(path.join(ROOT, f))) deployConfigCount++;
}

// Check .env
const envExists = fs.existsSync(path.join(ROOT, '.env'));
const prodEnvExists = fs.existsSync(path.join(ROOT, '.env.production.example'));

// Check test files
let testFileCount = 0;
function countTests(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { count += countTests(full); continue; }
      if (/\.test\.(ts|tsx)$/.test(entry.name) || entry.name.includes('__test__')) count++;
    }
  } catch(e) {}
  return count;
}
testFileCount = countTests(srcDir);

// Score each area
function scoreData() {
  let s = 0;
  if (dbExists) s += 30; // 30: DB exists
  if (dbSize > 0) s += 20; // 20: DB has data
  if (dbTableCount >= 5) s += 15; // 15: decent schema
  if (migrationCount >= 3) s += 15; // 15: migrations
  if (envExists) s += 10; // 10: env configured
  if (prodEnvExists) s += 10; // 10: prod env example
  return Math.min(100, s);
}

function scoreResearch() {
  let s = 0;
  // Check if ranking/alpha/backtest code exists
  const hasRanking = fs.existsSync(path.join(ROOT, 'src', 'stockstory', 'scoring'));
  const hasBacktest = fs.existsSync(path.join(ROOT, 'src', 'backtest'));
  const hasPredictions = fs.existsSync(path.join(ROOT, 'src', 'predictions'));
  if (hasRanking) s += 30;
  if (hasBacktest) s += 25;
  if (hasPredictions) s += 25;
  if (testFileCount >= 3) s += 10;
  if (testFileCount >= 10) s += 10;
  return Math.min(100, s);
}

function scoreInfrastructure() {
  let s = 0;
  if (tsFileCount > 50) s += 20;
  if (routeCount > 5) s += 15;
  if (deployConfigCount >= 2) s += 20;
  if (deployConfigCount >= 4) s += 15;
  if (fs.existsSync(path.join(ROOT, 'src', 'db'))) s += 15;
  if (fs.existsSync(path.join(ROOT, 'src', 'backend'))) s += 15;
  return Math.min(100, s);
}

function scoreAutomation() {
  let s = 0;
  if (workflowCount > 0) s += 30;
  if (workflowCount >= 2) s += 20;
  if (fs.existsSync(path.join(ROOT, 'src', 'scheduler'))) s += 25;
  if (fs.existsSync(path.join(ROOT, 'deployment', 'scheduler-config.json'))) s += 15;
  if (fs.existsSync(path.join(ROOT, 'deployment', 'rate-limit-config.json'))) s += 10;
  return Math.min(100, s);
}

function scoreScalability() {
  let s = 0;
  if (fs.existsSync(path.join(ROOT, 'docker-compose.yml'))) s += 20;
  if (fs.existsSync(path.join(ROOT, 'Dockerfile'))) s += 15;
  if (fs.existsSync(path.join(ROOT, 'nginx.conf'))) s += 15;
  if (fs.existsSync(path.join(ROOT, 'vercel.json'))) s += 10;
  if (fs.existsSync(path.join(ROOT, 'render.yaml'))) s += 10;
  if (migrationCount >= 5) s += 15;
  if (tsFileCount > 100) s += 15;
  return Math.min(100, s);
}

function scoreSecurity() {
  let s = 0;
  if (fs.existsSync(path.join(ROOT, 'src', 'middleware', 'RateLimiter.ts'))) s += 30;
  if (fs.existsSync(path.join(ROOT, 'firestore.rules'))) s += 20;
  if (prodEnvExists) s += 15;
  if (fs.existsSync(path.join(ROOT, 'src', 'validation', 'TemporalGuard.ts'))) s += 15;
  if (fs.existsSync(path.join(ROOT, 'src', 'data', 'OutcomeRepository.ts'))) s += 10;
  if (fs.existsSync(path.join(ROOT, '.env.production.example'))) s += 10;
  return Math.min(100, s);
}

const scores = {
  Data: scoreData(),
  Research: scoreResearch(),
  Infrastructure: scoreInfrastructure(),
  Automation: scoreAutomation(),
  Scalability: scoreScalability(),
  Security: scoreSecurity(),
};

let weightedScore = 0;
for (const [area, weight] of Object.entries(WEIGHTS)) {
  weightedScore += (scores[area] / 100) * weight;
}
weightedScore = weightedScore.toFixed(1);

const classification = weightedScore >= 80 ? 'PUBLIC BETA' : weightedScore >= 60 ? 'PRIVATE BETA' : 'INTERNAL RESEARCH';

const report = `# TRACK-70 Agent I — Public Beta Readiness Score

**Generated:** ${new Date().toISOString()}

## Scoring Dimensions

| Area | Weight | Raw Score | Weighted |
|------|--------|-----------|----------|
| Data | ${WEIGHTS.Data}% | ${scores.Data}/100 | ${((scores.Data / 100) * WEIGHTS.Data).toFixed(1)} |
| Research | ${WEIGHTS.Research}% | ${scores.Research}/100 | ${((scores.Research / 100) * WEIGHTS.Research).toFixed(1)} |
| Infrastructure | ${WEIGHTS.Infrastructure}% | ${scores.Infrastructure}/100 | ${((scores.Infrastructure / 100) * WEIGHTS.Infrastructure).toFixed(1)} |
| Automation | ${WEIGHTS.Automation}% | ${scores.Automation}/100 | ${((scores.Automation / 100) * WEIGHTS.Automation).toFixed(1)} |
| Scalability | ${WEIGHTS.Scalability}% | ${scores.Scalability}/100 | ${((scores.Scalability / 100) * WEIGHTS.Scalability).toFixed(1)} |
| Security | ${WEIGHTS.Security}% | ${scores.Security}/100 | ${((scores.Security / 100) * WEIGHTS.Security).toFixed(1)} |

## Final Score: ${weightedScore} / 100

### Classification: **${classification}**

## Key Metrics

- **TS source files:** ${tsFileCount}
- **Routes defined:** ${routeCount}
- **DB tables:** ${dbTableCount} (${(dbSize / 1024).toFixed(1)} KB)
- **DB migrations:** ${migrationCount}
- **Deployment configs:** ${deployConfigCount}
- **GitHub Actions workflows:** ${workflowCount}
- **Test files:** ${testFileCount}

## Breakdown by Area

### Data (score: ${scores.Data})
${dbExists ? '✓ DB exists and has ' + dbTableCount + ' tables' : '✗ No database file'}
${migrationCount > 0 ? '✓ ' + migrationCount + ' migrations' : '✗ No migrations'}
${envExists ? '✓ .env configured' : '✗ No .env file'}

### Research (score: ${scores.Research})
${fs.existsSync(path.join(ROOT, 'src', 'stockstory', 'scoring')) ? '✓ Scoring engine' : '✗ No scoring engine'}
${fs.existsSync(path.join(ROOT, 'src', 'backtest')) ? '✓ Backtest framework' : '✗ No backtest'}
${fs.existsSync(path.join(ROOT, 'src', 'predictions')) ? '✓ Predictions module' : '✗ No predictions'}

### Infrastructure (score: ${scores.Infrastructure})
${tsFileCount > 50 ? '✓ ' + tsFileCount + ' TS files' : '✗ Only ' + tsFileCount + ' TS files'}
${routeCount > 5 ? '✓ ' + routeCount + ' routes' : '✗ Only ' + routeCount + ' routes'}
${deployConfigCount > 1 ? '✓ ' + deployConfigCount + ' deploy configs' : '✗ Only ' + deployConfigCount + ' deploy configs'}

### Automation (score: ${scores.Automation})
${workflowCount > 0 ? '✓ ' + workflowCount + ' GitHub Actions workflows' : '✗ No CI/CD workflows'}
${fs.existsSync(path.join(ROOT, 'src', 'scheduler')) ? '✓ Scheduler module' : '✗ No scheduler'}

### Scalability (score: ${scores.Scalability})
${fs.existsSync(path.join(ROOT, 'docker-compose.yml')) ? '✓ Docker compose' : '✗ No Docker compose'}
${fs.existsSync(path.join(ROOT, 'vercel.json')) ? '✓ Vercel' : '✗ No Vercel'}
${fs.existsSync(path.join(ROOT, 'render.yaml')) ? '✓ Render' : '✗ No Render'}

### Security (score: ${scores.Security})
${fs.existsSync(path.join(ROOT, 'src', 'middleware', 'RateLimiter.ts')) ? '✓ RateLimiter' : '✗ No RateLimiter'}
${fs.existsSync(path.join(ROOT, 'src', 'validation', 'TemporalGuard.ts')) ? '✓ TemporalGuard' : '✗ No TemporalGuard'}
${fs.existsSync(path.join(ROOT, 'src', 'data', 'OutcomeRepository.ts')) ? '✓ OutcomeRepository' : '✗ No OutcomeRepository'}

`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent I report written to ${REPORT_PATH}`);
console.log(`Final score: ${weightedScore}/100 — ${classification}`);
