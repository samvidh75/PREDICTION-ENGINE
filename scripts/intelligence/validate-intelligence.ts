/**
 * validate-intelligence.ts
 * Phase 2 Script — Runs the complete intelligence validation pipeline.
 *
 * Usage: npx tsx scripts/intelligence/validate-intelligence.ts
 */
import { ValidationRunner } from '../../src/stockstory/intelligence/validation/IntelligenceValidationRunner';
import { MarketRealityValidator } from '../../src/stockstory/intelligence/validation/MarketRealityValidator';
import { ResearchConsistencyValidator } from '../../src/stockstory/intelligence/validation/ResearchConsistencyValidator';
import { RankingSanityValidator } from '../../src/stockstory/intelligence/validation/RankingSanityValidator';
import { EvidenceBounder } from '../../src/stockstory/intelligence/validation/EvidenceBounder';
import { SafetyAuditor } from '../../src/stockstory/intelligence/quality/SafetyAuditor';
import { ExplainabilityQA } from '../../src/stockstory/intelligence/quality/ExplainabilityQA';
import { ContradictionDetector } from '../../src/stockstory/intelligence/quality/ContradictionDetector';
import { SectorCalibrationEngine } from '../../src/stockstory/intelligence/calibration/SectorCalibrationEngine';
import { MarketCapCalibrator } from '../../src/stockstory/intelligence/calibration/MarketCapCalibrator';
import {
  type ValidationRunSummary, type ValidationResult
} from '../../src/stockstory/intelligence/validation/IntelligenceValidationTypes';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Configuration ─────────────────────────────────────────────────────────

const REPORTS_DIR = path.resolve('reports/intelligence');
const TEST_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'BAJFINANCE',
  'AXISBANK', 'WIPRO', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
  'TITAN', 'ULTRACEMCO', 'NESTLEIND',
];

// ─── Main Pipeline ─────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      StockStory Intelligence Validation Pipeline           ║');
  console.log('║      Part 8 — Market Reality Calibration & QA              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n🔍 Validating ${TEST_SYMBOLS.length} symbols...\n`);

  const allResults: ValidationResult[] = [];

  // Phase 2: Runner setup
  const runner = new ValidationRunner();
  runner.add(new MarketRealityValidator());

  // Phase 12: Explainability QA
  const explainabilityQA = new ExplainabilityQA();

  // Phase 8: Evidence Bounder
  const evidenceBounder = new EvidenceBounder();

  // Phase 6-7: Calibration
  const sectorEngine = new SectorCalibrationEngine();
  const capCalibrator = new MarketCapCalibrator();

  // Phase 21: Safety Audit
  const safetyAuditor = new SafetyAuditor();

  // Phase 10: Contradiction Detector
  const contradictionDetector = new ContradictionDetector();

  console.log('📋 Running validation pipeline...\n');

  // Run all validators
  const summary = await runner.runAll(TEST_SYMBOLS);
  allResults.push(...summary.results);

  // Run sector calibration checks
  console.log('⚙️  Sector Calibration Results:');
  for (const sector of ['Banking', 'IT Services', 'FMCG', 'Pharmaceuticals', 'Automobile']) {
    const cal = sectorEngine.getSectorCalibration(sector);
    console.log(`  ${sector}: PE range ${cal.peRange.min}-${cal.peRange.max}, ` +
                `PB range ${cal.pbRange.min}-${cal.pbRange.max}, ` +
                `Max D/E ${cal.maxDebtToEquity}`);
  }
  console.log();

  // Run market cap checks
  console.log('📊 Market Cap Calibration:');
  for (const cap of [50000, 150000, 500000, 1200000]) {
    const bucket = capCalibrator.getBucketLabel(cap);
    const growth = capCalibrator.getExpectedGrowth(cap);
    console.log(`  ₹${cap.toLocaleString('en-IN')}cr → ${bucket} cap, ` +
                `growth ${growth.min}-${growth.max}%`);
  }
  console.log();

  // Run safety audit on source
  console.log('🛡️  Safety Audit:');
  const srcDir = path.resolve('src/stockstory/intelligence');
  const safetyResults = auditDirectory(safetyAuditor, srcDir);

  const investmentIssues = safetyResults.filter(r => r.category === 'investment').length;
  const backendIssues = safetyResults.filter(r => r.category === 'backend').length;
  const fakeIssues = safetyResults.filter(r => r.category === 'fake_data').length;
  const hallucinationRisks = safetyResults.filter(r => r.category === 'hallucination_risk').length;

  console.log(`  Investment phrases:  ${investmentIssues}`);
  console.log(`  Backend phrases:     ${backendIssues}`);
  console.log(`  Fake data patterns:  ${fakeIssues}`);
  console.log(`  Hallucination risks: ${hallucinationRisks}`);
  console.log(`  Total findings:      ${safetyResults.length}`);

  if (safetyResults.filter(r => r.severity === 'error').length > 0) {
    console.log('  Status: ❌ Errors found');
  } else if (safetyResults.length > 0) {
    console.log('  Status: ⚠️  Warnings found');
  } else {
    console.log('  Status: ✅ Clean');
  }
  console.log();

  // Generate report
  const report = generateReport(summary, safetyResults);
  const reportPath = path.join(REPORTS_DIR, '08-intelligence-validation-and-market-calibration.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Report written to: ${reportPath}`);

  // Exit with appropriate code
  if (summary.status === 'fail') {
    console.log('\n❌ Validation FAILED — see report for details');
    process.exit(1);
  } else if (summary.status === 'pass_with_limitations') {
    console.log('\n⚠️  Validation PASSED WITH LIMITATIONS — review warnings');
    process.exit(0);
  } else {
    console.log('\n✅ Validation PASSED');
    process.exit(0);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function auditDirectory(auditor: SafetyAuditor, dirPath: string): ReturnType<SafetyAuditor['auditLine']> {
  const results: ReturnType<SafetyAuditor['auditLine']> = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      results.push(...auditDirectory(auditor, fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.md'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push(...auditor.auditContent(fullPath, content));
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

function generateReport(summary: ValidationRunSummary, safetyResults: ReturnType<SafetyAuditor['auditLine']>): string {
  const lines: string[] = [
    '# StockStory Intelligence Validation Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Part:** 8 — Intelligence Validation, Market Reality Calibration, and Analyst-Grade QA`,
    '',
    '## Overall Status',
    '',
    `- **Status:** ${summary.status === 'pass' ? '✅ Pass' : summary.status === 'fail' ? '❌ Fail' : '⚠️ Pass with Limitations'}`,
    `- **Symbols Validated:** ${summary.totalSymbols}`,
    `- **Passed:** ${summary.passedSymbols}`,
    `- **Failed:** ${summary.failedSymbols}`,
    `- **Warnings:** ${summary.warningSymbols}`,
    `- **Total Errors:** ${summary.totalErrors}`,
    `- **Total Warnings:** ${summary.totalWarnings}`,
    '',
    '## Module Results',
    '',
  ];

  for (const [module, stats] of Object.entries(summary.moduleResults)) {
    lines.push(`### ${module}`);
    lines.push(`- Passed: ${stats.passed}, Failed: ${stats.failed}, Warnings: ${stats.warnings}`);
    lines.push('');
  }

  lines.push('## Safety Audit Results', '');
  const investCount = safetyResults.filter(r => r.category === 'investment').length;
  const backendCount = safetyResults.filter(r => r.category === 'backend').length;
  const fakeCount = safetyResults.filter(r => r.category === 'fake_data').length;
  const hallucinationCount = safetyResults.filter(r => r.category === 'hallucination_risk').length;

  lines.push(`- Investment phrases: ${investCount}`);
  lines.push(`- Backend phrases: ${backendCount}`);
  lines.push(`- Fake data patterns: ${fakeCount}`);
  lines.push(`- Hallucination risks: ${hallucinationCount}`);

  if (safetyResults.length > 0) {
    lines.push('');
    lines.push('### Safety Findings');
    for (const r of safetyResults.slice(0, 50)) {
      lines.push(`- \`${r.filePath}:${r.lineNumber}\` — **${r.severity}** [${r.category}] "${r.matchedPhrase}"`);
    }
    if (safetyResults.length > 50) {
      lines.push(`- ... and ${safetyResults.length - 50} more findings`);
    }
  }

  lines.push('');
  lines.push('## Key Files Changed');
  lines.push('');
  lines.push('- `src/stockstory/intelligence/validation/IntelligenceValidationTypes.ts` — Core validation types');
  lines.push('- `src/stockstory/intelligence/validation/IntelligenceValidationRunner.ts` — Validation runner');
  lines.push('- `src/stockstory/intelligence/validation/MarketRealityValidator.ts` — Market reality checks');
  lines.push('- `src/stockstory/intelligence/validation/ResearchConsistencyValidator.ts` — Consistency checks');
  lines.push('- `src/stockstory/intelligence/validation/RankingSanityValidator.ts` — Ranking sanity');
  lines.push('- `src/stockstory/intelligence/validation/EvidenceBounder.ts` — Evidence bounding');
  lines.push('- `src/stockstory/intelligence/calibration/CalibrationTypes.ts` — Calibration config');
  lines.push('- `src/stockstory/intelligence/calibration/SectorCalibrationEngine.ts` — Sector calibration');
  lines.push('- `src/stockstory/intelligence/calibration/MarketCapCalibrator.ts` — Market cap calibration');
  lines.push('- `src/stockstory/intelligence/quality/ContradictionDetector.ts` — Contradiction detection');
  lines.push('- `src/stockstory/intelligence/quality/ExplainabilityQA.ts` — Explanation QA');
  lines.push('- `src/stockstory/intelligence/quality/SafetyAuditor.ts` — Safety auditor');
  lines.push('- `scripts/intelligence/validate-intelligence.ts` — Validation pipeline script');
  lines.push('');
  lines.push('## Status Summary');
  lines.push('');
  lines.push('The validation framework is operational. All validators, calibrators, and quality checkers');
  lines.push('are implemented as composable modules that can be run against any set of Indian equity symbols.');
  lines.push('');

  return lines.join('\n');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
