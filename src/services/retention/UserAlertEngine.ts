/**
 * TRACK-87 — UserAlertEngine (async version)
 * Generates stock-level alerts for watchlist users by comparing
 * today's predictions against yesterday's.
 * Runs as part of the daily pipeline (after prediction generation).
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

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
  async generateDailyAlerts(): Promise<GeneratedAlert[]> {
    const alerts: GeneratedAlert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      const usersRes = await dbAdapter.query('SELECT DISTINCT user_id FROM user_watchlists WHERE is_archived = 0');
      const users = usersRes.rows as any[];
      if (users.length === 0) return alerts;

      for (const user of users) {
        const userId = user.user_id;
        const rowsRes = await dbAdapter.query('SELECT tickers FROM user_watchlists WHERE user_id = $1 AND is_archived = 0', [userId]);
        const rows = rowsRes.rows as any[];
        const watchedTickers = new Set<string>();
        for (const r of rows) {
          try {
            const tickers = typeof r.tickers === 'string' ? JSON.parse(r.tickers || '[]') : r.tickers;
            tickers.forEach((t: string) => watchedTickers.add(t));
          } catch { /* ignore malformed archived watchlist payload */ }
        }
        if (watchedTickers.size === 0) continue;

        const placeholders = [...watchedTickers].map((_, idx) => `$${idx + 2}`).join(',');
        const params = [...watchedTickers];
        const todayPredsRes = await dbAdapter.query(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = $1 AND symbol IN (${placeholders})`,
          [today, ...params]
        );
        const yesterdayPredsRes = await dbAdapter.query(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = $1 AND symbol IN (${placeholders})`,
          [yesterday, ...params]
        );
        const yesterdayMap = new Map<string, any>();
        for (const p of yesterdayPredsRes.rows as any[]) yesterdayMap.set(`${p.symbol}_${p.prediction_horizon}`, p);

        for (const todayP of todayPredsRes.rows as any[]) {
          const yesterdayP = yesterdayMap.get(`${todayP.symbol}_${todayP.prediction_horizon}`);
          if (!yesterdayP) continue;

          const scoreDelta = Number(todayP.ranking_score) - Number(yesterdayP.ranking_score);
          if (Math.abs(scoreDelta) > 10) {
            const direction = scoreDelta > 0 ? 'improved' : 'declined';
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'health_change',
              title: `${todayP.symbol} Health ${scoreDelta > 0 ? '↑' : '↓'}`,
              body: `${todayP.symbol} health score ${direction} from ${Number(yesterdayP.ranking_score).toFixed(0)} to ${Number(todayP.ranking_score).toFixed(0)} (change: ${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(0)} points). Horizon: ${todayP.prediction_horizon}d.`,
              metadata: { oldScore: Number(yesterdayP.ranking_score), newScore: Number(todayP.ranking_score), delta: scoreDelta, horizon: todayP.prediction_horizon }
            };
            await this.insertAlert(alert);
            alerts.push(alert);
          }

          const todayRank = CLASSIFICATION_RANK[todayP.classification] || 0;
          const yesterdayRank = CLASSIFICATION_RANK[yesterdayP.classification] || 0;
          if (todayRank !== yesterdayRank) {
            const upgraded = todayRank > yesterdayRank;
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: upgraded ? 'prediction_upgrade' : 'prediction_downgrade',
              title: `${todayP.symbol} ${upgraded ? 'Upgraded' : 'Downgraded'}`,
              body: `${todayP.symbol} classification ${upgraded ? 'upgraded' : 'downgraded'} from ${yesterdayP.classification} to ${todayP.classification}. Horizon: ${todayP.prediction_horizon}d. Score: ${todayP.ranking_score}/100.`,
              metadata: { oldClass: yesterdayP.classification, newClass: todayP.classification, horizon: todayP.prediction_horizon }
            };
            await this.insertAlert(alert);
            alerts.push(alert);
          }

          if (todayP.confidence_level !== yesterdayP.confidence_level) {
            const alert = {
              userId,
              symbol: todayP.symbol,
              type: 'confidence_change',
              title: `${todayP.symbol} Confidence Update`,
              body: `${todayP.symbol} confidence level changed from ${yesterdayP.confidence_level} to ${todayP.confidence_level}.`,
              metadata: { oldConf: yesterdayP.confidence_level, newConf: todayP.confidence_level }
            };
            await this.insertAlert(alert);
            alerts.push(alert);
          }
        }
      }
    } catch (err: any) {
      console.error('[UserAlertEngine] Error generating alerts:', err.message);
    }
    return alerts;
  }

  private async insertAlert(alert: GeneratedAlert): Promise<void> {
    try {
      await dbAdapter.query(
        `INSERT INTO user_alerts (user_id, symbol, alert_type, title, body, metadata, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP)`,
        [alert.userId, alert.symbol, alert.type, alert.title, alert.body, JSON.stringify(alert.metadata)]
      );
    } catch (err: any) {
      console.error('[UserAlertEngine] Failed to insert alert:', err.message);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await dbAdapter.query('SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = $1 AND is_read = 0', [userId]);
    const row = res.rows[0] as any;
    return Number(row?.cnt ?? 0);
  }

  async getUserAlerts(userId: string, limit = 50): Promise<any[]> {
    const res = await dbAdapter.query(
      'SELECT * FROM user_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return res.rows;
  }

  async markAsRead(userId: string, alertId: number): Promise<boolean> {
    const res = await dbAdapter.query('UPDATE user_alerts SET is_read = 1 WHERE id = $1 AND user_id = $2', [alertId, userId]);
    return res.rowCount > 0;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await dbAdapter.query('UPDATE user_alerts SET is_read = 1 WHERE user_id = $1 AND is_read = 0', [userId]);
  }

  async dismissAlert(userId: string, alertId: number): Promise<boolean> {
    const res = await dbAdapter.query('DELETE FROM user_alerts WHERE id = $1 AND user_id = $2', [alertId, userId]);
    return res.rowCount > 0;
  }
}

export const userAlertEngine = new UserAlertEngine();
export default UserAlertEngine;
