import { describe, it, expect } from 'vitest';
import { WeeklyProductReviewBuilder } from '../WeeklyProductReviewBuilder';
import type { ResearchQualityReport } from '../ResearchQualityAggregator';
import type { SearchDemandReport } from '../SearchDemandAggregator';
import type { AlertUsefulnessReport } from '../AlertUsefulnessAnalytics';

function makeResearchQuality(overrides?: Partial<ResearchQualityReport>): ResearchQualityReport {
  return {
    periodStart: '2024-01-15',
    periodEnd: '2024-01-21',
    totalFeedback: 10,
    positiveCount: 7,
    negativeCount: 3,
    positiveRate: 70,
    byComponent: { thesis: { total: 5, positive: 4, rate: 80 } },
    bySymbol: { RELIANCE: { total: 3, positive: 2 } },
    weeklyTrend: [],
    topIssues: [],
    ...overrides,
  };
}

function makeSearchDemand(overrides?: Partial<SearchDemandReport>): SearchDemandReport {
  return {
    periodStart: '2024-01-15',
    periodEnd: '2024-01-21',
    totalSearches: 50,
    successfulSearches: 43,
    failedSearches: 0,
    successRate: 86,
    topQueries: [],
    topFailedQueries: [],
    topSymbols: [],
    dailyTrend: [],
    ...overrides,
  };
}

function makeAlertUsefulness(overrides?: Partial<AlertUsefulnessReport>): AlertUsefulnessReport {
  return {
    periodStart: '2024-01-15',
    periodEnd: '2024-01-21',
    totalAlerts: 200,
    alertsRead: 80,
    alertsDismissed: 10,
    alertsActioned: 15,
    alertsSnoozed: 5,
    readRate: 40,
    actionRate: 7.5,
    byCategory: {},
    topTriggers: [],
    dailyTrend: [],
    ...overrides,
  };
}

describe('WeeklyProductReviewBuilder', () => {
  const reviewBuilder = new WeeklyProductReviewBuilder();

  it('generates a weekly review from PMF data', () => {
    const review = reviewBuilder.build({
      researchQuality: makeResearchQuality(),
      searchDemand: makeSearchDemand(),
      alertUsefulness: makeAlertUsefulness(),
    });

    expect(review.weekStart).toBeTruthy();
    expect(review.weekEnd).toBeTruthy();
    expect(review.metricHighlights).toBeDefined();
    expect(review.summary).toContain('Research quality');
    expect(review.summary).toContain('Search success');
  });

  it('generates top issues and wins', () => {
    const review = reviewBuilder.build({
      researchQuality: makeResearchQuality({
        positiveRate: 45,
        topIssues: ['Low quality for component thesis'],
      }),
      searchDemand: makeSearchDemand({
        failedSearches: 5,
        topFailedQueries: [{ query: 'Sector comparison', count: 3 }],
      }),
    });

    expect(review.topIssues).toBeDefined();
    expect(review.topIssues.length).toBeGreaterThan(0);
    expect(review.wins).toBeDefined();
    expect(review.wins.length).toBeGreaterThan(0);
  });

  it('generates action items', () => {
    const review = reviewBuilder.build({
      researchQuality: makeResearchQuality({
        positiveRate: 30,
        topIssues: ['Issue 1', 'Issue 2', 'Issue 3'],
      }),
      searchDemand: makeSearchDemand({
        failedSearches: 10,
        totalSearches: 20,
        successRate: 50,
      }),
    });

    expect(review.actionItems).toBeDefined();
    expect(review.actionItems.length).toBeGreaterThan(0);
  });

  it('works with empty data', () => {
    const review = reviewBuilder.build({});
    expect(typeof review.summary).toBe('string');
    expect(review.metricHighlights).toEqual([]);
    expect(review.topIssues).toEqual([]);
    expect(review.actionItems).toEqual([]);
  });
});
