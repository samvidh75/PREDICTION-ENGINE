/**
 * TRACK-87 — UserAlertEngine
 * Generates stock-level alerts for watchlist users by comparing
 * today's predictions against yesterday's.
 * Runs as part of the daily pipeline (after prediction generation).
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');

const CLASSIFICATION_RANK: Record<string, number> = {
  Critical: 1, Weak: 2, Fair: 3, Good: 4, Excellent: 5, Exceptional: 6
};

export interface GeneratedAlert {
  userId: string;
  symbol: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

export class UserAlertEngine {
  /**
   * Generate alerts for all users by comparing today vs yesterday predictions.
   * Should be called once per day after prediction generation.
   */
  generateDailyAlerts(): GeneratedAlert[] {
    const db = new Database(DB_PATH);
    const alerts: GeneratedAlert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // Get all users with watchlists
      const users = db.prepare('SELECT DISTINCT user_id FROM user_watchlists WHERE is_archived = 0').all() as any[];
      if (users.length === 0) { db.close(); return alerts; }

      for (const user of users) {
        const userId = user.user_id;
        // Get user's watchlisted tickers
        const rows = db.prepare('SELECT tickers FROM user_watchlists WHERE user_id = ? AND is_archived = 0').all(userId) as any[];
        const watchedTickers = new Set<string>();
        for (const r of rows) {
          try { JSON.parse(r.tickers || '[]').forEach((t: string) => watchedTickers.add(t)); } catch { /* ignore malformed archived watchlist payload */ }
        }
        if (watchedTickers.size === 0) continue;

        const placeholders = [...watchedTickers].map(() => '?').join(',');
        const params = [...watchedTickers];

        // Compare today vs yesterday predictions
        const todayPreds = db.prepare(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = ? AND symbol IN (${placeholders})`
        ).all(today, ...params) as any[];

        const yesterdayPreds = db.prepare(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = ? AND symbol IN (${placeholders})`
        ).all(yesterday, ...params) as any[];

        const yesterdayMap = new Map<string, any>();
        for (const p of yesterdayPreds) {
          yesterdayMap.set(`${p.symbol}_${p.prediction_horizon}`, p);
        }

        for (const todayP of todayPreds) {
          const key = `${todayP.symbol}_${todayP.prediction_horizon}`;
          const yesterdayP = yesterdayMap.get(key);
          if (!yesterdayP) continue;

          // Health score change > 10
          const scoreDelta = Number(todayP.ranking_score) - Number(yesterdayP.ranking_score);
          if (Math.abs(scoreDelta) > 10) {
            const direction = scoreDelta > 0 ? 'improved' : 'declined';
            const body = `${todayP.symbol} health score ${direction} from ${Number(yesterdayP.ranking_score).toFixed(0)} to ${Number(todayP.ranking_score).toFixed(0)} (change: ${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(0)} points). Horizon: ${todayP.prediction_horizon}d.`;
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'health_change',
              title: `${todayP.symbol} Health ${scoreDelta > 0 ? '↑' : '↓'}`,
              body,
              metadata: { oldScore: Number(yesterdayP.ranking_score), newScore: Number(todayP.ranking_score), delta: scoreDelta, horizon: todayP.prediction_horizon }
            };
            this.insertAlert(db, alert);
            alerts.push(alert);
          }

          // Classification upgrade/downgrade
          const todayRank = CLASSIFICATION_RANK[todayP.classification] || 0;
          const yesterdayRank = CLASSIFICATION_RANK[yesterdayP.classification] || 0;
          if (todayRank > yesterdayRank) {
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'prediction_upgrade',
              title: `${todayP.symbol} Upgraded`,
              body: `${todayP.symbol} classification upgraded from ${yesterdayP.classification} to ${todayP.classification}. Horizon: ${todayP.prediction_horizon}d. Score: ${todayP.ranking_score}/100.`,
              metadata: { oldClass: yesterdayP.classification, newClass: todayP.classification, horizon: todayP.prediction_horizon }
            };
            this.insertAlert(db, alert);
            alerts.push(alert);
          } else if (todayRank < yesterdayRank) {
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'prediction_downgrade',
              title: `${todayP.symbol} Downgraded`,
              body: `${todayP.symbol} classification downgraded from ${yesterdayP.classification} to ${todayP.classification}. Horizon: ${todayP.prediction_horizon}d. Score: ${todayP.ranking_score}/100.`,
              metadata: { oldClass: yesterdayP.classification, newClass: todayP.classification, horizon: todayP.prediction_horizon }
            };
            this.insertAlert(db, alert);
            alerts.push(alert);
          }

          // Confidence level change
          if (todayP.confidence_level !== yesterdayP.confidence_level) {
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'confidence_change',
              title: `${todayP.symbol} Confidence Update`,
              body: `${todayP.symbol} confidence level changed from ${yesterdayP.confidence_level} to ${todayP.confidence_level}.`,
              metadata: { oldConf: yesterdayP.confidence_level, newConf: todayP.confidence_level }
            };
            this.insertAlert(db, alert);
            alerts.push(alert);
          }
        }

        // New opportunity: symbols with high factor_score NOT in user's watchlist
        const opportunityParams = [...watchedTickers];
        const oppPlaceholders = [...watchedTickers].map(() => '?').join(',');
        if (opportunityParams.length > 0) {
          const candidates = db.prepare(
            `SELECT DISTINCT pr.symbol, pr.ranking_score, pr.classification
             FROM prediction_registry pr
             WHERE pr.prediction_date = ? AND pr.ranking_score >= 85 AND pr.symbol NOT IN (${oppPlaceholders})
             LIMIT 5`
          ).all(today, ...opportunityParams) as any[];

          for (const c of candidates) {
            // Only generate if not already alerted for this symbol today
            const already = db.prepare(
              `SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = ? AND symbol = ? AND alert_type = 'new_opportunity' AND created_at >= date(?)`
            ).get(userId, c.symbol, today) as any;
            if (already?.cnt > 0) continue;

            const alert = {
              userId,
              symbol: c.symbol,
              type: 'new_opportunity',
              title: `New Opportunity: ${c.symbol}`,
              body: `${c.symbol} shows a strong ${c.classification} rating (${c.ranking_score}/100). Not in your watchlists. Consider reviewing.`,
              metadata: { score: c.ranking_score, classification: c.classification }
            };
            this.insertAlert(db, alert);
            alerts.push(alert);
          }
        }
      }
    } catch (err: any) {
      console.error('[UserAlertEngine] Error generating alerts:', err.message);
    } finally {
      db.close();
    }

    return alerts;
  }

  private insertAlert(db: any, alert: GeneratedAlert): void {
    try {
      db.prepare(
        `INSERT INTO user_alerts (user_id, symbol, alert_type, title, body, metadata, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`
      ).run(alert.userId, alert.symbol, alert.type, alert.title, alert.body, JSON.stringify(alert.metadata));
    } catch (err: any) {
      console.error('[UserAlertEngine] Failed to insert alert:', err.message);
    }
  }

  /** Get unread count for a user */
  getUnreadCount(userId: string): number {
    const db = new Database(DB_PATH);
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = ? AND is_read = 0').get(userId) as any;
      return row?.cnt ?? 0;
    } finally { db.close(); }
  }

  /** Get alerts for a user, newest first */
  getUserAlerts(userId: string, limit = 50): any[] {
    const db = new Database(DB_PATH);
    try {
      return db.prepare(
        'SELECT * FROM user_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
      ).all(userId, limit);
    } finally { db.close(); }
  }

  /** Mark an alert as read */
  markAsRead(alertId: number): void {
    const db = new Database(DB_PATH);
    try {
      db.prepare('UPDATE user_alerts SET is_read = 1 WHERE id = ?').run(alertId);
    } finally { db.close(); }
  }

  /** Mark all alerts as read for a user */
  markAllAsRead(userId: string): void {
    const db = new Database(DB_PATH);
    try {
      db.prepare('UPDATE user_alerts SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
    } finally { db.close(); }
  }
}

export const userAlertEngine = new UserAlertEngine();
export default UserAlertEngine;
