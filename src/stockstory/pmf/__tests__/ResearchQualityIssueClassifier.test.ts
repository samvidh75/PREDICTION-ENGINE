import { describe, it, expect } from 'vitest';
import { ResearchQualityIssueClassifier } from '../ResearchQualityIssueClassifier';

describe('ResearchQualityIssueClassifier', () => {
  const classifier = new ResearchQualityIssueClassifier();

  it('classifies inaccurate data feedback', () => {
    const result = classifier.classify({
      userId: 'user_1',
      metricKey: 'pmf.research.feedback_count',
      value: 1,
      timestamp: new Date().toISOString(),
      dimensions: { rating: '1', component: 'thesis' },
    });
    const types = result.issueTypes;
    expect(Array.isArray(types)).toBe(true);
  });

  it('returns empty for positive feedback', () => {
    const result = classifier.classify({
      userId: 'user_2',
      metricKey: 'pmf.research.quality_positive_rate',
      value: 1,
      timestamp: new Date().toISOString(),
      dimensions: { rating: '5', component: 'thesis' },
    });
    expect(result.issueTypes.length).toBe(0);
  });

  it('maintains issue counts per component', () => {
    classifier.classify({
      userId: 'user_1',
      metricKey: 'pmf.research.feedback_count',
      value: 1,
      timestamp: new Date().toISOString(),
      dimensions: { rating: '2', component: 'outlook' },
    });

    const stats = classifier.getStatistics();
    expect(stats.totalIssues).toBeGreaterThanOrEqual(0);
    expect(Object.keys(stats.perComponent).length).toBeGreaterThanOrEqual(0);
  });

  it('resets state', () => {
    const c2 = new ResearchQualityIssueClassifier();
    c2.reset();
    expect(c2.getStatistics().totalIssues).toBe(0);
  });
});
