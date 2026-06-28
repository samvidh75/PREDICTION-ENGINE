import { describe, it, expect } from 'vitest';
import { RoadmapPrioritizer } from '../RoadmapPrioritizer';

describe('RoadmapPrioritizer', () => {
  const prioritizer = new RoadmapPrioritizer();

  it('ingests signals and produces roadmap items', () => {
    const items = prioritizer.addSignal({
      type: 'failed_search',
      payload: { query: 'Sector PE ratio comparison', userId: 'user_1' },
      source: 'search_demand',
      timestamp: new Date().toISOString(),
    });
    expect(Array.isArray(items)).toBe(true);
  });

  it('generates ranked roadmap from signals', () => {
    prioritizer.addSignal({
      type: 'failed_search',
      payload: { query: 'Small cap screener', userId: 'user_2' },
      source: 'search_demand',
      timestamp: new Date().toISOString(),
    });
    prioritizer.addSignal({
      type: 'negative_feedback',
      payload: { symbol: 'TCS', component: 'outlook', issue: 'Too optimistic' },
      source: 'research_quality',
      timestamp: new Date().toISOString(),
    });

    const roadmap = prioritizer.getRankedRoadmap();
    expect(roadmap.length).toBeGreaterThan(0);
  });

  it('groups similar signals', () => {
    const p2 = new RoadmapPrioritizer();
    for (let i = 0; i < 3; i++) {
      p2.addSignal({
        type: 'failed_search',
        payload: { query: 'Gold ETF comparison' },
        source: 'search_demand',
        timestamp: new Date().toISOString(),
      });
    }
    const roadmap = p2.getRankedRoadmap();
    const goldEtf = roadmap.find((r) => r.title?.toLowerCase().includes('gold'));
    expect(goldEtf).toBeDefined();
    if (goldEtf) expect(goldEtf.signalCount).toBeGreaterThanOrEqual(3);
  });

  it('resets state', () => {
    const p3 = new RoadmapPrioritizer();
    p3.addSignal({
      type: 'failed_search',
      payload: { query: 'Test' },
      source: 'search_demand',
      timestamp: new Date().toISOString(),
    });
    p3.reset();
    expect(p3.getRankedRoadmap().length).toBe(0);
  });
});
