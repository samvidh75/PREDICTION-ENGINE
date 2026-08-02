const fs = require('fs');
const path = require('path');

let s = fs.readFileSync(path.join(__dirname, 'track16_report.cjs'), 'utf8');

// The problem: inside the template literal `...`, `\M` in `\Math.random` is being
// interpreted as an invalid escape. And `\$` in `$env:` is also a problem.
// Fix: replace the entire r8 template literal with a string concatenation version.

const oldStart = 'const r8 = `';
const newStart = "const r8 = '# Final Verdict — TRACK-16\\n\\n**Date:** ' + d + '\\n\\n## What Exact Commands Should Be Run, In What Order, To Rebuild StockStory From An Empty Database?\\n\\n```powershell\\n# STEP 1: Install & Start Portable PostgreSQL (one-time)\\ncd PREDICTION-ENGINE\\nnpx tsx src/scripts/setup-postgres.ts\\n\\n# STEP 2: Run Migrations\\n$env:DATABASE_URL=\"postgresql://postgres@localhost:5432/stockstory\"\\nnpm run migrate\\n\\n# STEP 3: Populate Universe (500 stocks, synthetic data)\\nnpx tsx src/scripts/expand-market-coverage.ts\\n\\n# STEP 4: Verify\\nnode scripts/track13a_audit.cjs\\n\\n# STEP 5: Run TRACK-13 Calibration Audit\\nnode scripts/track13_calibration_audit.cjs\\n\\n# STEP 6: Run TRACK-14 Ground Truth Validation\\nnode scripts/track14_audit.cjs\\n```\\n\\n## Key Findings\\n\\n1. **No provider API calls needed.** The pipeline uses synthetic data via Math.random() — fully self-contained.\\n2. **Single script rebuilds everything.** expand-market-coverage.ts handles all 5 population steps in order.\\n3. **The database was previously populated by this exact pipeline** — EngineCalibrationReport.md is the proof.\\n4. **Total rebuild time: ~45 minutes** (3 min PostgreSQL setup + 40 min expand + 2 min verify).\\n5. **The pipeline is deterministic and repeatable.** TRUNCATE CASCADE ensures clean state on re-runs.\\n6. **Minimum viable for TRACK-13/14: 100 symbols (~8 minutes).** Full calibration: 500 symbols (~40 minutes).\\n\\n## Warning\\n\\n**The data is synthetic.** Rankings correlate with statistical distributions of randomly generated numbers, not real-world company fundamentals. This is useful for calibration but does not validate real-world predictive power.\\n';";

// Find the start of the r8 assignment and replace everything from there to the end-of-template
const idx = s.indexOf(oldStart + '# Final Verdict');
if (idx === -1) { console.log('Could not find r8'); process.exit(1); }

// Find the end of the template literal (the closing backtick + semicolon after the string)
const afterStart = s.indexOf(oldStart, idx);
const endIdx = s.indexOf('\n`;', afterStart);
if (endIdx === -1) { console.log('Could not find end of r8'); process.exit(1); }

// Build new file
const before = s.substring(0, afterStart);
const after = s.substring(endIdx + 3); // skip past \n`;

s = before + newStart + after;

fs.writeFileSync(path.join(__dirname, 'track16_report.cjs'), s, 'utf8');
console.log('Fixed');
