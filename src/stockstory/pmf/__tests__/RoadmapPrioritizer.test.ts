import { describe, it, expect, beforeEach } from 'vitest';
import { prioritize, getRoadmap, clearRoadmap } from '../RoadmapPrioritizer';

describe('RoadmapPrioritizer', () => {
  beforeEach(() => {
    clearRoadmap();
  });

  it('ingests signals and produces roadmap items', () => {
    const items = prioritize({
      researchQualityIssues: [],
      topFailedQueries: [{ query: 'Sector PE ratio comparison', count: 1 }],
      correctionTrends: [],
      featureRequests: [],
      searchTrends: [],
    });
    expect(Array.isArray(items)).toBe(true);
  });

  it('generates ranked roadmap from signals', () => {
    prioritize({
      researchQualityIssues: [],
      topFailedQueries: [{ query: 'Small cap screener', count: 1 }],
      correctionTrends: [{ issueType: 'INACCURATE_DATA', count: 1 }],
      featureRequests: [],
      searchTrends: [],
    });

    const roadmap = getRoadmap();
    expect(roadmap.length).toBeGreaterThan(0);
  });

  it('groups similar signals', () => {
    prioritize({
      researchQualityIssues: [],
      topFailedQueries: [{ query: 'Stock screener with multiple filters', count: 3 }],
      correctionTrends: [],
      featureRequests: [],
      searchTrends: [],
    });

    const roadmap = getRoadmap();
    const screenerItem = roadmap.find((r) => r.category === 'feature');
    expect(screenerItem).toBeDefined();
    if (screenerItem) expect(screenerItem.signalStrength).toBeGreaterThan(0);
  });

  it('resets state', () => {
    prioritize({
      researchQualityIssues: [],
      topFailedQueries: [{ query: 'Small cap screener', count: 1 }],
      correctionTrends: [],
      featureRequests: [],
      searchTrends: [],
    });
    clearRoadmap();
    expect(getRoadmap().length).toBe(0);
  });
});
