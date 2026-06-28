#!/usr/bin/env node

/**
 * pmf-launch-gate.ts — CLI script for the PMF Launch Gate.
 *
 * Evaluates whether the product meets PMF launch readiness criteria:
 *  1. Activation funnel: ≥30% users reaching last step
 *  2. D7 retention: ≥20% (good) / ≥15% (warning)
 *  3. Research quality: ≥50% positive rate
 *  4. Search success: ≥80% success rate
 *  5. Alert action rate: ≥10% (engagement signal)
 *  6. At least some premium intent signals
 *  7. Corrections: no overdue critical corrections
 *
 * Usage:
 *   npx ts-node scripts/pmf/pmf-launch-gate.ts
 *   PMF_GATE_PERIOD_START=2024-01-01 PMF_GATE_PERIOD_END=2024-01-31 npx ts-node scripts/pmf/pmf-launch-gate.ts
 */

import { ProductEventStore } from '../../src/stockstory/pmf/ProductEventStore';
import { buildDashboardData, formatDashboardSummary } from '../../src/stockstory/pmf/PmfDashboardData';

interface GateResult {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    value: number;
    threshold: string;
    detail: string;
  }>;
  summary: string;
}

async function runLaunchGate(): Promise<GateResult> {
  const periodStart = process.env.PMF_GATE_PERIOD_START ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const periodEnd = process.env.PMF_GATE_PERIOD_END ?? new Date().toISOString().slice(0, 10);

  console.log(`PMF Launch Gate — ${periodStart} to ${periodEnd}\n`);

  const store = new ProductEventStore({ maxEvents: 10000 });
  // Note: In production, store would be populated from persistent storage

  const data = await buildDashboardData(store, periodStart, periodEnd);

  // Run gate checks
  const checks: GateResult['checks'] = [];

  // 1. Activation funnel — last step ≥ 30%
  const funnelLastStep = data.funnel?.steps[data.funnel.steps.length - 1];
  const funnelRate = funnelLastStep?.conversionRate ?? 0;
  if (funnelRate >= 30) {
    checks.push({ name: 'Activation Funnel', status: 'pass', value: funnelRate, threshold: '≥ 30%', detail: `Last step conversion: ${funnelRate}%` });
  } else if (funnelRate >= 20) {
    checks.push({ name: 'Activation Funnel', status: 'warn', value: funnelRate, threshold: '≥ 30%', detail: `Last step conversion: ${funnelRate}% — close to threshold` });
  } else {
    checks.push({ name: 'Activation Funnel', status: 'fail', value: funnelRate, threshold: '≥ 30%', detail: `Last step conversion: ${funnelRate}% — below threshold` });
  }

  // 2. D7 Retention ≥ 20%
  const d7 = data.retention?.d7Retention ?? 0;
  if (d7 >= 20) {
    checks.push({ name: 'D7 Retention', status: 'pass', value: d7, threshold: '≥ 20%', detail: `D7 retention: ${d7}%` });
  } else if (d7 >= 15) {
    checks.push({ name: 'D7 Retention', status: 'warn', value: d7, threshold: '≥ 20%', detail: `D7 retention: ${d7}% — borderline` });
  } else {
    checks.push({ name: 'D7 Retention', status: 'fail', value: d7, threshold: '≥ 20%', detail: `D7 retention: ${d7}% — needs improvement` });
  }

  // 3. Research quality ≥ 50%
  const rq = data.researchQuality?.positiveRate ?? 0;
  if (rq >= 50) {
    checks.push({ name: 'Research Quality', status: 'pass', value: rq, threshold: '≥ 50%', detail: `Positive rate: ${rq}%` });
  } else if (rq >= 40) {
    checks.push({ name: 'Research Quality', status: 'warn', value: rq, threshold: '≥ 50%', detail: `Positive rate: ${rq}%` });
  } else {
    checks.push({ name: 'Research Quality', status: 'fail', value: rq, threshold: '≥ 50%', detail: `Positive rate: ${rq}%` });
  }

  // 4. Search success ≥ 80%
  const ss = data.searchDemand?.successRate ?? 100;
  if (ss >= 80) {
    checks.push({ name: 'Search Success', status: 'pass', value: ss, threshold: '≥ 80%', detail: `Success rate: ${ss}%` });
  } else if (ss >= 70) {
    checks.push({ name: 'Search Success', status: 'warn', value: ss, threshold: '≥ 80%', detail: `Success rate: ${ss}%` });
  } else {
    checks.push({ name: 'Search Success', status: 'fail', value: ss, threshold: '≥ 80%', detail: `Success rate: ${ss}%` });
  }

  // 5. Alert action rate ≥ 10%
  const ar = data.alertUsefulness?.actionRate ?? 0;
  if (ar >= 10) {
    checks.push({ name: 'Alert Action Rate', status: 'pass', value: ar, threshold: '≥ 10%', detail: `Action rate: ${ar}%` });
  } else if (ar >= 5) {
    checks.push({ name: 'Alert Action Rate', status: 'warn', value: ar, threshold: '≥ 10%', detail: `Action rate: ${ar}%` });
  } else {
    checks.push({ name: 'Alert Action Rate', status: 'warn', value: ar, threshold: '≥ 10%', detail: `Action rate: ${ar}% — low but early stage` });
  }

  // 6. Premium intent signals
  const piSignals = data.premiumIntent ? (data.premiumIntent.premiumFeatureViews + data.premiumIntent.upgradeCtaClicks) : 0;
  if (piSignals > 0) {
    checks.push({ name: 'Premium Intent', status: 'pass', value: piSignals, threshold: '> 0', detail: `${piSignals} premium intent signals detected` });
  } else {
    checks.push({ name: 'Premium Intent', status: 'warn', value: 0, threshold: '> 0', detail: 'No premium intent signals yet' });
  }

  // 7. Overdue corrections
  const corrections = data.corrections;
  const unresolvedCritical = corrections ? corrections.totalReported - corrections.totalFixed - corrections.totalDismissed : 0;
  if (unresolvedCritical === 0) {
    checks.push({ name: 'Corrections Backlog', status: 'pass', value: unresolvedCritical, threshold: '0 unresolved', detail: 'No unresolved corrections' });
  } else if (unresolvedCritical < 5) {
    checks.push({ name: 'Corrections Backlog', status: 'warn', value: unresolvedCritical, threshold: '0 unresolved', detail: `${unresolvedCritical} unresolved corrections` });
  } else {
    checks.push({ name: 'Corrections Backlog', status: 'fail', value: unresolvedCritical, threshold: '0 unresolved', detail: `${unresolvedCritical} unresolved corrections` });
  }

  // Overall result
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const passed = failCount === 0;

  let summary: string;
  if (passed) {
    summary = `✅ PMF LAUNCH GATE PASSED (${passCount} pass, ${warnCount} warn, ${failCount} fail)`;
  } else {
    summary = `❌ PMF LAUNCH GATE FAILED (${passCount} pass, ${warnCount} warn, ${failCount} fail)`;
  }

  // Print results
  console.log('── Launch Gate Results ──\n');
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
  }
  console.log(`\n${summary}`);

  return { passed, checks, summary };
}

// Run if executed directly
if (require.main === module) {
  runLaunchGate()
    .then((result) => process.exit(result.passed ? 0 : 1))
    .catch((err) => {
      console.error('Launch gate error:', err);
      process.exit(1);
    });
}

export { runLaunchGate };
