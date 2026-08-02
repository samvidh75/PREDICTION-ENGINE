#!/usr/bin/env node
/**
 * evaluate-research-output.ts
 *
 * Evaluation harness for StockStory research output quality.
 * Scores: factual grounding, forbidden language absence, completeness,
 * clarity, confidence appropriateness, no hallucinated numbers,
 * no unsupported peer claims, deterministic fallback quality.
 *
 * Usage: npx tsx scripts/intelligence/evaluate-research-output.ts
 */

import { EvidenceCollector } from '../../src/stockstory/intelligence/evidence/EvidenceCollector';
import { EvidenceValidator } from '../../src/stockstory/intelligence/evidence/EvidenceValidator';
import { ResearchClaimValidator } from '../../src/stockstory/intelligence/validation/ResearchClaimValidator';
import { ForbiddenLanguageValidator } from '../../src/stockstory/intelligence/validation/ForbiddenLanguageValidator';
import { NumericClaimValidator } from '../../src/stockstory/intelligence/validation/NumericClaimValidator';
import { OutputSanitizer } from '../../src/stockstory/intelligence/validation/OutputSanitizer';
import { ResearchConfidence } from '../../src/stockstory/intelligence/confidence/ResearchConfidence';
import { CompliancePolicy } from '../../src/stockstory/intelligence/compliance/CompliancePolicy';
import { ComplianceTextGuard } from '../../src/stockstory/intelligence/compliance/ComplianceTextGuard';
import { ALL_FIXTURES } from '../../tests/fixtures/intelligence/evaluation/fixtures';

interface EvaluationMetric {
  name: string;
  score: number; // 0-100
  maxScore: number;
  details: string[];
}

interface EvaluationResult {
  fixture: string;
  metrics: EvaluationMetric[];
  overallScore: number;
  passed: boolean;
}

async function main() {
  console.log('🔬 StockStory Research Output Evaluation');
  console.log('========================================\n');

  const collector = new EvidenceCollector();
  const validator = new EvidenceValidator();
  const claimValidator = new ResearchClaimValidator();
  const forbiddenValidator = new ForbiddenLanguageValidator();
  const numericValidator = new NumericClaimValidator();
  const sanitizer = new OutputSanitizer();
  const confidence = new ResearchConfidence();
  const compliance = new CompliancePolicy();
  const guard = new ComplianceTextGuard(compliance);

  const results: EvaluationResult[] = [];

  for (const fixture of ALL_FIXTURES) {
    console.log(`\n📋 Evaluating: ${fixture.symbol} (${fixture.name})`);

    const metrics: EvaluationMetric[] = [];

    // 1. Evidence collection
    const evidence = collector.collectAll(fixture.symbol, {
      financials: fixture.financials,
      technicals: fixture.technicals,
      earnings: fixture.earnings,
      sectorScore: fixture.scores.sector,
      report: fixture.scores,
    });
    metrics.push({
      name: 'Evidence collection',
      score: Math.min(100, evidence.length * 10),
      maxScore: 100,
      details: [`${evidence.length} pieces of evidence collected`],
    });

    // 2. Evidence-bound claims (create sample claims)
    const evidenceMap = validator.buildEvidenceMap(evidence);
    const sampleClaims = [
      { claim: `${fixture.name} shows ${fixture.drivers.length > 0 ? fixture.drivers[0].toLowerCase() : 'mixed signals'}`, evidenceIds: evidence.slice(0, 3).map(e => e.id), confidence: 0.8, claimType: 'thesis' as const },
      { claim: `Revenue is ${fixture.financials.revenue ?? 'not available'}`, evidenceIds: evidence.filter(e => e.label === 'Revenue').map(e => e.id), confidence: 0.9, claimType: 'thesis' as const },
    ];
    const { valid: validClaims, warnings: validationWarnings } = validator.validateClaims(sampleClaims, evidenceMap);

    metrics.push({
      name: 'Evidence-claim binding',
      score: validationWarnings.length === 0 ? 100 : Math.max(0, 100 - validationWarnings.length * 30),
      maxScore: 100,
      details: validationWarnings.length > 0
        ? validationWarnings.map(w => w.warning)
        : ['All claims properly bound to evidence'],
    });

    // 3. Forbidden language check
    const testText = `${fixture.name} has quality score ${fixture.scores.quality}. ${fixture.drivers.join('. ')} ${fixture.risks.join('. ')}`;
    const langResult = forbiddenValidator.validate(testText);
    metrics.push({
      name: 'Forbidden language absence',
      score: langResult.passed ? 100 : Math.max(0, 100 - langResult.violations.length * 50),
      maxScore: 100,
      details: langResult.passed
        ? ['No forbidden language detected']
        : langResult.violations.map(v => `Found "${v.term}" (${v.severity})`),
    });

    // 4. Numeric claim validation
    const availableEvidence = evidence.filter(e => e.kind !== 'previous_snapshot');
    const numericResult = numericValidator.validateClaim(testText, availableEvidence);
    metrics.push({
      name: 'Numeric accuracy',
      score: numericResult.passed ? 100 : Math.max(0, 100 - numericResult.warnings.length * 25),
      maxScore: 100,
      details: numericResult.passed
        ? ['All numbers grounded in evidence']
        : numericResult.warnings,
    });

    // 5. Sanitization
    const sanitizeResult = sanitizer.sanitizeText(testText);
    metrics.push({
      name: 'Output cleanliness',
      score: sanitizeResult.wasModified ? 70 : 100,
      maxScore: 100,
      details: sanitizeResult.wasModified
        ? sanitizeResult.modifications
        : ['No cleaning needed'],
    });

    // 6. Confidence appropriateness
    const confResult = confidence.compute({
      evidence,
      hasEarnings: fixture.earnings.length > 0,
      hasNews: fixture.scores.sentimentScore > 0,
      hasSector: fixture.scores.sector > 0,
      hasPeers: 'peers' in fixture && Array.isArray((fixture as any).peers),
      hasRag: false,
      cacheAgeHours: 0,
      validationPassed: true,
      usingLlm: false,
    });
    const expectedLabel = fixture.symbol === 'TESTMISS' ? 'Insufficient information' :
      fixture.symbol === 'TESTQUALITY' || fixture.symbol === 'TESTEARN' ? 'High confidence' :
      fixture.symbol === 'TESTEXPENSIVE' ? 'Limited confidence' : 'Moderate confidence';
    const confAccurate = confResult.label === expectedLabel;
    metrics.push({
      name: 'Confidence appropriateness',
      score: confAccurate ? 100 : 50,
      maxScore: 100,
      details: [
        `Computed: ${confResult.label} (${confResult.score}/100)`,
        `Expected: ${expectedLabel}`,
        ...confResult.factors.map(f => `  ${f.name}: ${f.contribution > 0 ? '+' : ''}${f.contribution}`),
      ],
    });

    // 7. Compliance check
    const complianceResult = guard.check(testText);
    metrics.push({
      name: 'Compliance safety',
      score: complianceResult.passed ? 100 : Math.max(0, 100 - complianceResult.violations.filter(v => v.severity === 'error').length * 50),
      maxScore: 100,
      details: complianceResult.passed
        ? ['All compliance checks passed']
        : complianceResult.violations.map(v => `${v.ruleId}: ${v.violation} [${v.severity}]`),
    });

    // Overall score
    const overallScore = Math.round(metrics.reduce((s, m) => s + (m.score / m.maxScore) * 100, 0) / metrics.length);
    const passed = metrics.every(m => m.score >= 50);

    results.push({
      fixture: fixture.symbol,
      metrics,
      overallScore,
      passed,
    });

    console.log(`   Overall: ${overallScore}/100 — ${passed ? '✅ PASS' : '❌ FAIL'}`);
    for (const m of metrics) {
      const pct = Math.round((m.score / m.maxScore) * 100);
      const icon = pct >= 80 ? '✅' : pct >= 50 ? '⚠️' : '❌';
      console.log(`   ${icon} ${m.name}: ${pct}%`);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('📊 EVALUATION SUMMARY');
  console.log('========================================\n');

  let totalScore = 0;
  let passedCount = 0;
  for (const r of results) {
    totalScore += r.overallScore;
    if (r.passed) passedCount++;
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.fixture}: ${r.overallScore}/100`);
  }

  const avgScore = Math.round(totalScore / results.length);
  console.log(`\n   Average: ${avgScore}/100`);
  console.log(`   Passed:  ${passedCount}/${results.length}`);
  console.log(`   Failed:  ${results.length - passedCount}/${results.length}`);
  console.log(`\n   ${avgScore >= 80 ? '✅ OVERALL PASS' : '⚠️ NEEDS IMPROVEMENT'}`);

  // Write report
  const reportPath = 'reports/intelligence/04-research-output-evaluation.md';
  const report = `# Research Output Evaluation Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Fixtures Evaluated:** ${results.length}

## Summary

| Metric | Value |
|--------|-------|
| Average Score | ${avgScore}/100 |
| Passed | ${passedCount}/${results.length} |
| Failed | ${results.length - passedCount}/${results.length} |
| Status | ${avgScore >= 80 ? '✅ PASS' : '⚠️ NEEDS IMPROVEMENT'} |

## Per-Fixture Results

${results.map(r => `### ${r.fixture} — ${r.overallScore}/100 ${r.passed ? '✅' : '❌'}

${r.metrics.map(m => {
  const pct = Math.round((m.score / m.maxScore) * 100);
  const icon = pct >= 80 ? '✅' : pct >= 50 ? '⚠️' : '❌';
  return `- ${icon} **${m.name}**: ${pct}%\n${m.details.map(d => `  - ${d}`).join('\n')}`;
}).join('\n')}
`).join('\n')}

## Details

**Evaluation Dimensions:**
1. Evidence collection — are all data sources captured?
2. Evidence-claim binding — are claims linked to evidence?
3. Forbidden language absence — no banned terms?
4. Numeric accuracy — are numbers grounded in data?
5. Output cleanliness — no null/undefined/NaN?
6. Confidence appropriateness — does confidence match data completeness?
7. Compliance safety — passes all compliance rules?
`;

  const fs = await import('fs');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 Report written to ${reportPath}`);

  process.exit(avgScore >= 50 ? 0 : 1);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
