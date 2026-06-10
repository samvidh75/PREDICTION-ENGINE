/**
 * TRACK-87 — AttentionEngine
 * Monitors user sessions, engagement metrics, and triggers re-engagement hooks.
 */
import { dbAdapter } from '../db/DatabaseAdapter';

export interface AttentionProfile {
  userId: string;
  sessionCount: number;
  averageSessionMinutes: number;
  lastActive: string;
  attentionScore: number; // 0–100, decayed since last visit
  needsNudge: boolean;
  recommendedAction: string;
}

export interface EngagementSnapshot {
  date: string;
  activeUsers: number;
  avgSessionMinutes: number;
  newWatchlistsCreated: number;
  alertsTriggered: number;
  predictionsGenerated: number;
}

interface SessionRow {
  user_id: string;
  session_count: number;
  session_minutes: number;
  total_minutes: number;
  last_active: string;
}

interface CountResult {
  cnt: number;
}

export class AttentionEngine {
  /**
   * Get an attention profile for a single user.
   * Scores decay exponentially with time since last visit.
   */
  async getAttentionProfile(userId: string): Promise<AttentionProfile> {
    const sessResult = await dbAdapter.query(
      `SELECT user_id, COUNT(*) AS session_count,
              COALESCE(AVG(session_minutes), 0) AS session_minutes,
              COALESCE(SUM(session_minutes), 0) AS total_minutes,
              MAX(created_at) AS last_active
       FROM user_sessions
       WHERE user_id = $1`,
      [userId]
    );
    const sessions = sessResult.rows as unknown as SessionRow[];

    const alertCountResult = await dbAdapter.query(
      'SELECT COUNT(*) AS cnt FROM user_alerts WHERE user_id = $1',
      [userId]
    );
    const alertCount = (alertCountResult.rows as unknown as CountResult[])[0]?.cnt ?? 0;

    const row = sessions[0] || null;
    const sessionCount = row?.session_count ?? 0;
    const avgMinutes = row?.session_minutes ?? 0;
    const lastActive = row?.last_active || new Date().toISOString();

    // Decay logic: lose ~5 points per day of inactivity (floor 0)
    const lastActiveDate = new Date(lastActive);
    const daysInactive = Math.max(0, (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    const baseScore = Math.min(100, sessionCount * 10 + avgMinutes * 2 + alertCount * 1);
    const attentionScore = Math.max(0, Math.round(baseScore * Math.exp(-0.05 * daysInactive)));

    const needsNudge = attentionScore < 30 && daysInactive > 3;

    let recommendedAction = 'none';
    if (needsNudge && daysInactive > 7) {
      recommendedAction = 'send_push';
    } else if (needsNudge) {
      recommendedAction = 'send_digest';
    } else if (attentionScore > 70 && daysInactive <= 1) {
      recommendedAction = 'prompt_share';
    }

    return {
      userId,
      sessionCount,
      averageSessionMinutes: Math.round(avgMinutes * 100) / 100,
      lastActive,
      attentionScore,
      needsNudge,
      recommendedAction
    };
  }

  /**
   * Get all users who may need re-engagement.
   */
  async getDormantUsers(daysInactive: number = 7): Promise<string[]> {
    const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString();

    const result = await dbAdapter.query(
      `SELECT DISTINCT user_id FROM user_sessions
       WHERE user_id NOT IN (
         SELECT DISTINCT user_id FROM user_sessions WHERE created_at >= $1
       )
       AND user_id IS NOT NULL`,
      [cutoff]
    );

    return (result.rows as unknown as { user_id: string }[]).map(r => r.user_id);
  }

  /**
   * Record a user session.
   */
  async recordSession(userId: string, durationMinutes: number): Promise<void> {
    const now = new Date().toISOString();
    await dbAdapter.query(
      `INSERT INTO user_sessions (user_id, session_minutes, created_at)
       VALUES ($1, $2, $3)`,
      [userId, durationMinutes, now]
    );
  }

  /**
   * Return a daily engagement snapshot for dashboard.
   */
  async getDailyEngagementSnapshot(): Promise<EngagementSnapshot> {
    const today = new Date().toISOString().split('T')[0];

    const activeResult = await dbAdapter.query(
      `SELECT COUNT(DISTINCT user_id) AS cnt FROM user_sessions WHERE created_at >= $1`,
      [`${today}T00:00:00`]
    );
    const activeUsers = (activeResult.rows as unknown as CountResult[])[0]?.cnt ?? 0;

    const avgResult = await dbAdapter.query(
      `SELECT COALESCE(AVG(session_minutes), 0) AS cnt FROM user_sessions WHERE created_at >= $1`,
      [`${today}T00:00:00`]
    );
    const avgSessionMinutes = Math.round(((avgResult.rows as unknown as CountResult[])[0]?.cnt ?? 0) * 100) / 100;

    const wlResult = await dbAdapter.query(
      `SELECT COUNT(*) AS cnt FROM user_watchlists WHERE created_at >= $1`,
      [`${today}T00:00:00`]
    );
    const newWatchlistsCreated = (wlResult.rows as unknown as CountResult[])[0]?.cnt ?? 0;

    const alertResult = await dbAdapter.query(
      `SELECT COUNT(*) AS cnt FROM user_alerts WHERE created_at >= $1`,
      [`${today}T00:00:00`]
    );
    const alertsTriggered = (alertResult.rows as unknown as CountResult[])[0]?.cnt ?? 0;

    const predResult = await dbAdapter.query(
      `SELECT COUNT(*) AS cnt FROM prediction_registry WHERE created_at >= $1`,
      [`${today}T00:00:00`]
    );
    const predictionsGenerated = (predResult.rows as unknown as CountResult[])[0]?.cnt ?? 0;

    return {
      date: today,
      activeUsers,
      avgSessionMinutes,
      newWatchlistsCreated,
      alertsTriggered,
      predictionsGenerated
    };
  }
}

export const attentionEngine = new AttentionEngine();
export default AttentionEngine;