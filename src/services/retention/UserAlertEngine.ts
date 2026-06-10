/**
 * TRACK-87 — UserAlertEngine
 * Generates and manages alerts based on prediction changes and thresholds.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

export interface UserAlert {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  symbol: string | null;
  is_read: number;
  created_at: string;
  read_at: string | null;
}

interface AlertDbRow {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  symbol: string | null;
  is_read: number;
  created_at: string;
  read_at: string | null;
}

interface CountResult {
  cnt: number;
}

export class UserAlertEngine {
  async getUserAlerts(userId: string, limit: number = 50): Promise<UserAlert[]> {
    const result = await dbAdapter.query(
      `SELECT id, user_id, type, title, message, symbol, is_read, created_at, read_at
       FROM user_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return (result.rows as unknown as AlertDbRow[]) || [];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await dbAdapter.query(
      'SELECT COUNT(*) as cnt FROM user_alerts WHERE user_id = $1 AND is_read = 0',
      [userId]
    );
    return (result.rows as unknown as CountResult[])[0]?.cnt ?? 0;
  }

  async markAsRead(alertId: number): Promise<void> {
    await dbAdapter.query(
      `UPDATE user_alerts SET is_read = 1, read_at = datetime('now') WHERE id = $1`,
      [alertId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await dbAdapter.query(
      `UPDATE user_alerts SET is_read = 1, read_at = datetime('now') WHERE user_id = $1`,
      [userId]
    );
  }

  /** Create an alert and return its ID */
  async createAlert(
    userId: string,
    type: string,
    title: string,
    message: string,
    symbol: string | null = null
  ): Promise<number> {
    const result = await dbAdapter.query(
      `INSERT INTO user_alerts (user_id, type, title, message, symbol, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, datetime('now')) RETURNING id`,
      [userId, type, title, message, symbol]
    );
    return ((result.rows as unknown as { id: number }[])[0]?.id ?? 0);
  }

  /** Batch-create alerts for users watching a given symbol */
  async createAlertsForSymbolWatchers(
    symbol: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    // Find all users who have this symbol in any watchlist
    const result = await dbAdapter.query(
      'SELECT DISTINCT user_id, tickers FROM user_watchlists WHERE is_archived = 0'
    );

    const userIds: string[] = [];
    for (const r of result.rows) {
      try {
        const tickers = JSON.parse((r as { tickers: string }).tickers || '[]');
        if (tickers.includes(symbol)) {
          userIds.push((r as { user_id: string }).user_id);
        }
      } catch { /* skip */ }
    }

    for (const uid of userIds) {
      await this.createAlert(uid, type, title, message, symbol);
    }
  }

  /** Clean up old read alerts */
  async deleteOldAlerts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    const result = await dbAdapter.query(
      'DELETE FROM user_alerts WHERE is_read = 1 AND created_at < $1',
      [cutoffDate]
    );
    return 0; // SQLite adapter doesn't return deleted count — return 0 for compatibility
  }
}

export const userAlertEngine = new UserAlertEngine();
export default UserAlertEngine;