/**
 * TRACK-70 AGENT F — Production Build Certification
 *
 * Executes:
 *   1. npx tsc -p tsconfig.json --noEmit   (full typecheck)
 *   2. npx vite build                       (production bundle)
 *
 * Captures all output, categorises errors by type, scans for dead imports
 * and missing routes, then produces a certification report.
 *
 * Output: PREDICTION-ENGINE/reports/track-70/F-build-certification.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'F-build-certification.md');
const APP_TSX = path.join(SRC_DIR, 'App.tsx');

// Ensure report directory
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Error categories mapping TS error codes to human labels
const ERROR_CATEGORIES = {
  TS2304: { label: 'Missing import / Cannot find name', severity: 'HIGH' },
  TS2339: { label: 'Property does not exist on type', severity: 'HIGH' },
  TS2345: { label: 'Type mismatch (argument)', severity: 'HIGH' },
  TS2322: { label: 'Type mismatch (assignment)', severity: 'HIGH' },
  TS2554: { label: 'Wrong number of arguments', severity: 'HIGH' },
  TS1185: { label: 'Merge conflict marker', severity: 'CRITICAL' },
  TS6133: { label: 'Unused variable / dead import', severity: 'LOW' },
  TS6196: { label: 'Unused import declaration', severity: 'LOW' },
  TS18003: { label: 'No inputs were found in config file', severity: 'HIGH' },
  TS18046: { label: 'Variable possibly null', severity: 'MEDIUM' },
  TS2532: { label: 'Object possibly undefined', severity: 'MEDIUM' },
  TS18047: { label: 'Variable used before assignment', severity: 'MEDIUM' },
  TS6138: { label: 'Property declared but never used', severity: 'LOW' },
  TS6192: { label: 'Unused namespace import', severity: 'LOW' },
  TS2769: { label: 'No overload matches this call', severity: 'HIGH' },
  TS2741: { label: 'Missing properties in type', severity: 'HIGH' },
  TS2416: { label: 'Interface/class mismatch', severity: 'HIGH' },
  TS18048: { label: 'Variable possibly undefined', severity: 'MEDIUM' },
  TS18049: { label: 'Cannot be null', severity: 'MEDIUM' },
  TS2588: { label: 'Cannot find name (global)', severity: 'HIGH' },
  TS7006: { label: 'Parameter implicitly has any type', severity: 'MEDIUM' },
  TS7016: { label: 'Could not find declaration file', severity: 'MEDIUM' },
  TS7053: { label: 'Element implicitly has any type', severity: 'MEDIUM' },
  TS2538: { label: 'Type cannot be used to index', severity: 'MEDIUM' },
  TS2578: { label: 'Unused labels', severity: 'LOW' },
  TS7031: { label: 'Binding element implicitly has any type', severity: 'MEDIUM' },
  TS6137: { label: 'Cannot import type declaration files', severity: 'MEDIUM' },
  other: { label: 'Uncategorised TypeScript error', severity: 'UNKNOWN' },
};

// Helpers

function runCommand(cmd, cwd = ROOT) {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: '0', CI: 'true' },
    });
    return { ok: true, stdout: stdout || '', stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
      message: err.message,
    };
  }
}

function parseTsErrors(stdout, stderr) {
  const combined = stdout + '\n' + stderr;
  const lines = combined.split('\n');
  const errors = [];
  const re = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const [, file, lineNum, col, code, message] = m;
      const cat = ERROR_CATEGORIES[code] || ERROR_CATEGORIES['other'];
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        col: parseInt(col, 10),
        code,
        message: message.trim(),
        category: cat.label,
        severity: cat.severity,
      });
    }
    // Also catch "error TSxxxx:" at the start of the line
    const m2 = line.match(/^error\s+(TS\d+):\s+(.+)$/);
    if (m2) {
      const [, code, message] = m2;
      const cat = ERROR_CATEGORIES[code] || ERROR_CATEGORIES['other'];
      errors.push({
        file: '(stdout)',
        line: 0,
        col: 0,
        code,
        message: message.trim(),
        category: cat.label,
        severity: cat.severity,
      });
    }
  }

  return errors;
}

function parseViteErrors(stdout, stderr) {
  const combined = stdout + '\n' + stderr;
  const errors = [];
  const lines = combined.split('\n');

  for (const line of lines) {
    const m = line.match(/^(.+?):(\d+):(\d+):\s+(.+)$/);
    if (m) {
      errors.push({
        file: m[1].trim(),
        line: parseInt(m[2], 10),
        col: parseInt(m[3], 10),
        message: m[4].trim(),
        category: 'Vite build error',
        severity: 'HIGH',
      });
    }

    if (line.startsWith('Error:') || line.startsWith('error ')) {
      if (!errors.some(e => line.includes(e.message))) {
        errors.push({
          file: 'unknown',
          line: 0,
          col: 0,
          message: line.trim(),
          category: 'Vite build error',
          severity: 'HIGH',
        });
      }
    }

    const modMatch = line.match(/Could not resolve ['"](.+?)['"]/);
    if (modMatch) {
      errors.push({
        file: 'unknown',
        line: 0,
        col: 0,
        message: 'Unresolved module: ' + modMatch[1],
        category: 'Missing dependency',
        severity: 'CRITICAL',
      });
    }
  }

  return errors;
}

function collectTsFiles(dir, excludeDirs) {
  excludeDirs = excludeDirs || ['node_modules', '.git', 'dist', 'build', '.vite'];
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        results.push(...collectTsFiles(full, excludeDirs));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function extractRoutesFromApp() {
  if (!fs.existsSync(APP_TSX)) return { pageKeys: [], componentMapping: [] };
  const content = fs.readFileSync(APP_TSX, 'utf-8');

  const keyMatch = content.match(/type PageKey\s*=\s*([\s\S]*?);/);
  const pageKeys = [];
  if (keyMatch) {
    const keyStr = keyMatch[1];
    const literals = keyStr.match(/"([^"]+)"/g);
    if (literals) {
      for (const lit of literals) {
        pageKeys.push(lit.replace(/"/g, ''));
      }
    }
  }

  const componentMapping = [];
  const renderPattern = /\{activePageKey === "(\w+(?:-\w+)*)" && <(\w+)\s*\/>/g;
  let m;
  while ((m = renderPattern.exec(content)) !== null) {
    componentMapping.push({ route: m[1], component: m[2] });
  }

  return { pageKeys, componentMapping };
}

function listPageComponents() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs.readdirSync(PAGES_DIR)
    .filter(f => /\.(tsx|ts|jsx|js)$/.test(f) && !f.endsWith('.test.tsx') && !f.endsWith('.test.ts'))
    .map(f => f);
}

function findUnusedImportPatterns() {
  const allSrcFiles = collectTsFiles(SRC_DIR);
  const unusedCandidates = [];

  for (const filePath of allSrcFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');

      const importLines = [];
      const lineRe = /^import\s+.+$/gm;
      let lm;
      while ((lm = lineRe.exec(content)) !== null) {
        importLines.push({ line: lm[0], index: lm.index });
      }

      for (const imp of importLines) {
        const namedRe = /\{([^}]+)\}/;
        const namedMatch = imp.line.match(namedRe);
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(s => s.trim()).filter(Boolean);
          const restOfFile = content.slice(imp.index + imp.line.length);
          for (const name of names) {
            if (restOfFile.includes(name)) continue;
            unusedCandidates.push({ file: relative, importName: name });
          }
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return unusedCandidates;
}

function bucketErrors(errors) {
  const buckets = {};
  const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], UNKNOWN: [] };

  for (const err of errors) {
    const key = err.category;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(err);
    if (bySeverity[err.severity]) {
      bySeverity[err.severity].push(err);
    } else {
      bySeverity['UNKNOWN'].push(err);
    }
  }

  return { buckets, bySeverity };
}

function escapeMarkdownTable(str) {
  return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// Main

console.log('='.repeat(60));
console.log('TRACK-70 AGENT F: Build Certification');
console.log('Started:', new Date().toISOString());
console.log('='.repeat(60));

// Step 1: tsc typecheck
console.log('\n[1/4] Running: npx tsc -p tsconfig.json --noEmit ...');
const tscResult = runCommand('npx tsc -p tsconfig.json --noEmit');
console.log('  Exit code:', tscResult.exitCode);
console.log('  Output length:', tscResult.stdout.length + tscResult.stderr.length, 'chars');

// Step 2: vite build
console.log('\n[2/4] Running: npx vite build ...');
const viteResult = runCommand('npx vite build');
console.log('  Exit code:', viteResult.exitCode);
console.log('  Output length:', viteResult.stdout.length + viteResult.stderr.length, 'chars');

// Step 3: npm run build
console.log('\n[3/4] Running: npm run build (full pipeline) ...');
const buildResult = runCommand('npm run build');
console.log('  Exit code:', buildResult.exitCode);
console.log('  Combined output length:', buildResult.stdout.length + buildResult.stderr.length, 'chars');

// Step 4: npx tsc --noEmit
console.log('\n[4/4] Running: npx tsc --noEmit ...');
const tscNoEmitResult = runCommand('npx tsc --noEmit');
console.log('  Exit code:', tscNoEmitResult.exitCode);

// Parse results
const tsErrors = [];
tsErrors.push(...parseTsErrors(tscResult.stdout, tscResult.stderr));
tsErrors.push(...parseTsErrors(tscNoEmitResult.stdout, tscNoEmitResult.stderr));
tsErrors.push(...parseTsErrors(buildResult.stdout, buildResult.stderr));

// Deduplicate
const seen = new Set();
const uniqueTsErrors = [];
for (const err of tsErrors) {
  const key = err.file + ':' + err.line + ':' + err.col + ':' + err.code;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueTsErrors.push(err);
  }
}

const viteErrors = parseViteErrors(viteResult.stdout, viteResult.stderr);
const { buckets, bySeverity } = bucketErrors(uniqueTsErrors);

// Route analysis
const { pageKeys, componentMapping } = extractRoutesFromApp();
const pageComponents = listPageComponents();
const unusedCandidates = findUnusedImportPatterns();

// Dist check
const distDir = path.join(ROOT, 'dist');
const distExists = fs.existsSync(distDir);
let distFileCount = 0;
if (distExists) {
  try {
    const files = fs.readdirSync(distDir, { recursive: true });
    distFileCount = files.length;
  } catch { /* ok */ }
}

// Dead import TS errors
const deadImportErrors = uniqueTsErrors.filter(
  e => e.code === 'TS6133' || e.code === 'TS6196' || e.code === 'TS6138'
);

// Verdict
const tscPassed = tscResult.ok && uniqueTsErrors.length === 0;
const vitePassed = viteResult.ok && viteErrors.length === 0;
const buildPipelinePassed = buildResult.ok;
const overallPassed = tscPassed && vitePassed && buildPipelinePassed;

let verdict = '';
if (overallPassed) {
  verdict = 'PASS — Full production build certified clean. Frontend is production-ready.';
} else if (tscPassed && vitePassed && !buildPipelinePassed) {
  verdict = 'PARTIAL PASS — Individual steps pass but npm run build failed.';
} else if (!tscPassed && vitePassed) {
  verdict = 'BLOCKED — TypeScript compilation has ' + uniqueTsErrors.length + ' errors. Vite bundle builds but TS errors must be resolved.';
} else if (tscPassed && !vitePassed) {
  verdict = 'BLOCKED — TypeScript passes but Vite build has ' + viteErrors.length + ' errors.';
} else {
  verdict = 'BLOCKED — Both TypeScript (' + uniqueTsErrors.length + ' errors) and Vite (' + viteErrors.length + ' errors) failed.';
}

const hasMergeConflicts = uniqueTsErrors.some(e => e.code === 'TS1185');
const mergeConflictFiles = [];
if (hasMergeConflicts) {
  const set = new Set();
  uniqueTsErrors.filter(e => e.code === 'TS1185').forEach(e => set.add(e.file));
  mergeConflictFiles.push(...set);
}

// Generate report markdown
let report = '# TRACK-70 Agent F — Production Build Certification\n\n';
report += '**Generated:** ' + new Date().toISOString() + '\n';
report += '**Repository:** PREDICTION-ENGINE\n\n';
report += '---\n\n';

report += '## 1. Build Pipeline Summary\n\n';
report += '| Step | Command | Exit Code | Status |\n';
report += '|------|---------|-----------|--------|\n';
report += '| TypeScript typecheck | `npx tsc -p tsconfig.json --noEmit` | ' + tscResult.exitCode + ' | ' + (tscPassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| Vite production build | `npx vite build` | ' + viteResult.exitCode + ' | ' + (vitePassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| Combined pipeline | `npm run build` | ' + buildResult.exitCode + ' | ' + (buildPipelinePassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| TSC --noEmit (direct) | `npx tsc --noEmit` | ' + tscNoEmitResult.exitCode + ' | ' + (tscNoEmitResult.ok ? 'PASS' : 'FAIL') + ' |\n\n';
report += '**Overall Build Status:** ' + (overallPassed ? 'CERTIFIED' : 'NOT CERTIFIED') + '\n\n';

report += '---\n\n';
report += '## 2. TypeScript Error Summary\n\n';
report += '**Total unique TypeScript errors:** ' + uniqueTsErrors.length + '\n\n';

report += '### By Error Code\n\n';
const bucketKeys = Object.keys(buckets);
if (bucketKeys.length === 0) {
  report += '- **No TypeScript errors found**\n';
} else {
  for (const cat of bucketKeys) {
    report += '- `' + cat + '`: ' + buckets[cat].length + ' errors\n';
  }
}

report += '\n### By Severity\n\n';
report += '| Severity | Count |\n';
report += '|----------|-------|\n';
report += '| CRITICAL | ' + (bySeverity.CRITICAL ? bySeverity.CRITICAL.length : 0) + ' |\n';
report += '| HIGH     | ' + (bySeverity.HIGH ? bySeverity.HIGH.length : 0) + ' |\n';
report += '| MEDIUM   | ' + (bySeverity.MEDIUM ? bySeverity.MEDIUM.length : 0) + ' |\n';
report += '| LOW      | ' + (bySeverity.LOW ? bySeverity.LOW.length : 0) + ' |\n';
report += '| UNKNOWN  | ' + (bySeverity.UNKNOWN ? bySeverity.UNKNOWN.length : 0) + ' |\n\n';

if (hasMergeConflicts) {
  report += '### MERGE CONFLICTS DETECTED\n\n';
  report += mergeConflictFiles.length + ' file(s) contain unresolved Git merge conflict markers:\n';
  for (const f of mergeConflictFiles) {
    report += '- `' + f + '`\n';
  }
  report += '\nThese are **CRITICAL blockers** — the files contain literal `<<<<<<<`, `=======`, `>>>>>>>` markers.\n\n';
}

if (uniqueTsErrors.length === 0) {
  report += '### No errors\n\n';
} else {
  report += '### Detailed TypeScript Errors\n\n';
  report += '| Location | Code | Severity | Message | Category |\n';
  report += '|----------|------|----------|---------|----------|\n';
  for (const e of uniqueTsErrors) {
    const loc = '`' + e.file + ':' + e.line + ':' + e.col + '`';
    report += '| ' + loc + ' | ' + e.code + ' | **' + e.severity + '** | ' + escapeMarkdownTable(e.message) + ' | ' + e.category + ' |\n';
  }
  report += '\n';
}

report += '---\n\n';
report += '## 3. Dead Imports & Unused Code\n\n';
report += '### TS-flagged dead imports (TS6133 / TS6196 / TS6138)\n\n';
if (deadImportErrors.length === 0) {
  report += '**No dead imports flagged by TypeScript.**\n\n';
} else {
  for (const e of deadImportErrors) {
    report += '- `' + e.file + ':' + e.line + '` — ' + e.message + ' [TS' + e.code + ']\n';
  }
  report += '\n';
}

report += '### Heuristic unused-import candidates\n\n';
if (unusedCandidates.length === 0) {
  report += '**No heuristic candidates found.**\n\n';
} else if (unusedCandidates.length <= 50) {
  for (const u of unusedCandidates) {
    report += '- `' + u.file + '` — `' + u.importName + '`\n';
  }
  report += '\n';
} else {
  report += '(' + unusedCandidates.length + ' candidates — too many to list. Run tsc --noEmit to get precise TS6133/TS6196 errors.)\n\n';
}

report += '---\n\n';
report += '## 4. Route Analysis\n\n';
report += '### Routes Defined\n\n';
report += pageKeys.length + ' route keys in App.tsx:\n';
for (const k of pageKeys) {
  report += '- `' + k + '`\n';
}

report += '\n### Route to Component Mapping\n\n';
report += componentMapping.length + ' direct route-to-component mappings:\n';
for (const m of componentMapping) {
  report += '- `"' + m.route + '"` -> `<' + m.component + '/>`\n';
}

report += '\n### Page Components on Disk\n\n';
report += pageComponents.length + ' page components in `src/pages/`:\n';
for (const p of pageComponents) {
  report += '- `' + p + '`\n';
}

report += '\n### Missing Pages / Dead Routes\n\n';

const referencedComps = componentMapping.map(c => c.component);
const presentPages = pageComponents.map(f => f.replace(/\.(tsx|ts|jsx)$/, ''));
const viewComps = ['DashboardHub', 'AnalysisHub', 'StockCompare', 'PortfolioDoctor', 'DailyFeed', 'AcademyHub', 'AlertCentrePage',
  'CinematicTransitionLayer', 'AppLayout', 'MarketStories', 'MotionController', 'MasterMotionEngine',
  'AdaptiveColourCoordinationLayer', 'ResponsiveUIScalingLayer', 'LivingInterfaceEngine',
  'SpatialTypographyRenderingEngine', 'SpatialInterfaceReconstructionEngine',
  'SpatialEnvironmentProvider', 'IntelligenceHUD', 'SubsystemErrorBoundary', 'TokenProvider',
  'ConfidenceEngine', 'IntelligenceNavigationRail', 'AuthUXLoader'];

const notInPages = referencedComps.filter(c => !presentPages.includes(c) && !viewComps.includes(c));
const pagesNotReferenced = presentPages.filter(p => !referencedComps.includes(p));

if (notInPages.length > 0) {
  report += '**Components without matching page file:**\n';
  for (const c of notInPages) {
    report += '- `' + c + '` — imported but not found in src/pages/\n';
  }
} else {
  report += 'All App.tsx component references have matching page files.\n';
}

if (pagesNotReferenced.length > 0) {
  report += '\n**Page components not directly referenced in App.tsx:**\n';
  for (const p of pagesNotReferenced) {
    report += '- `' + p + '` — present in src/pages/ but may not be referenced\n';
  }
} else {
  report += '\nAll page components are referenced in App.tsx.\n';
}
report += '\n';

report += '---\n\n';
report += '## 5. Production Dist Directory\n\n';
report += '- **Dist directory:** ' + (distExists ? 'EXISTS (`dist/` — ' + distFileCount + ' files)' : 'NOT FOUND') + '\n';
report += '- **Vite output:** ' + (vitePassed && distExists ? 'Build produced dist artifacts.' : 'Build did not produce dist output (or failed).') + '\n\n';

report += '---\n\n';
report += '## 6. Vite Build Errors\n\n';
if (viteErrors.length === 0) {
  report += '**No Vite build errors.**\n\n';
} else {
  report += '| Location | Severity | Message |\n';
  report += '|----------|----------|---------|\n';
  for (const e of viteErrors) {
    const loc = '`' + e.file + ':' + e.line + ':' + e.col + '`';
    report += '| ' + loc + ' | ' + e.severity + ' | ' + escapeMarkdownTable(e.message) + ' |\n';
  }
  report += '\n';
}

report += '---\n\n';
report += '## 7. Raw Build Outputs\n\n';

function codeBlock(content, max) {
  const s = (content || '').slice(0, max || 5000);
  return '```\n' + (s || '(empty)') + '\n```\n\n';
}

report += '### TypeScript Check (stdout)\n';
report += codeBlock(tscResult.stdout);
report += '### TypeScript Check (stderr)\n';
report += codeBlock(tscResult.stderr);
report += '### Vite Build (stdout)\n';
report += codeBlock(viteResult.stdout);
report += '### Vite Build (stderr)\n';
report += codeBlock(viteResult.stderr);
report += '### Combined npm run build (stdout)\n';
report += codeBlock(buildResult.stdout);
report += '### Combined npm run build (stderr)\n';
report += codeBlock(buildResult.stderr);

report += '---\n\n';
report += '## 8. Verdict\n\n';
report += '**' + verdict + '**\n\n';

report += '### Build Pass/Fail Summary\n\n';
report += '| Check | Status |\n';
report += '|-------|--------|\n';
report += '| `npm run build` | ' + (buildPipelinePassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| `npx tsc -p tsconfig.json --noEmit` | ' + (tscPassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| `npx tsc --noEmit` | ' + (tscNoEmitResult.ok ? 'PASS' : 'FAIL') + ' |\n';
report += '| `npx vite build` | ' + (vitePassed ? 'PASS' : 'FAIL') + ' |\n';
report += '| Dist directory exists | ' + (distExists ? 'YES' : 'NO') + ' |\n';
report += '| Merge conflicts | ' + (hasMergeConflicts ? 'YES — BLOCKER' : 'None') + ' |\n';
report += '| Dead imports (TS-flagged) | ' + (deadImportErrors.length > 0 ? deadImportErrors.length + ' warnings' : 'None') + ' |\n';
report += '| Route completeness | Analysed |\n';
report += '| Overall Certification | ' + (overallPassed ? 'CERTIFIED' : 'NOT CERTIFIED') + ' |\n\n';

report += '---\n\n';
report += '## 9. Remediation Steps\n\n';

const steps = [];
if (hasMergeConflicts) {
  steps.push('1. **Resolve merge conflicts** in: ' + mergeConflictFiles.join(', '));
  steps.push('   - Open each file, resolve or revert with `git checkout -- <file>`');
}
if (uniqueTsErrors.length > 0) {
  const highCount = (bySeverity.CRITICAL ? bySeverity.CRITICAL.length : 0) + (bySeverity.HIGH ? bySeverity.HIGH.length : 0);
  steps.push((steps.length + 1) + '. **Fix TypeScript errors** (' + highCount + ' high/critical of ' + uniqueTsErrors.length + ' total)');
}
if (viteErrors.length > 0) {
  steps.push((steps.length + 1) + '. **Fix Vite build errors** (' + viteErrors.length + ' errors)');
}
if (deadImportErrors.length > 0) {
  steps.push((steps.length + 1) + '. **Clean up dead imports** (' + deadImportErrors.length + ' TS6133/TS6196 warnings)');
}
if (!distExists && vitePassed) {
  steps.push((steps.length + 1) + '. **Check Vite output config** — build succeeded but dist/ was not created');
}
if (overallPassed) {
  steps.push('No remediation needed. Build is production-ready.');
}

report += steps.join('\n') + '\n\n';
report += '---\n\n';
report += '*Report generated by track70_agentF_build.cjs — Track-70 Production Build Certification*\n';

fs.writeFileSync(REPORT_PATH, report, 'utf-8');

// Console summary
console.log('\n' + '='.repeat(60));
console.log('AGENT F — BUILD CERTIFICATION COMPLETE');
console.log('='.repeat(60));
console.log('Report:', REPORT_PATH);
console.log('TS errors:', uniqueTsErrors.length);
console.log('  CRITICAL:', (bySeverity.CRITICAL ? bySeverity.CRITICAL.length : 0));
console.log('  HIGH:    ', (bySeverity.HIGH ? bySeverity.HIGH.length : 0));
console.log('  MEDIUM:  ', (bySeverity.MEDIUM ? bySeverity.MEDIUM.length : 0));
console.log('  LOW:     ', (bySeverity.LOW ? bySeverity.LOW.length : 0));
if (bySeverity.UNKNOWN) console.log('  UNKNOWN: ', bySeverity.UNKNOWN.length);
console.log('Vite errors:', viteErrors.length);
console.log('Dead imports (TS):', deadImportErrors.length);
console.log('Routes defined:', pageKeys.length);
console.log('Page components:', pageComponents.length);
console.log('Merge conflicts:', hasMergeConflicts ? mergeConflictFiles.length + ' files' : 'None');
console.log('Dist exists:', distExists, '(' + distFileCount + ' files)');
console.log('Verdict:', verdict);