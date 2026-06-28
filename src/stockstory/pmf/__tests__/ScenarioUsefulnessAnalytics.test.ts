import { describe, it, expect } from 'vitest';
import { ScenarioUsefulnessAnalytics } from '../ScenarioUsefulnessAnalytics';

describe('ScenarioUsefulnessAnalytics', () => {
  const aggregator = new ScenarioUsefulnessAnalytics();

  it('initializes with zero counts', () => {
    const result = aggregator.getAggregated();
    expect(result.totalViews).toBe(0);
  });

  it('tracks scenario views', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scenario.view_rate',
      value: 1,
      dimensions: { scenario: 'market_downturn', label: 'Scenario view' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalViews).toBe(1);
  });

  it('tracks scenario completions', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scenario.completion_rate',
      value: 1,
      dimensions: { scenario: 'market_downturn', label: 'Scenario completion' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalCompletions).toBe(1);
  });

  it('tracks scenario saves', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scenario.save_rate',
      value: 1,
      dimensions: { scenario: 'market_downturn', label: 'Scenario save' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalSaves).toBe(1);
  });

  it('tracks scenario shares', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scenario.share_rate',
      value: 1,
      dimensions: { scenario: 'market_downturn', label: 'Scenario share' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalShares).toBe(1);
  });

  it('resets state', () => {
    const a2 = new ScenarioUsefulnessAnalytics();
    a2.reset();
    expect(a2.getAggregated().totalViews).toBe(0);
  });
});
