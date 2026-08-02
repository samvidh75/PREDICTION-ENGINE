import { vault, SearchHistoryEntry } from './localStorageVault';

export interface LearnedInsight {
  symbol: string;
  affinity: number;
  lastInteraction: number;
  interactionCount: number;
  trend: 'rising' | 'stable' | 'decaying';
}

export class SelfLearningEngine {
  private affinityDecayHalfLifeMs = 7 * 24 * 60 * 60 * 1000;

  async recordSearch(symbol: string): Promise<void> {
    await vault.addSearchHistory(symbol);
  }

  async getInsights(): Promise<LearnedInsight[]> {
    const history = await vault.getSearchHistory();
    const symbolMap = new Map<string, { timestamps: number[] }>();

    for (const entry of history) {
      const sym = entry.symbol.toUpperCase();
      if (!symbolMap.has(sym)) {
        symbolMap.set(sym, { timestamps: [] });
      }
      symbolMap.get(sym)!.timestamps.push(entry.timestamp);
    }

    const now = Date.now();
    const insights: LearnedInsight[] = [];

    for (const [symbol, data] of symbolMap) {
      const sorted = data.timestamps.sort();
      const count = sorted.length;
      const lastInteraction = sorted[sorted.length - 1];

      let affinity = 0;
      for (const ts of sorted) {
        const age = now - ts;
        if (age > 90 * 24 * 60 * 60 * 1000) continue;
        const halfLives = age / this.affinityDecayHalfLifeMs;
        const decay = Math.pow(0.5, halfLives);
        affinity += Math.pow(0.9, count - 1) * decay;
      }

      affinity = Math.max(0, affinity);
      const recentCutoff = 3 * 24 * 60 * 60 * 1000;
      const isRising = lastInteraction > now - recentCutoff && count > 2;
      const isDecaying = lastInteraction < now - 14 * 24 * 60 * 60 * 1000;

      insights.push({
        symbol,
        affinity: Math.round(affinity * 100) / 100,
        lastInteraction,
        interactionCount: count,
        trend: isRising ? 'rising' : isDecaying ? 'decaying' : 'stable',
      });
    }

    insights.sort((a, b) => b.affinity - a.affinity);
    return insights;
  }

  async getTopSymbols(limit: number = 10): Promise<string[]> {
    const insights = await this.getInsights();
    return insights.slice(0, limit).map((i) => i.symbol);
  }
}

export const selfLearningEngine = new SelfLearningEngine();
