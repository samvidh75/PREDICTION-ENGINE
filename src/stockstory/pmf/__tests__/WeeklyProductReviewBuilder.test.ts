import { describe, it, expect } from 'vitest';
import { WeeklyProductReviewBuilder } from '../WeeklyProductReviewBuilder';

describe('WeeklyProductReviewBuilder', () => {
  const reviewBuilder = new WeeklyProductReviewBuilder();

  it('generates a weekly review from PMF snapshot', () => {
    const review = reviewBuilder.build({
      period: { start: '2024-01-15', end: '2024-01-21' },
      totalEvents: 100,
      uniqueUsers: 25,
      funnel: { signup: 25, search: 18, stockView: 12, thesisRead: 8, actionTaken: 3 },
      researchQuality: { totalFeedback: 10, positiveRate: 0.7 },
      searchDemand: { totalSearches: 50, successRate: 0.85, uniqueQueries: 30 },
      retention: { d1: 0.4, d7: 0.25, d30: 0.1 },
      alertUsefulness: { totalDelivered: 200, totalRead: 80, totalActions: 15, actionRate: 0.075 },
    });

    expect(review.period).toBe('2024-01-15 to 2024-01-21');
    expect(review.keyMetrics).toBeDefined();
    expect(review.keyMetrics.activeUsers).toBe(25);
    expect(review.keyMetrics.retentionD1).toBe('40%');
    expect(review.keyMetrics.retentionD7).toBe('25%');
    expect(review.keyMetrics.retentionD30).toBe('10%');
    expect(review.summary).toBeTruthy();
  });

  it('generates highlights and lowlights', () => {
    const review = reviewBuilder.build({
      period: { start: '2024-01-15', end: '2024-01-21' },
      totalEvents: 100,
      uniqueUsers: 25,
      funnel: { signup: 25, search: 18, stockView: 12, thesisRead: 8, actionTaken: 3 },
      researchQuality: { totalFeedback: 10, positiveRate: 0.7 },
      searchDemand: { totalSearches: 50, successRate: 0.85, uniqueQueries: 30 },
      retention: { d1: 0.4, d7: 0.25, d30: 0.1 },
      alertUsefulness: { totalDelivered: 200, totalRead: 80, totalActions: 15, actionRate: 0.075 },
    });

    expect(review.highlights).toBeDefined();
    expect(review.highlights.length).toBeGreaterThan(0);
    expect(review.lowlights).toBeDefined();
    expect(review.lowlights.length).toBeGreaterThan(0);
  });

  it('generates recommendations', () => {
    const review = reviewBuilder.build({
      period: { start: '2024-01-15', end: '2024-01-21' },
      totalEvents: 100,
      uniqueUsers: 25,
      funnel: { signup: 10, search: 3, stockView: 1, thesisRead: 0, actionTaken: 0 },
      researchQuality: { totalFeedback: 5, positiveRate: 0.3 },
      searchDemand: { totalSearches: 20, successRate: 0.5, uniqueQueries: 15 },
      retention: { d1: 0.1, d7: 0.05, d30: 0 },
      alertUsefulness: { totalDelivered: 50, totalRead: 5, totalActions: 0, actionRate: 0 },
    });

    expect(review.recommendations).toBeDefined();
    expect(review.recommendations.length).toBeGreaterThan(0);
  });

  it('works with empty data', () => {
    const review = reviewBuilder.build({
      period: { start: '2024-01-01', end: '2024-01-07' },
      totalEvents: 0,
      uniqueUsers: 0,
      funnel: { signup: 0, search: 0, stockView: 0, thesisRead: 0, actionTaken: 0 },
      researchQuality: { totalFeedback: 0, positiveRate: 0 },
      searchDemand: { totalSearches: 0, successRate: 0, uniqueQueries: 0 },
      retention: { d1: 0, d7: 0, d30: 0 },
      alertUsefulness: { totalDelivered: 0, totalRead: 0, totalActions: 0, actionRate: 0 },
    });
    expect(review.summary).toBeTruthy();
  });
});
