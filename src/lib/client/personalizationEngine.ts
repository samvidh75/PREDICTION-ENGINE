import { vault } from './localStorageVault';
import { selfLearningEngine, LearnedInsight } from './selfLearningEngine';

export interface PersonalizedStock {
  symbol: string;
  score: number;
  reasons: string[];
}

const PREFERENCES_KEY = 'stockstory_user_preferences';

class PersonalizationEngine {
  async getPersonalizedFeed(limit = 10): Promise<PersonalizedStock[]> {
    const insights = await selfLearningEngine.getInsights();
    const preferences = this.getPreferences();
    const watchlists = await vault.getWatchlists();
    const watchlistSymbols = new Set(watchlists.flatMap((w) => w.tickers.map((t) => t.toUpperCase())));

    const scoreMap = new Map<string, { score: number; reasons: string[] }>();

    for (const insight of insights) {
      let score = insight.affinity * 10;
      if (insight.trend === 'rising') score *= 1.5;
      if (watchlistSymbols.has(insight.symbol)) score *= 1.3;
      scoreMap.set(insight.symbol, { score, reasons: [`affinity:${insight.affinity}`] });
    }

    for (const sym of watchlistSymbols) {
      if (!scoreMap.has(sym)) {
        scoreMap.set(sym, { score: 5, reasons: ['watchlist'] });
      } else {
        const entry = scoreMap.get(sym)!;
        entry.score += 5;
        entry.reasons.push('watchlist');
      }
    }

    for (const [symbol, weight] of Object.entries(preferences)) {
      const sym = symbol.toUpperCase();
      const entry = scoreMap.get(sym) || { score: 0, reasons: [] };
      entry.score += weight;
      entry.reasons.push(`preference:${weight}`);
      scoreMap.set(sym, entry);
    }

    return Array.from(scoreMap.entries())
      .map(([symbol, data]) => ({ symbol, score: Math.round(data.score * 100) / 100, reasons: data.reasons }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  setPreference(symbol: string, weight: number) {
    const prefs = this.getPreferences();
    prefs[symbol.toUpperCase()] = weight;
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  }

  removePreference(symbol: string) {
    const prefs = this.getPreferences();
    delete prefs[symbol.toUpperCase()];
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  }

  getPreferences(): Record<string, number> {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  reset() {
    localStorage.removeItem(PREFERENCES_KEY);
  }
}

export const personalizationEngine = new PersonalizationEngine();
