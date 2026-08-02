/**
 * AGENT A — FULL REPOSITORY REALITY AUDIT
 * 
 * Audits every source file, script, provider, route, migration, and engine.
 * Classifies into KEEP / MERGE / DELETE.
 * Produces: reports/track-44/01-RepositoryRealityAudit.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = process.env.TRACK44_REPORTS_DIR || path.join(ROOT, 'reports', 'track-44');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const REPORT_PATH = path.join(REPORTS_DIR, '01-RepositoryRealityAudit.md');

function walkDir(dir, extensions = null, exclude = ['node_modules', '.git', 'dist', '.vite', 'data', 'reports', '__pycache__']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, extensions, exclude));
    } else if (entry.isFile()) {
      if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// Category rules
function classifyFile(filePath, relativePath, allFiles) {
  const rel = relativePath.replace(/\\/g, '/');
  const fileName = path.basename(filePath);
  
  // TEMP FILES — definitely DELETE
  if (fileName.startsWith('temp_') || fileName.startsWith('tmp_')) {
    return { classification: 'DELETE', reason: 'Temporary/scratch file' };
  }
  if (rel.includes('/temp_') || rel.includes('/tmp_')) {
    return { classification: 'DELETE', reason: 'Temporary/scratch file' };
  }
  
  // DUPLICATE SCRIPTS — track scripts with same purpose
  if (rel.startsWith('scripts/')) {
    const trackScripts = allFiles.filter(f => 
      f.replace(/\\/g, '/').startsWith('scripts/') && 
      /track\d/i.test(path.basename(f))
    );
    // Multiple scripts for same track number → MERGE or DELETE older ones
    const trackNum = fileName.match(/track(\d+)/i);
    if (trackNum) {
      const num = parseInt(trackNum[1]);
      const similar = trackScripts.filter(s => {
        const match = path.basename(s).match(/track(\d+)/i);
        return match && parseInt(match[1]) === num;
      });
      if (similar.length > 1 && similar[0] !== filePath) {
        // This is not the primary track script → potentially DELETE if newer one exists
        const primary = similar.find(s => path.basename(s).includes('executor')) || similar[similar.length - 1];
        if (filePath !== primary) {
          return { classification: 'DELETE', reason: `Duplicate for track-${num}; primary: ${path.basename(primary)}` };
        }
      }
    }
  }
  
  // OLD TRACK SCRIPTS (tracks before 30) — historical, likely safe to DELETE after report generation
  if (fileName.match(/track([12]\d|30)_/) && !fileName.includes('executor')) {
    return { classification: 'DELETE', reason: 'Old track script; report already generated' };
  }
  
  // REPORT FILES — KEEP (already generated)
  if (rel.startsWith('reports/')) {
    return { classification: 'KEEP', reason: 'Generated report — historical record' };
  }
  
  // SOURCE files in src/ — KEEP
  if (rel.startsWith('src/')) {
    // Check for unused imports later
    return { classification: 'KEEP', reason: 'Source code' };
  }
  
  // Root configs/index.html — KEEP
  if (['index.html', 'package.json', 'tsconfig.json', 'postcss.config.js', 
       'tailwind.config.js', 'Dockerfile', 'docker-compose.yml', 'render.yaml',
       'nginx.conf', '.gitignore'].includes(fileName)) {
    return { classification: 'KEEP', reason: 'Core configuration' };
  }
  
  // Root .md files — KEEP if recent, DELETE if old audit/fix reports
  if (fileName.endsWith('.md')) {
    if (fileName.includes('_REPORT') || fileName.includes('_AUDIT') || fileName.includes('_REVIEW')) {
      return { classification: 'DELETE', reason: 'Old audit report — can be regenerated' };
    }
    // Framework/core docs — KEEP
    if (['README.md', 'DEPLOYMENT_GUIDE.md', 'BETA_TESTER_GUIDE.md', 'BETA_LAUNCH_CHECKLIST.md',
         'CLOSED_BETA_READINESS_REPORT.md'].includes(fileName)) {
      return { classification: 'KEEP', reason: 'Core documentation' };
    }
    return { classification: 'DELETE', reason: 'Intermediate audit/fix document' };
  }
  
  // Python scripts
  if (fileName.endsWith('.py')) {
    return { classification: 'KEEP', reason: 'Python bridge script' };
  }
  
  return { classification: 'REVIEW', reason: 'Unclassified — needs manual review' };
}

function countByClassification(classifications) {
  const counts = { KEEP: 0, MERGE: 0, DELETE: 0, REVIEW: 0 };
  for (const c of classifications) { counts[c.classification]++; }
  return counts;
}

function generateReport() {
  console.log('Agent A: Starting repository reality audit...');
  
  const allFiles = walkDir(ROOT);
  const srcFiles = walkDir(path.join(ROOT, 'src'));
  const scriptFiles = walkDir(path.join(ROOT, 'scripts'));
  const reportFiles = walkDir(path.join(ROOT, 'reports'));
  const rootMdFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'));
  const migrationFiles = walkDir(path.join(ROOT, 'src', 'db', 'migrations'));
  
  const allFilePaths = allFiles.map(f => f.replace(/\\/g, '/'));
  
  const fileClassifications = [];
  const bySource = {};
  
  for (const file of allFiles) {
    const rel = path.relative(ROOT, file);
    const cls = classifyFile(file, rel, allFilePaths);
    fileClassifications.push({ file: rel, ...cls });
    
    const ext = path.extname(file) || '(none)';
    if (!bySource[ext]) bySource[ext] = { KEEP: 0, MERGE: 0, DELETE: 0, REVIEW: 0 };
    bySource[ext][cls.classification]++;
  }
  
  const counts = countByClassification(fileClassifications);
  const deleteList = fileClassifications.filter(c => c.classification === 'DELETE');
  const mergeList = fileClassifications.filter(c => c.classification === 'MERGE');
  const reviewList = fileClassifications.filter(c => c.classification === 'REVIEW');
  const keepList = fileClassifications.filter(c => c.classification === 'KEEP');
  
  const totalFiles = allFiles.length;
  const cleanupPct = ((counts.DELETE + counts.MERGE) / totalFiles * 100).toFixed(1);
  
  // Directory breakdown
  const dirBreakdown = {};
  for (const cls of fileClassifications) {
    const dir = path.dirname(cls.file) || '(root)';
    if (!dirBreakdown[dir]) dirBreakdown[dir] = { KEEP: 0, MERGE: 0, DELETE: 0, REVIEW: 0, total: 0 };
    dirBreakdown[dir][cls.classification]++;
    dirBreakdown[dir].total++;
  }
  
  // Detect unused files
  const unusedFiles = [];
  for (const cls of fileClassifications) {
    if (cls.classification === 'KEEP' && cls.file.startsWith('src/')) {
      const fileName = path.basename(cls.file, path.extname(cls.file));
      const importedIn = allFilePaths.filter(f => {
        try {
          const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
          return content.includes(fileName);
        } catch { return false; }
      });
      if (importedIn.length <= 1) {
        unusedFiles.push({ file: cls.file, importedBy: importedIn.filter(f => f !== cls.file) });
      }
    }
  }
  
  const report = `# Repository Reality Audit — TRACK-44 Agent A

**Generated:** ${new Date().toISOString()}
**Root:** ${ROOT}
**Total Files Audited:** ${totalFiles}

---

## Executive Summary

| Classification | Count | % |
|---------------|-------|---|
| KEEP | ${counts.KEEP} | ${(counts.KEEP/totalFiles*100).toFixed(1)}% |
| MERGE | ${counts.MERGE} | ${(counts.MERGE/totalFiles*100).toFixed(1)}% |
| DELETE | ${counts.DELETE} | ${(counts.DELETE/totalFiles*100).toFixed(1)}% |
| REVIEW | ${counts.REVIEW} | ${(counts.REVIEW/totalFiles*100).toFixed(1)}% |

**Cleanup Opportunity:** ${cleanupPct}% (${counts.DELETE + counts.MERGE} files out of ${totalFiles})
**Target Range:** 20-40% → ${cleanupPct >= 20 ? 'MET' : 'BELOW TARGET'}

---

## File Type Breakdown

| Extension | Source Files | Scripts | Config | Reports | Other |
|-----------|-------------|---------|--------|---------|-------|
| .ts | ${srcFiles.filter(f => f.endsWith('.ts')).length} | ${scriptFiles.filter(f => f.endsWith('.ts')).length} | 0 | 0 | 0 |
| .tsx | ${srcFiles.filter(f => f.endsWith('.tsx')).length} | 0 | 0 | 0 | 0 |
| .cjs | ${srcFiles.filter(f => f.endsWith('.cjs')).length} | ${scriptFiles.filter(f => f.endsWith('.cjs')).length} | 0 | 0 | 0 |
| .js | ${srcFiles.filter(f => f.endsWith('.js')).length} | ${scriptFiles.filter(f => f.endsWith('.js')).length} | 0 | 0 | 0 |
| .md | 0 | 0 | 0 | ${reportFiles.length} | ${rootMdFiles.length} |
| .sql | ${migrationFiles.length} | 0 | 0 | 0 | 0 |

---

## Source Files: ${srcFiles.length}
- TypeScript (.ts): ${srcFiles.filter(f => f.endsWith('.ts')).length}
- TypeScript React (.tsx): ${srcFiles.filter(f => f.endsWith('.tsx')).length}
- JavaScript (.js/.cjs): ${srcFiles.filter(f => f.endsWith('.js') || f.endsWith('.cjs')).length}

## Scripts: ${scriptFiles.length}
- TypeScript: ${scriptFiles.filter(f => f.endsWith('.ts')).length}
- CommonJS: ${scriptFiles.filter(f => f.endsWith('.cjs')).length}
- Python: ${scriptFiles.filter(f => f.endsWith('.py')).length}

## Migrations: ${migrationFiles.length}
${migrationFiles.map(f => `- ${path.basename(f)}`).join('\n')}

## Reports: ${reportFiles.length + rootMdFiles.length}
(reports/ + root .md files combined)

---

## Potential Unused Source Files

${unusedFiles.length > 0 ? unusedFiles.map(u => `- **${u.file}** — imported only by: ${u.importedBy.join(', ') || '(none)'}`).join('\n') : 'None detected (all files referenced by at least one other file)'}

---

## DELETE Candidates (${counts.DELETE} files)

${deleteList.slice(0, 50).map(d => `- [ ] ${d.file} — ${d.reason}`).join('\n')}
${deleteList.length > 50 ? `\n... and ${deleteList.length - 50} more` : ''}

---

## MERGE Candidates (${counts.MERGE} files)

${mergeList.map(m => `- [ ] ${m.file} — ${m.reason}`).join('\n') || 'None'}

---

## REVIEW Required (${counts.REVIEW} files)

${reviewList.map(r => `- [x] ${r.file} — ${r.reason}`).join('\n') || 'None'}

---

## Directory Breakdown

| Directory | KEEP | MERGE | DELETE | REVIEW | Total |
|-----------|------|-------|--------|--------|-------|
${Object.entries(dirBreakdown).sort((a, b) => b[1].total - a[1].total).slice(0, 30).map(([dir, counts]) => 
  `| ${dir} | ${counts.KEEP} | ${counts.MERGE} | ${counts.DELETE} | ${counts.REVIEW} | ${counts.total} |`
).join('\n')}

---

## Recommendations

1. **Immediate Cleanup:** Delete ${counts.DELETE} files marked as temporary/obsolete
2. **Merge Review:** ${counts.MERGE} files are candidates for consolidation
3. **Manual Review:** ${counts.REVIEW} files need human classification
4. **Migration Audit:** ${migrationFiles.length} SQL migrations — verify all are applied
5. **Script Consolidation:** ${scriptFiles.filter(f => /track\d/i.test(path.basename(f))).length} track-specific scripts — archive after Track-44

## Overall Assessment

Estimated cleanup: ${cleanupPct}% of codebase is eligible for removal or consolidation.
This ${cleanupPct >= 20 ? 'meets' : 'falls short of'} the 20-40% target.
`;
  
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Agent A: Report written to ${REPORT_PATH}`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  KEEP: ${counts.KEEP} | MERGE: ${counts.MERGE} | DELETE: ${counts.DELETE} | REVIEW: ${counts.REVIEW}`);
  console.log(`  Cleanup opportunity: ${cleanupPct}%`);
}

generateReport();
