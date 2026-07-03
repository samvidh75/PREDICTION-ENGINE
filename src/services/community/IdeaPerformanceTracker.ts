// Mirrors supabase/migrations/006_community.sql: community_ideas, idea_performance, leaderboard_cache

export interface CommunityIdea {
  id: string;
  userId: string;
  ticker: string;
  conviction: number; // 1-10
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  createdAt: number; // epoch ms
}

export interface IdeaPerformancePoint {
  ideaId: string;
  date: string;
  currentPrice: number;
  returnPercent: number;
  targetHit: boolean;
  stopHit: boolean;
}

export interface UserLeaderboardStats {
  userId: string;
  ideasCount: number;
  avgConviction: number;
  winningIdeas: number;
  totalIdeas: number;
  winRate: number;
  avgReturnPercent: number;
  score: number; // ranking score
}

const MIN_IDEAS_FOR_RANKING = 3;

/**
 * Tracks community idea performance against live prices and produces
 * leaderboard rankings. "Winning" is defined at close-out (target/stop hit)
 * or, for open ideas, by current unrealized return sign — matching how a
 * retail investor would judge their own thesis.
 */
export class IdeaPerformanceTracker {
  computePerformance(idea: CommunityIdea, currentPrice: number, date: string): IdeaPerformancePoint {
    if (idea.entryPrice <= 0) throw new Error(`IdeaPerformanceTracker: invalid entryPrice for idea ${idea.id}`);
    if (currentPrice <= 0) throw new Error(`IdeaPerformanceTracker: invalid currentPrice for idea ${idea.id}`);

    const returnPercent = (currentPrice / idea.entryPrice - 1) * 100;
    const targetHit = idea.targetPrice !== undefined && currentPrice >= idea.targetPrice;
    const stopHit = idea.stopLoss !== undefined && currentPrice <= idea.stopLoss;

    return { ideaId: idea.id, date, currentPrice, returnPercent, targetHit, stopHit };
  }

  /**
   * Rank users by a composite score: win rate weighted by sample size
   * (Wilson-lower-bound style) plus average return, so a single lucky pick
   * can't outrank a consistent track record.
   */
  buildLeaderboard(
    ideas: CommunityIdea[],
    performanceByIdea: Map<string, IdeaPerformancePoint[]>,
  ): UserLeaderboardStats[] {
    const byUser = new Map<string, CommunityIdea[]>();
    for (const idea of ideas) {
      if (!byUser.has(idea.userId)) byUser.set(idea.userId, []);
      byUser.get(idea.userId)!.push(idea);
    }

    const stats: UserLeaderboardStats[] = [];
    for (const [userId, userIdeas] of byUser) {
      const latestReturns = userIdeas.map(idea => {
        const points = performanceByIdea.get(idea.id) ?? [];
        if (points.length === 0) return { returnPercent: 0, isWin: false };
        const latest = points[points.length - 1];
        const isWin = latest.targetHit || (!latest.stopHit && latest.returnPercent > 0);
        return { returnPercent: latest.returnPercent, isWin };
      });

      const totalIdeas = userIdeas.length;
      const winningIdeas = latestReturns.filter(r => r.isWin).length;
      const winRate = totalIdeas > 0 ? winningIdeas / totalIdeas : 0;
      const avgReturnPercent =
        latestReturns.reduce((s, r) => s + r.returnPercent, 0) / Math.max(1, latestReturns.length);
      const avgConviction = userIdeas.reduce((s, i) => s + i.conviction, 0) / totalIdeas;

      stats.push({
        userId,
        ideasCount: totalIdeas,
        avgConviction,
        winningIdeas,
        totalIdeas,
        winRate,
        avgReturnPercent,
        score: this.wilsonScore(winningIdeas, totalIdeas) + avgReturnPercent / 100,
      });
    }

    return stats
      .filter(s => s.totalIdeas >= MIN_IDEAS_FOR_RANKING)
      .sort((a, b) => b.score - a.score);
  }

  /** Wilson score lower bound at 95% confidence — penalizes small sample sizes. */
  private wilsonScore(wins: number, total: number): number {
    if (total === 0) return 0;
    const z = 1.96;
    const p = wins / total;
    const denominator = 1 + (z * z) / total;
    const centre = p + (z * z) / (2 * total);
    const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
    return (centre - margin) / denominator;
  }
}
