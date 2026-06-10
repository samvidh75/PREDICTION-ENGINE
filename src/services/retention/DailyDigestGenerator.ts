/**
 * TRACK-87 — DailyDigestGenerator
 * Generates personalized daily digest for each user.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

export interface DailyDigest {
  date: string;
  generatedAt: string;
  userId: string;
  summary: string;
  topPicks: DigestItem[];
  biggestMover: DigestItem | null;
  portfolioUpdate: PortfolioUpdateSection;
  marketSnapshot: MarketSnapshotSection;
  didYouKnow: string;
}

export interface DigestItem {
  symbol: string;
  title: string;
  detail: string;
  change: number;
  changeType: 'up' | 'down' | 'neutral';
}

export interface PortfolioUpdateSection {
  message: string;
  items: DigestItem[];
}

export interface MarketSnapshotSection {
  topGainer: DigestItem | null;
  topLoser: DigestItem | null;
  totalPredictions: number;
}

interface RegistrySnapshot {
  symbol: string;
  ranking_score: number;
  classification: string;
  confidence_level: string;
  prediction_horizon: number;
  ranking_score_yesterday: number;
  created_at: string;
}

interface ActivityCount {
  cnt: number;
}

export class DailyDigestGenerator {
  async generateForUser(userId: string): Promise<DailyDigest> {
    const today = new Date().toISOString().split('T')[0];

    // Get user's watchlist tickers
    const watchlistsResult = await dbAdapter.query(
      'SELECT DISTINCT tickers FROM user_watchlists WHERE user_id = $1 AND is_archived = 0',
      [userId]
    );
    const tickerSet = new Set<string>();
    for (const r of watchlistsResult.rows) {
      try {
        JSON.parse((r as { tickers: string }).tickers || '[]').forEach((t: string) => tickerSet.add(t));
      } catch { /* skip */ }
    }
    const watchedTickers = [...tickerSet];

    // Get latest predictions for watched tickers
    let topPicks: DigestItem[] = [];
    let biggestMover: DigestItem | null = null;

    if (watchedTickers.length > 0) {
      const placeholders = watchedTickers.map((_, i) => `$${i + 1}`).join(',');
      const predResult = await dbAdapter.query(
        `SELECT symbol, ranking_score, classification, confidence_level,
                prediction_horizon, ranking_score_yesterday, created_at
         FROM prediction_registry
         WHERE symbol IN (${placeholders}) AND prediction_date = $${watchedTickers.length + 1}
         ORDER BY ranking_score DESC`,
        [...watchedTickers, today]
      );
      const preds = predResult.rows as unknown as RegistrySnapshot[];

      topPicks = preds.slice(0, 3).map(p => ({
        symbol: p.symbol,
        title: `${p.symbol} — ${p.classification}`,
        detail: `Health score ${Number(p.ranking_score).toFixed(0)}/100 (${p.confidence_level} confidence)`,
        change: p.ranking_score_yesterday != null ? Number(p.ranking_score) - Number(p.ranking_score_yesterday) : 0,
        changeType: p.ranking_score_yesterday != null
          ? (Number(p.ranking_score) >= Number(p.ranking_score_yesterday) ? 'up' : 'down')
          : 'neutral'
      }));

      // Biggest mover
      let maxDelta = 0;
      for (const p of preds) {
        if (p.ranking_score_yesterday != null) {
          const delta = Math.abs(Number(p.ranking_score) - Number(p.ranking_score_yesterday));
          if (delta > maxDelta) {
            maxDelta = delta;
            biggestMover = {
              symbol: p.symbol,
              title: `${p.symbol} moved ${delta >= 0 ? 'up' : 'down'} ${delta.toFixed(1)} pts`,
              detail: `Now classified as ${p.classification}`,
              change: Number(p.ranking_score) - Number(p.ranking_score_yesterday),
              changeType: Number(p.ranking_score) >= Number(p.ranking_score_yesterday) ? 'up' : 'down'
            };
          }
        }
      }
    }

    // Market snapshot
    const marketResult = await dbAdapter.query(
      `SELECT symbol, ranking_score, classification, confidence_level,
              prediction_horizon, ranking_score_yesterday, created_at
       FROM prediction_registry
       WHERE prediction_date = $1
       ORDER BY ranking_score DESC`,
      [today]
    );
    const allPreds = marketResult.rows as unknown as RegistrySnapshot[];

    const totalPredictions = allPreds.length;
    let topGainer: DigestItem | null = null;
    let topLoser: DigestItem | null = null;

    let maxGain = -Infinity;
    let maxLoss = Infinity;
    for (const p of allPreds) {
      if (p.ranking_score_yesterday != null) {
        const delta = Number(p.ranking_score) - Number(p.ranking_score_yesterday);
        if (delta > maxGain) {
          maxGain = delta;
          topGainer = {
            symbol: p.symbol,
            title: `${p.symbol} ▲ ${delta.toFixed(1)}`,
            detail: `${p.classification} (${p.confidence_level})`,
            change: delta,
            changeType: 'up'
          };
        }
        if (delta < maxLoss) {
          maxLoss = delta;
          topLoser = {
            symbol: p.symbol,
            title: `${p.symbol} ▼ ${Math.abs(delta).toFixed(1)}`,
            detail: `${p.classification} (${p.confidence_level})`,
            change: delta,
            changeType: 'down'
          };
        }
      }
    }

    // Activity summary
    const activityResult = await dbAdapter.query(
      'SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = $1 AND created_at >= $2',
      [userId, `${today}T00:00:00`]
    );
    const alertCount = (activityResult.rows as unknown as ActivityCount[])[0]?.cnt ?? 0;

    const summary = watchedTickers.length > 0
      ? `Your ${watchedTickers.length} watched stocks generated ${alertCount} alerts today.`
      : 'Add stocks to your watchlist to receive daily insights.';

    return {
      date: today,
      generatedAt: new Date().toISOString(),
      userId,
      summary,
      topPicks: topPicks.length > 0 ? topPicks : [
        {
          symbol: 'NIFTY50',
          title: 'Market is steady today',
          detail: 'No significant movements in your watchlist',
          change: 0,
          changeType: 'neutral'
        }
      ],
      biggestMover,
      portfolioUpdate: {
        message: watchedTickers.length > 0
          ? `${watchedTickers.length} stocks tracked today`
          : 'Your portfolio is empty. Add stocks to get started.',
        items: topPicks
      },
      marketSnapshot: {
        topGainer,
        topLoser,
        totalPredictions
      },
      didYouKnow: 'StockStory updates health scores daily based on your feedback.'
    };
  }
}

export const dailyDigestGenerator = new DailyDigestGenerator();
export default DailyDigestGenerator;