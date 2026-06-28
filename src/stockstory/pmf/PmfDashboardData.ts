/**
 * PmfDashboardData — Aggregates all PMF data into a single dashboard payload.
 *
 * Combines outputs from all aggregators for the internal PMF dashboard page.
 */

import { PmfAggregationService, type PmfSnapshot } from './PmfAggregationService';
import { ProductEventStore } from './ProductEventStore';
import { FunnelAggregator, type FunnelReport } from './FunnelAggregator';
import { RetentionAggregator, type RetentionReport } from './RetentionAggregator';
import { ResearchQualityAggregator, type ResearchQualityReport } from './ResearchQualityAggregator';
import { SearchDemandAggregator, type SearchDemandReport } from './SearchDemandAggregator';
import { ScannerQualityAnalytics, type ScannerQualityReport } from './ScannerQualityAnalytics';
import { AlertUsefulnessAnalytics, type AlertUsefulnessReport } from './AlertUsefulnessAnalytics';
import { ScenarioUsefulnessAnalytics, type ScenarioUsefulnessReport } from './ScenarioUsefulnessAnalytics';
import { PremiumIntentAnalytics, type PremiumIntentReport } from './PremiumIntentAnalytics';
import { getCorrectionAnalytics, type CorrectionAnalytics } from './ResearchCorrectionService';
import { WeeklyProductReviewBuilder, type WeeklyReview } from './WeeklyProductReviewBuilder';
import { GrowthContentOpportunityEngine, type ContentOpportunity } from './GrowthContentOpportunityEngine';

export interface PmfDashboardData {
  generatedAt: string;
  snapshot: PmfSnapshot | null;
  funnel: FunnelReport | null;
  retention: RetentionReport | null;
  researchQuality: ResearchQualityReport | null;
  searchDemand: SearchDemandReport | null;
  scannerQuality: ScannerQualityReport | null;
  alertUsefulness: AlertUsefulnessReport | null;
  scenarioUsefulness: ScenarioUsefulnessReport | null;
  premiumIntent: PremiumIntentReport | null;
  corrections: CorrectionAnalytics | null;
  weeklyReview: WeeklyReview | null;
  contentOpportunities: ContentOpportunity[];
  periodStart: string;
  periodEnd: string;
}

export async function buildDashboardData(
  store: ProductEventStore,
  periodStart: string,
  periodEnd: string,
): Promise<PmfDashboardData> {
  const now = new Date().toISOString();
  const ctx = { store, periodStart, periodEnd };

  // Run all aggregators in parallel
  const [
    snapshot,
    funnel,
    retention,
    researchQuality,
    searchDemand,
    scannerQuality,
    alertUsefulness,
    scenarioUsefulness,
    premiumIntent,
  ] = await Promise.all([
    PmfAggregationService.buildSnapshot(ctx),
    new FunnelAggregator().aggregate(ctx),
    new RetentionAggregator().aggregate(ctx),
    new ResearchQualityAggregator().aggregate(ctx),
    new SearchDemandAggregator().aggregate(ctx),
    new ScannerQualityAnalytics().aggregate(ctx),
    new AlertUsefulnessAnalytics().aggregate(ctx),
    new ScenarioUsefulnessAnalytics().aggregate(ctx),
    new PremiumIntentAnalytics().aggregate(ctx),
  ]);

  const corrections = getCorrectionAnalytics();
  const contentEngine = new GrowthContentOpportunityEngine();
  const contentOpportunities = contentEngine.generate(searchDemand, researchQuality);

  const reviewBuilder = new WeeklyProductReviewBuilder();
  const weeklyReview = reviewBuilder.build({
    snapshot,
    researchQuality,
    searchDemand,
    alertUsefulness,
    scannerQuality,
    scenarioUsefulness,
    premiumIntent,
    correctionAnalytics: corrections,
  });

  return {
    generatedAt: now,
    snapshot,
    funnel,
    retention,
    researchQuality,
    searchDemand,
    scannerQuality,
    alertUsefulness,
    scenarioUsefulness,
    premiumIntent,
    corrections,
    weeklyReview,
    contentOpportunities,
    periodStart,
    periodEnd,
  };
}

export function formatDashboardSummary(data: PmfDashboardData): string {
  const lines: string[] = [
    `=== PMF Dashboard — ${data.periodStart} to ${data.periodEnd} ===`,
    `Generated: ${data.generatedAt}`,
    '',
  ];

  if (data.weeklyReview) {
    lines.push(`Summary: ${data.weeklyReview.summary}`);
    lines.push('');
  }

  if (data.funnel) {
    const steps = data.funnel.steps;
    lines.push('── Activation Funnel ──');
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const arrow = i < steps.length - 1 ? ' →' : '';
    lines.push(`  ${s.name}: ${s.uniqueUsers} users, ${s.conversionFromPrevious ?? 0}%${arrow}`);
    }
    lines.push('');
  }

  if (data.retention) {
    lines.push(`── Retention ──`);
    lines.push(`  D1: ${data.retention.overall.d1}%  D7: ${data.retention.overall.d7}%  D30: ${data.retention.overall.d30}%`);
    lines.push('');
  }

  if (data.researchQuality) {
    lines.push(`── Research Quality ──`);
    lines.push(`  Positive Rate: ${data.researchQuality.positiveRate}% (${data.researchQuality.totalFeedback} feedback)`);
    lines.push('');
  }

  if (data.searchDemand) {
    lines.push(`── Search Demand ──`);
    lines.push(`  Total: ${data.searchDemand.totalSearches} | Success: ${data.searchDemand.successRate}% | Failed: ${data.searchDemand.failedSearches}`);
    lines.push('');
  }

  if (data.scannerQuality) {
    lines.push(`── Scanner Quality ──`);
    lines.push(`  Views: ${data.scannerQuality.totalViews} | Interaction Rate: ${data.scannerQuality.interactionRate}%`);
    lines.push('');
  }

  if (data.alertUsefulness) {
    lines.push(`── Alert Usefulness ──`);
    lines.push(`  Delivered: ${data.alertUsefulness.totalAlerts} | Read Rate: ${data.alertUsefulness.readRate}% | Action Rate: ${data.alertUsefulness.actionRate}%`);
    lines.push('');
  }

  if (data.scenarioUsefulness) {
    lines.push(`── Scenario Usefulness ──`);
    lines.push(`  Views: ${data.scenarioUsefulness.totalViews} | Completion: ${data.scenarioUsefulness.completionRate}% | Save Rate: ${data.scenarioUsefulness.saveRate}%`);
    lines.push('');
  }

  if (data.premiumIntent) {
    lines.push(`── Premium Intent ──`);
    lines.push(`  Feature Views: ${data.premiumIntent.premiumFeatureViews} | CTA Clicks: ${data.premiumIntent.upgradeCtaClicks} | Conversion-Ready: ${data.premiumIntent.conversionReadyUsers}`);
    lines.push('');
  }

  if (data.weeklyReview && data.weeklyReview.topIssues.length > 0) {
    lines.push(`── Top Issues ──`);
    for (const issue of data.weeklyReview.topIssues.slice(0, 5)) {
      lines.push(`  ⚠ ${issue}`);
    }
    lines.push('');
  }

  if (data.weeklyReview && data.weeklyReview.wins.length > 0) {
    lines.push(`── Wins ──`);
    for (const win of data.weeklyReview.wins.slice(0, 5)) {
      lines.push(`  ✓ ${win}`);
    }
    lines.push('');
  }

  if (data.contentOpportunities.length > 0) {
    lines.push(`── Content Opportunities (${data.contentOpportunities.length}) ──`);
    for (const opp of data.contentOpportunities.slice(0, 5)) {
      lines.push(`  • ${opp.title} (priority: ${opp.priority})`);
    }
    lines.push('');
  }

  if (data.corrections) {
    lines.push(`── Corrections ──`);
    lines.push(`  Reported: ${data.corrections.totalReported} | Fixed: ${data.corrections.totalFixed} | Avg Resolution: ${data.corrections.avgTimeToResolution}h`);
  }

  return lines.join('\n');
}
