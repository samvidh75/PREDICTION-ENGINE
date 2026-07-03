import { IdeaPerformanceTracker, CommunityIdea, IdeaPerformancePoint } from '../../services/community/IdeaPerformanceTracker';

describe('IdeaPerformanceTracker', () => {
  const tracker = new IdeaPerformanceTracker();

  const idea: CommunityIdea = {
    id: 'idea-1',
    userId: 'user-1',
    ticker: 'TCS',
    conviction: 8,
    entryPrice: 3800,
    targetPrice: 4200,
    stopLoss: 3600,
    createdAt: Date.now(),
  };

  it('computes positive return correctly', () => {
    const perf = tracker.computePerformance(idea, 4000, '2024-06-01');
    expect(perf.returnPercent).toBeCloseTo(((4000 / 3800) - 1) * 100, 6);
    expect(perf.targetHit).toBe(false);
    expect(perf.stopHit).toBe(false);
  });

  it('flags targetHit when price reaches the target', () => {
    const perf = tracker.computePerformance(idea, 4250, '2024-06-01');
    expect(perf.targetHit).toBe(true);
  });

  it('flags stopHit when price falls to the stop', () => {
    const perf = tracker.computePerformance(idea, 3500, '2024-06-01');
    expect(perf.stopHit).toBe(true);
    expect(perf.returnPercent).toBeLessThan(0);
  });

  it('rejects invalid prices', () => {
    expect(() => tracker.computePerformance(idea, 0, '2024-06-01')).toThrow();
    expect(() => tracker.computePerformance({ ...idea, entryPrice: -1 }, 100, '2024-06-01')).toThrow();
  });

  it('excludes users below the minimum idea count from the leaderboard', () => {
    const ideas: CommunityIdea[] = [{ ...idea, id: 'i1', userId: 'sparse-user' }];
    const perf = new Map<string, IdeaPerformancePoint[]>([
      ['i1', [tracker.computePerformance(ideas[0], 4200, '2024-06-01')]],
    ]);
    const leaderboard = tracker.buildLeaderboard(ideas, perf);
    expect(leaderboard).toHaveLength(0);
  });

  it('ranks a consistent winner above a single lucky pick', () => {
    const consistentUser = 'consistent';
    const luckyUser = 'lucky';
    const ideas: CommunityIdea[] = [
      { ...idea, id: 'c1', userId: consistentUser },
      { ...idea, id: 'c2', userId: consistentUser },
      { ...idea, id: 'c3', userId: consistentUser },
      { ...idea, id: 'c4', userId: consistentUser },
      { ...idea, id: 'l1', userId: luckyUser },
      { ...idea, id: 'l2', userId: luckyUser },
      { ...idea, id: 'l3', userId: luckyUser },
    ];
    const perf = new Map<string, IdeaPerformancePoint[]>([
      ['c1', [tracker.computePerformance(ideas[0], 4000, '2024-06-01')]], // win, modest
      ['c2', [tracker.computePerformance(ideas[1], 4050, '2024-06-01')]], // win, modest
      ['c3', [tracker.computePerformance(ideas[2], 4000, '2024-06-01')]], // win, modest
      ['c4', [tracker.computePerformance(ideas[3], 3900, '2024-06-01')]], // win, modest
      ['l1', [tracker.computePerformance(ideas[4], 5500, '2024-06-01')]], // huge single win
      ['l2', [tracker.computePerformance(ideas[5], 3500, '2024-06-01')]], // stop hit / loss
      ['l3', [tracker.computePerformance(ideas[6], 3500, '2024-06-01')]], // stop hit / loss
    ]);
    const leaderboard = tracker.buildLeaderboard(ideas, perf);
    const consistentRank = leaderboard.findIndex(s => s.userId === consistentUser);
    const luckyRank = leaderboard.findIndex(s => s.userId === luckyUser);
    expect(consistentRank).toBeLessThan(luckyRank); // 4/4 wins beats 1/3 wins despite bigger single return
  });

  it('handles an idea with no performance history gracefully', () => {
    const ideas: CommunityIdea[] = [
      { ...idea, id: 'x1', userId: 'u' },
      { ...idea, id: 'x2', userId: 'u' },
      { ...idea, id: 'x3', userId: 'u' },
    ];
    const leaderboard = tracker.buildLeaderboard(ideas, new Map());
    expect(leaderboard[0].winRate).toBe(0);
    expect(Number.isFinite(leaderboard[0].score)).toBe(true);
  });

  it('produces scores within a sane finite range for edge-case win rates', () => {
    const ideas: CommunityIdea[] = Array.from({ length: 5 }, (_, i) => ({ ...idea, id: `e${i}`, userId: 'u' }));
    const allWin = new Map<string, IdeaPerformancePoint[]>(
      ideas.map(i => [i.id, [tracker.computePerformance(i, 4300, '2024-06-01')]]),
    );
    const [stats] = tracker.buildLeaderboard(ideas, allWin);
    expect(stats.winRate).toBe(1);
    expect(Number.isFinite(stats.score)).toBe(true);
  });
});
