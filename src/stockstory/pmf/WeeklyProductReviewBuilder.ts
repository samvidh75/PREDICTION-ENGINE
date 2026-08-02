/**
 * WeeklyProductReviewBuilder — Generates weekly product review summaries from PMF data.
 *
 * Combines all PMF signals into a structured weekly review:
 *  - Metric movers (up/down)
 *  - Top issues
 *  - Experiment results
 *  - Content opportunities
 *  - Action items
 */

import type { PmfSnapshot } from './PmfAggregationService';
import type { ResearchQualityReport } from './ResearchQualityAggregator';
import type { SearchDemandReport } from './SearchDemandAggregator';
import type { AlertUsefulnessReport } from './AlertUsefulnessAnalytics';
import type { ScannerQualityReport } from './ScannerQualityAnalytics';
import type { ScenarioUsefulnessReport } from './ScenarioUsefulnessAnalytics';
import type { PremiumIntentReport } from './PremiumIntentAnalytics';
import type { CorrectionAnalytics } from './ResearchCorrectionService';

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: string;
  metricHighlights: Array<{
    metricKey: string;
    label: string;
    currentValue: number;
    change: 'up' | 'down' | 'flat';
    changePercent: number;
  }>;
  topIssues: string[];
  wins: string[];
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    area: string;
    description: string;
  }>;
  contentOpportunities: Array<{
    topic: string;
    reason: string;
    estimatedInterest: 'high' | 'medium' | 'low';
  }>;
  experimentSummary: Array<{
    key: string;
    name: string;
    status: string;
    notable: string;
  }>;
}

export class WeeklyProductReviewBuilder {
  build(params: {
    snapshot?: PmfSnapshot;
    researchQuality?: ResearchQualityReport;
    searchDemand?: SearchDemandReport;
    alertUsefulness?: AlertUsefulnessReport;
    scannerQuality?: ScannerQualityReport;
    scenarioUsefulness?: ScenarioUsefulnessReport;
    premiumIntent?: PremiumIntentReport;
    correctionAnalytics?: CorrectionAnalytics;
    experimentResults?: Array<{ key: string; name: string; status: string; notable: string }>;
  }): WeeklyReview {
    const now = new Date();
    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - now.getDay());
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    const metricHighlights: WeeklyReview['metricHighlights'] = [];
    const topIssues: string[] = [];
    const wins: string[] = [];
    const actionItems: WeeklyReview['actionItems'] = [];
    const contentOpportunities: WeeklyReview['contentOpportunities'] = [];

    // Metrics from snapshot
    if (params.snapshot) {
      const { funnel, metrics } = params.snapshot;
      if (funnel) {
        for (const step of funnel) {
          metricHighlights.push({
            metricKey: step.metricKey,
            label: step.name,
            currentValue: step.conversionFromPrevious ?? 0,
            change: (step.conversionFromPrevious ?? 0) > 50 ? 'up' : (step.conversionFromPrevious ?? 0) > 30 ? 'flat' : 'down',
            changePercent: 0,
          });
        }
      }
      for (const m of metrics) {
        if (typeof m.value === 'number' && m.key.includes('rate')) {
          metricHighlights.push({
            metricKey: m.key,
            label: m.label,
            currentValue: m.value,
            change: m.value > 50 ? 'up' : m.value > 30 ? 'flat' : 'down',
            changePercent: 0,
          });
        }
      }
    }

    // Research quality insights
    if (params.researchQuality) {
      const rq = params.researchQuality;
      metricHighlights.push({
        metricKey: 'pmf.research.quality_positive_rate',
        label: 'Research Positive Rate',
        currentValue: rq.positiveRate,
        change: rq.positiveRate > 60 ? 'up' : rq.positiveRate > 40 ? 'flat' : 'down',
        changePercent: 0,
      });

      if (rq.positiveRate < 50) {
        topIssues.push(`Research quality positive rate is low: ${rq.positiveRate}%`);
        actionItems.push({
          priority: 'high',
          area: 'research_quality',
          description: `Investigate research quality — only ${rq.positiveRate}% positive feedback`,
        });
      }

      if (rq.totalFeedback > 0) {
        wins.push(`Received ${rq.totalFeedback} research feedback responses this week`);
      }

      for (const issue of rq.topIssues.slice(0, 3)) {
        topIssues.push(issue);
      }

      for (const [component, data] of Object.entries(rq.byComponent)) {
        if (data.total >= 5 && data.rate < 40) {
          actionItems.push({
            priority: 'high',
            area: 'research_quality',
            description: `Component "${component}" has low quality rate (${data.rate}%) — needs review`,
          });
        }
      }
    }

    // Search demand insights
    if (params.searchDemand) {
      const sd = params.searchDemand;
      if (sd.failedSearches > 0) {
        topIssues.push(`Search demand: ${sd.failedSearches} queries returned no results`);
        for (const fq of sd.topFailedQueries.slice(0, 3)) {
          contentOpportunities.push({
            topic: fq.query,
            reason: `${fq.count} failed searches indicate content gap`,
            estimatedInterest: fq.count > 10 ? 'high' : 'medium',
          });
        }
      }
      if (sd.successRate > 90) {
        wins.push(`Search success rate is strong: ${sd.successRate}%`);
      }
    }

    // Scanner insights
    if (params.scannerQuality) {
      const sq = params.scannerQuality;
      if (sq.interactionRate < 20 && sq.totalViews > 100) {
        actionItems.push({
          priority: 'medium',
          area: 'scanner',
          description: `Scanner interaction rate is low (${sq.interactionRate}%) — consider UI improvements`,
        });
      }
    }

    // Alert insights
    if (params.alertUsefulness) {
      const au = params.alertUsefulness;
      if (au.actionRate < 10 && au.totalAlerts > 50) {
        actionItems.push({
          priority: 'medium',
          area: 'alerts',
          description: `Alert action rate is low (${au.actionRate}%) — review alert relevance`,
        });
      }
    }

    // Scenario insights
    if (params.scenarioUsefulness) {
      const su = params.scenarioUsefulness;
      if (su.completionRate > 50) {
        wins.push(`Scenario completion rate is healthy: ${su.completionRate}%`);
      }
      if (su.saveRate < 20) {
        actionItems.push({
          priority: 'low',
          area: 'scenarios',
          description: `Scenario save rate is low (${su.saveRate}%) — consider better save CTAs`,
        });
      }
    }

    // Premium intent insights
    if (params.premiumIntent) {
      const pi = params.premiumIntent;
      if (pi.conversionReadyUsers > 0) {
        wins.push(`${pi.conversionReadyUsers} users showing strong conversion-ready signals`);
        metricHighlights.push({
          metricKey: 'pmf.engagement.upgrade_intent_score',
          label: 'Upgrade Intent Score',
          currentValue: pi.upgradeIntentScore,
          change: pi.upgradeIntentScore > 1000 ? 'up' : 'flat',
          changePercent: 0,
        });
        actionItems.push({
          priority: 'high',
          area: 'premium',
          description: `${pi.conversionReadyUsers} users ready for conversion outreach`,
        });
      }
    }

    // Correction insights
    if (params.correctionAnalytics) {
      const ca = params.correctionAnalytics;
      if (ca.totalReported > 0) {
        topIssues.push(`${ca.totalReported} research corrections reported this week`);
        if (ca.totalFixed > 0) {
          wins.push(`Resolved ${ca.totalFixed} research corrections this week`);
        }
      }
    }

    // Build summary
    const parts: string[] = [];
    if (params.snapshot?.funnel) {
      const funnelArray = params.snapshot.funnel;
      const lastStep = funnelArray[funnelArray.length - 1];
      if (lastStep) {
        parts.push(`Activation funnel: ${lastStep.conversionFromPrevious}% converted through all steps`);
      }
    }
    if (params.researchQuality) {
      parts.push(`Research quality: ${params.researchQuality.positiveRate}% positive`);
    }
    if (params.searchDemand) {
      parts.push(`Search success: ${params.searchDemand.successRate}%`);
    }
    const summary = parts.join(' | ');

    return {
      weekStart: weekStartDate.toISOString().slice(0, 10),
      weekEnd: weekEndDate.toISOString().slice(0, 10),
      generatedAt: now.toISOString(),
      summary,
      metricHighlights: metricHighlights.slice(0, 15),
      topIssues: topIssues.slice(0, 10),
      wins: wins.slice(0, 10),
      actionItems: actionItems.slice(0, 10),
      contentOpportunities: contentOpportunities.slice(0, 10),
      experimentSummary: params.experimentResults ?? [],
    };
  }
}
