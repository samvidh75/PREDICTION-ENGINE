/**
 * Client-side self-learning engine
 * Learns from user's viewing/saving/search patterns
 * All knowledge stored locally — zero server exposure
 */

export interface UserSignal {
  type: 'view' | 'save' | 'search' | 'remove' | 'click';
  symbol: string;
  timestamp: number;
  weight?: number;
}

export interface LearnedInsight {
  symbol: string;
  affinity: number;
  lastInteraction: number;
  interactionCount: number;
  trend: 'rising' | 'stable' | 'decaying';
}

const STORAGE_KEY = 'stockstory_self_learn_signals';

class SelfLearningEngine {
  private affinityDecayHalfLifeMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  record(signal: Omit<UserSignal, 'timestamp'>) {
    const fullSignal: UserSignal = { ...signal, timestamp: Date.now() };
    const signals = this.getAllSignals();
    signals.push(fullSignal);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  }

  getInsights(): LearnedInsight[] {
    const signals = this.getAllSignals();
    const now = Date.now();
    const affinityMap = new Map<string, {
      totalScore: number;
      lastInteraction: number;
      count: number;
    }>();

    for (const s of signals) {
      const age = now - s.timestamp;
      if (age > 90 * 24 * 60 * 60 * 1000) continue;

      const entry = affinityMap.get(s.symbol) || {
        totalScore: 0,
        lastInteraction: 0,
        count: 0,
      };

      let baseWeight = s.weight ?? 1;
      switch (s.type) {
        case 'save':
          baseWeight = 5;
          break;
        case 'view':
          baseWeight = 1;
          break;
        case 'click':
          baseWeight = 2;
          break;
        case 'search':
          baseWeight = 3;
          break;
        case 'remove':
          baseWeight = -3;
          break;
      }

      const halfLives = age / this.affinityDecayHalfLifeMs;
      const decay = Math.pow(0.5, halfLives);
      entry.totalScore += baseWeight * decay;
      entry.lastInteraction = Math.max(entry.lastInteraction, s.timestamp);
      entry.count += 1;
      affinityMap.set(s.symbol, entry);
    }

    const insights: LearnedInsight[] = [];
    for (const [symbol, data] of affinityMap) {
      const affinity = Math.max(0, data.totalScore);
      const recentCutoff = 3 * 24 * 60 * 60 * 1000;
      const isRising = data.lastInteraction > now - recentCutoff && data.count > 2;
      const isDecaying = data.lastInteraction < now - 14 * 24 * 60 * 60 * 1000;
      insights.push({
        symbol,
        affinity: Math.round(affinity * 100) / 100,
        lastInteraction: data.lastInteraction,
        interactionCount: data.count,
        trend: isRising ? 'rising' : isDecaying ? 'decaying' : 'stable',
      });
    }

    insights.sort((a, b) => b.affinity - a.affinity);
    return insights;
  }

  getTopSymbols(limit: number = 10): string[] {
    return this.getInsights().slice(0, limit).map((i) => i.symbol);
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private getAllSignals(): UserSignal[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export const selfLearningEngine = new SelfLearningEngine();
