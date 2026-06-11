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
  /**
   * Generate alerts for all users by comparing today vs yesterday predictions.
   * Should be called once per day after prediction generation.
   */
  async generateDailyAlerts(): Promise<GeneratedAlert[]> {
    const alerts: GeneratedAlert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // Get all users with watchlists
      const usersRes = await dbAdapter.query('SELECT DISTINCT user_id FROM user_watchlists WHERE is_archived = 0');
      const users = usersRes.rows as any[];
      if (users.length === 0) return alerts;

      for (const user of users) {
        const userId = user.user_id;
        // Get user's watchlisted tickers
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

        // Compare today vs yesterday predictions
        const todayPredsRes = await dbAdapter.query(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = $1 AND symbol IN (${placeholders})`,
          [today, ...params]
        );
        const todayPreds = todayPredsRes.rows as any[];

        const yesterdayPredsRes = await dbAdapter.query(
          `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry WHERE prediction_date = $1 AND symbol IN (${placeholders})`,
          [yesterday, ...params]
        );
        const yesterdayPreds = yesterdayPredsRes.rows as any[];

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
            await this.insertAlert(alert);
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
            await this.insertAlert(alert);
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
            await this.insertAlert(alert);
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
            await this.insertAlert(alert);
            alerts.push(alert);
          }
        }

        // New opportunity: symbols with high factor_score NOT in user's watchlist
        const opportunityParams = [...watchedTickers];
        if (opportunityParams.length > 0) {
          const oppPlaceholders = opportunityParams.map((_, idx) => `$${idx + 2}`).join(',');
          const candidatesRes = await dbAdapter.query(
            `SELECT DISTINCT pr.symbol, pr.ranking_score, pr.classification
             FROM prediction_registry pr
             WHERE pr.prediction_date = $1 AND pr.ranking_score >= 85 AND pr.symbol NOT IN (${oppPlaceholders})
             LIMIT 5`,
            [today, ...opportunityParams]
          );
          const candidates = candidatesRes.rows as any[];

          for (const c of candidates) {
            // Only generate if not already alerted for this symbol today
            const alreadyRes = await dbAdapter.query(
              `SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = $1 AND symbol = $2 AND alert_type = 'new_opportunity' AND created_at >= date($3)`,
              [userId, c.symbol, today]
            );
            const already = alreadyRes.rows[0] as any;
            if (already?.cnt > 0) continue;

            const alert = {
              userId,
              symbol: c.symbol,
              type: 'new_opportunity',
              title: `New Opportunity: ${c.symbol}`,
              body: `${c.symbol} shows a strong ${c.classification} rating (${c.ranking_score}/100). Not in your watchlists. Consider reviewing.`,
              metadata: { score: c.ranking_score, classification: c.classification }
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

  /** Get unread count for a user */
  async getUnreadCount(userId: string): Promise<number> {
    const res = await dbAdapter.query('SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = $1 AND is_read = 0', [userId]);
    const row = res.rows[0] as any;
    return Number(row?.cnt ?? 0);
  }

  /** Get alerts for a user, newest first */
  async getUserAlerts(userId: string, limit = 50): Promise<any[]> {
    const res = await dbAdapter.query(
      'SELECT * FROM user_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return res.rows;
  }

  /** Mark an alert as read */
  async markAsRead(userId: string, alertId: number): Promise<boolean> {
    const res = await dbAdapter.query('UPDATE user_alerts SET is_read = 1 WHERE id = $1 AND user_id = $2', [alertId, userId]);
    return res.rowCount > 0;
  }

  /** Mark all alerts as read for a user */
  async markAllAsRead(userId: string): Promise<void> {
    await dbAdapter.query('UPDATE user_alerts SET is_read = 1 WHERE user_id = $1 AND is_read = 0', [userId]);
  }

  /** Dismiss one alert owned by a user */
  async dismissAlert(userId: string, alertId: number): Promise<boolean> {
    const res = await dbAdapter.query('DELETE FROM user_alerts WHERE id = $1 AND user_id = $2', [alertId, userId]);
    return res.rowCount > 0;
  }
}

export const userAlertEngine = new UserAlertEngine();
export default UserAlertEngine;
