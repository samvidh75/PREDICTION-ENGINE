/**
 * TRACK-95N — Attention Engine
 * Transforms raw prediction data into prioritized actionable intelligence.
 * "Here is what deserves your attention right now."
 * 
 * Inputs: prediction_registry (today vs yesterday), UserAlertEngine, watchlists, portfolio
 * Outputs: Prioritized AttentionItems (critical → important → monitor)
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');

export interface AttentionItem {
  symbol: string;
  priority: 'critical' | 'important' | 'monitor';
  title: string;
  reason: string;
  delta: Record<string, number>;
  confidence: number;
  destinationUrl: string;
  source: 'watchlist' | 'market' | 'portfolio';
}

interface TodayPrediction {
  symbol: string;
  ranking_score: number;
  classification: string;
  confidence_score: number;
  quality_score: number;
  growth_score: number;
  value_score: number;
  momentum_score: number;
  risk_score: number;
  sector_score: number;
  prediction_horizon: number;
}

const CLASS_RANK: Record<string, number> = {
  Critical: 0, Weak: 1, Fair: 2, Good: 3, Excellent: 4, Exceptional: 5,
  'Strong Sell': 0, Sell: 1, Hold: 2, Buy: 3, 'Strong Buy': 4,
};

export class AttentionEngine {
  /**
   * Generate prioritized attention items for a user.
   * Returns: top 3 critical, top 5 important, top 10 monitor.
   */
  generate(userId: string): AttentionItem[] {
    const db = new Database(DB_PATH);
    const items: AttentionItem[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // 1. Get user's watchlist/portfolio tickers
      const watchlistTickers = this.getWatchlistTickers(db, userId);
      const portfolioTickers = this.getPortfolioTickers(db, userId);
      const allTickers = new Set([...watchlistTickers, ...portfolioTickers]);

      if (allTickers.size === 0) { db.close(); return items; }

      const symbolList = [...allTickers];
      const placeholders = symbolList.map(() => '?').join(',');

      // 2. Fetch today's predictions
      const todayPreds = db.prepare(
        `SELECT symbol, ranking_score, classification, confidence_score,
         quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
         prediction_horizon
         FROM prediction_registry
         WHERE prediction_date = ? AND symbol IN (${placeholders})
         ORDER BY ranking_score DESC`
      ).all(today, ...symbolList) as TodayPrediction[];

      // 3. Fetch yesterday's predictions
      const yesterdayPreds = db.prepare(
        `SELECT symbol, ranking_score, classification, confidence_score,
         quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
         prediction_horizon
         FROM prediction_registry
         WHERE prediction_date = ? AND symbol IN (${placeholders})
         ORDER BY ranking_score DESC`
      ).all(yesterday, ...symbolList) as TodayPrediction[];

      const yesterdayMap = new Map<string, TodayPrediction>();
      for (const p of yesterdayPreds) {
        yesterdayMap.set(`${p.symbol}_${p.prediction_horizon}`, p);
      }

      // 4. Compare and calculate deltas
      for (const todayP of todayPreds) {
        const key = `${todayP.symbol}_${todayP.prediction_horizon}`;
        const yesterdayP = yesterdayMap.get(key);
        if (!yesterdayP) continue;

        const deltas: Record<string, number> = {
          score: todayP.ranking_score - yesterdayP.ranking_score,
          confidence: todayP.confidence_score - yesterdayP.confidence_score,
          quality: todayP.quality_score - yesterdayP.quality_score,
          growth: todayP.growth_score - yesterdayP.growth_score,
          momentum: todayP.momentum_score - yesterdayP.momentum_score,
          risk: todayP.risk_score - yesterdayP.risk_score,
          value: todayP.value_score - yesterdayP.value_score,
          sector: todayP.sector_score - yesterdayP.sector_score,
        };

        const todayRank = CLASS_RANK[todayP.classification] ?? 3;
        const yesterdayRank = CLASS_RANK[yesterdayP.classification] ?? 3;
        const classDelta = todayRank - yesterdayRank;
        deltas.classification = classDelta;

        // Determine priority
        let priority: AttentionItem['priority'] = 'monitor';
        const absScoreDelta = Math.abs(deltas.score);

        if (absScoreDelta > 15 || Math.abs(classDelta) >= 2) {
          priority = 'critical';
        } else if (absScoreDelta > 8 || Math.abs(classDelta) >= 1) {
          priority = 'important';
        }

        // Build reason string
        const reasons: string[] = [];
        if (classDelta > 0) reasons.push(`Upgraded: ${yesterdayP.classification} → ${todayP.classification}`);
        if (classDelta < 0) reasons.push(`Downgraded: ${yesterdayP.classification} → ${todayP.classification}`);
        if (Math.abs(deltas.confidence) > 5) {
          reasons.push(`Confidence ${deltas.confidence > 0 ? '+' : ''}${deltas.confidence}`);
        }
        if (Math.abs(deltas.quality) > 8) {
          reasons.push(`Quality ${deltas.quality > 0 ? '+' : ''}${deltas.quality}`);
        }
        if (Math.abs(deltas.growth) > 8) {
          reasons.push(`Growth ${deltas.growth > 0 ? '+' : ''}${deltas.growth}`);
        }
        if (Math.abs(deltas.risk) > 8) {
          reasons.push(`Risk ${deltas.risk > 0 ? '↑ +' : '↓ '}${Math.abs(deltas.risk)}`);
        }

        const source = watchlistTickers.includes(todayP.symbol) ? 'watchlist' :
                       portfolioTickers.includes(todayP.symbol) ? 'portfolio' : 'market';

        items.push({
          symbol: todayP.symbol,
          priority,
          title: `${todayP.symbol} ${classDelta > 0 ? '▲' : classDelta < 0 ? '▼' : '●'} ${todayP.classification} (${todayP.ranking_score})`,
          reason: reasons.length > 0 ? reasons.join(' · ') : `Score ${deltas.score > 0 ? '+' : ''}${deltas.score}`,
          delta: deltas,
          confidence: todayP.confidence_score,
          destinationUrl: `/?page=stock&id=${todayP.symbol}`,
          source,
        });
      }
    } finally { db.close(); }

    // Sort by priority then by absolute score delta
    const priorityRank = { critical: 0, important: 1, monitor: 2 };
    items.sort((a, b) => {
      const pa = priorityRank[a.priority] - priorityRank[b.priority];
      if (pa !== 0) return pa;
      return Math.abs(b.delta.score) - Math.abs(a.delta.score);
    });

    return items.slice(0, 18); // 3 critical + 5 important + 10 monitor max
  }

  /** Generate market-wide attention items (not user-specific) */
  generateMarketWide(): AttentionItem[] {
    const db = new Database(DB_PATH);
    const items: AttentionItem[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      const todayPreds = db.prepare(
        `SELECT symbol, ranking_score, classification, confidence_score,
         quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
         prediction_horizon
         FROM prediction_registry WHERE prediction_date = ?
         ORDER BY ranking_score DESC LIMIT 200`
      ).all(today) as TodayPrediction[];

      const yesterdayPreds = db.prepare(
        `SELECT symbol, ranking_score, classification, confidence_score,
         quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
         prediction_horizon
         FROM prediction_registry WHERE prediction_date = ?`
      ).all(yesterday) as TodayPrediction[];

      const yesterdayMap = new Map<string, TodayPrediction>();
      for (const p of yesterdayPreds) {
        yesterdayMap.set(`${p.symbol}_${p.prediction_horizon}`, p);
      }

      for (const todayP of todayPreds) {
        const key = `${todayP.symbol}_${todayP.prediction_horizon}`;
        const yesterdayP = yesterdayMap.get(key);
        if (!yesterdayP) continue;

        const scoreDelta = todayP.ranking_score - yesterdayP.ranking_score;
        const todayRank = CLASS_RANK[todayP.classification] ?? 3;
        const yesterdayRank = CLASS_RANK[yesterdayP.classification] ?? 3;
        const classDelta = todayRank - yesterdayRank;

        if (Math.abs(scoreDelta) < 8 && classDelta === 0) continue;

        let priority: AttentionItem['priority'] = 'monitor';
        if (Math.abs(scoreDelta) > 15 || Math.abs(classDelta) >= 2) priority = 'critical';
        else if (Math.abs(scoreDelta) > 8 || Math.abs(classDelta) >= 1) priority = 'important';

        const reasons: string[] = [];
        if (classDelta > 0) reasons.push(`${yesterdayP.classification} → ${todayP.classification}`);
        if (classDelta < 0) reasons.push(`${yesterdayP.classification} → ${todayP.classification}`);
        reasons.push(`Score ${scoreDelta > 0 ? '+' : ''}${scoreDelta}`);

        items.push({
          symbol: todayP.symbol,
          priority,
          title: `${todayP.symbol} ${todayP.classification}`,
          reason: reasons.join(' · '),
          delta: { score: scoreDelta, classification: classDelta, confidence: 0, quality: 0, growth: 0, momentum: 0, risk: 0, value: 0, sector: 0 },
          confidence: todayP.confidence_score,
          destinationUrl: `/?page=stock&id=${todayP.symbol}`,
          source: 'market',
        });
      }
    } finally { db.close(); }

    const priorityRank = { critical: 0, important: 1, monitor: 2 };
    items.sort((a, b) => {
      const pa = priorityRank[a.priority] - priorityRank[b.priority];
      if (pa !== 0) return pa;
      return Math.abs(b.delta.score) - Math.abs(a.delta.score);
    });

    return items.slice(0, 18);
  }

  private getWatchlistTickers(db: any, userId: string): string[] {
    try {
      const rows = db.prepare(
        'SELECT tickers FROM user_watchlists WHERE user_id = ? AND is_archived = 0'
      ).all(userId) as any[];
      const tickers = new Set<string>();
      for (const r of rows) {
        try { JSON.parse(r.tickers || '[]').forEach((t: string) => tickers.add(t)); } catch {}
      }
      return [...tickers];
    } catch { return []; }
  }

  private getPortfolioTickers(db: any, userId: string): string[] {
    try {
      const rows = db.prepare(
        "SELECT tickers FROM user_watchlists WHERE user_id = ? AND name = 'My Portfolio' AND is_archived = 0"
      ).all(userId) as any[];
      const tickers = new Set<string>();
      for (const r of rows) {
        try { JSON.parse(r.tickers || '[]').forEach((t: string) => tickers.add(t)); } catch {}
      }
      return [...tickers];
    } catch { return []; }
  }
}

export const attentionEngine = new AttentionEngine();
export default AttentionEngine;
