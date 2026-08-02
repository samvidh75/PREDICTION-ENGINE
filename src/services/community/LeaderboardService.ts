export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  ideasCount: number;
  upvotesReceived: number;
  avgConvictionScore: number;
  accuracyRate: number;
  badges: string[];
}

export interface LeaderboardPeriod {
  period: 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
}

export type BadgeType =
  | 'top_analyst'
  | 'rising_star'
  | 'consistent'
  | 'high_conviction'
  | 'community_builder'
  | 'accuracy_king';

export class LeaderboardService {
  private entries: Map<string, LeaderboardEntry> = new Map();
  private periodicResults: Map<string, LeaderboardPeriod> = new Map();

  updateUserScore(
    userId: string,
    userName: string,
    delta: Partial<Omit<LeaderboardEntry, 'rank' | 'userId' | 'userName' | 'badges'>>,
  ): LeaderboardEntry {
    const existing = this.entries.get(userId);
    const current: LeaderboardEntry = existing ?? {
      rank: 0,
      userId,
      userName,
      score: 0,
      ideasCount: 0,
      upvotesReceived: 0,
      avgConvictionScore: 0,
      accuracyRate: 0,
      badges: [],
    };

    if (delta.score !== undefined) current.score += delta.score;
    if (delta.ideasCount !== undefined) current.ideasCount += delta.ideasCount;
    if (delta.upvotesReceived !== undefined) current.upvotesReceived += delta.upvotesReceived;
    if (delta.avgConvictionScore !== undefined) {
      current.avgConvictionScore = current.avgConvictionScore === 0
        ? delta.avgConvictionScore
        : (current.avgConvictionScore + delta.avgConvictionScore) / 2;
    }
    if (delta.accuracyRate !== undefined) {
      current.accuracyRate = current.accuracyRate === 0
        ? delta.accuracyRate
        : current.accuracyRate * 0.7 + delta.accuracyRate * 0.3;
    }

    current.badges = this.computeBadges(current);
    this.entries.set(userId, current);
    return { ...current };
  }

  getLeaderboard(period: LeaderboardPeriod['period'] = 'all_time', limit: number = 20): LeaderboardEntry[] {
    if (this.periodicResults.has(period)) {
      const cached = this.periodicResults.get(period)!;
      return cached.entries.slice(0, limit);
    }

    const sorted = [...this.entries.values()]
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.periodicResults.set(period, { period, entries: sorted });
    return sorted.slice(0, limit);
  }

  getUserRank(userId: string): { rank: number; total: number } | null {
    const entry = this.entries.get(userId);
    if (!entry) return null;

    const sorted = [...this.entries.values()].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(e => e.userId === userId) + 1;
    return { rank, total: sorted.length };
  }

  invalidateCache(): void {
    this.periodicResults.clear();
  }

  private computeBadges(entry: LeaderboardEntry): string[] {
    const badges: string[] = [];
    if (entry.accuracyRate >= 0.8) badges.push('accuracy_king');
    if (entry.avgConvictionScore >= 80) badges.push('high_conviction');
    if (entry.ideasCount >= 10) badges.push('consistent');
    if (entry.upvotesReceived >= 50) badges.push('community_builder');
    if (entry.score > 1000) badges.push('top_analyst');
    if (entry.score > 100 && entry.ideasCount <= 3) badges.push('rising_star');
    return badges;
  }
}

export const leaderboardService = new LeaderboardService();
