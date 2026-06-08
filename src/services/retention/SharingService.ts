/**
 * TRACK-87 — SharingService
 * Prediction sharing (social cards) and referral tracking.
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import crypto from 'crypto';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');

export interface ShareResult {
  shareUrl: string;
  shareToken: string;
  ogTitle: string;
  ogDescription: string;
  ogImageFallback: string;
}

export interface ReferralStats {
  totalInvites: number;
  signedUp: number;
  converted: number;
  code: string;
}

export class SharingService {
  createShareLink(userId: string, symbol: string, predictionDate: string, horizon: number): ShareResult | null {
    const db = new Database(DB_PATH);
    try {
      const token = crypto.randomBytes(8).toString('hex');
      const id = `share_${Date.now()}_${token.substring(0, 6)}`;

      // Get prediction data for OG tags
      const pred = db.prepare(
        `SELECT symbol, ranking_score, classification, confidence_level, prediction_horizon
         FROM prediction_registry
         WHERE symbol = ? AND prediction_date = ? AND prediction_horizon = ?
         ORDER BY created_at DESC LIMIT 1`
      ).get(symbol, predictionDate, horizon) as any;

      db.prepare(
        `INSERT INTO shared_predictions (id, symbol, prediction_date, prediction_horizon, shared_by_user_id, share_token, view_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`
      ).run(id, symbol, predictionDate, horizon, userId, token);

      const score = pred ? Number(pred.ranking_score).toFixed(0) : 'N/A';
      const cls = pred?.classification || 'Pending';
      const conf = pred?.confidence_level || 'N/A';

      return {
        shareUrl: `/share/${token}`,
        shareToken: token,
        ogTitle: `${symbol} Health Score: ${score}/100 — ${cls}`,
        ogDescription: `StockStory predicts ${symbol} as ${cls} with ${conf} confidence. View the full breakdown on StockStory India.`,
        ogImageFallback: `/api/og/${symbol}?score=${score}&classification=${encodeURIComponent(cls)}`
      };
    } finally { db.close(); }
  }

  getSharedPrediction(token: string): any | null {
    const db = new Database(DB_PATH);
    try {
      // Increment view count
      db.prepare('UPDATE shared_predictions SET view_count = view_count + 1 WHERE share_token = ?').run(token);

      const share = db.prepare(
        'SELECT * FROM shared_predictions WHERE share_token = ?'
      ).get(token) as any;
      if (!share) return null;

      const pred = db.prepare(
        `SELECT * FROM prediction_registry
         WHERE symbol = ? AND prediction_date = ? AND prediction_horizon = ?
         ORDER BY created_at DESC LIMIT 1`
      ).get(share.symbol, share.prediction_date, share.prediction_horizon) as any;

      return {
        share,
        prediction: pred || null,
        viewCount: (share?.view_count || 0) + 1
      };
    } finally { db.close(); }
  }

  generateReferralCode(userId: string): { code: string; link: string } {
    const db = new Database(DB_PATH);
    try {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      db.prepare(
        `INSERT INTO referrals (referrer_user_id, referral_code, invited_user_id, status, created_at)
         VALUES (?, ?, NULL, 'pending', datetime('now'))`
      ).run(userId, code);
      return { code, link: `/invite/${code}` };
    } finally { db.close(); }
  }

  trackReferral(code: string, invitedUserId: string): boolean {
    const db = new Database(DB_PATH);
    try {
      const referral = db.prepare('SELECT * FROM referrals WHERE referral_code = ? AND status = ?')
        .get(code, 'pending') as any;
      if (!referral) return false;

      db.prepare(
        `UPDATE referrals SET invited_user_id = ?, status = 'signed_up' WHERE referral_code = ?`
      ).run(invitedUserId, code);
      return true;
    } finally { db.close(); }
  }

  markReferralConverted(code: string): void {
    const db = new Database(DB_PATH);
    try {
      db.prepare(
        `UPDATE referrals SET status = 'converted', converted_at = datetime('now') WHERE referral_code = ?`
      ).run(code);
    } finally { db.close(); }
  }

  getReferralStats(userId: string): ReferralStats {
    const db = new Database(DB_PATH);
    try {
      const total = db.prepare(
        'SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = ?'
      ).get(userId) as any;

      const signedUp = db.prepare(
        "SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = ? AND status IN ('signed_up','converted')"
      ).get(userId) as any;

      const converted = db.prepare(
        'SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = ? AND status = ?'
      ).get(userId, 'converted') as any;

      // Get user's primary referral code (most recently created)
      const codeRow = db.prepare(
        'SELECT referral_code FROM referrals WHERE referrer_user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(userId) as any;

      return {
        totalInvites: total?.cnt ?? 0,
        signedUp: signedUp?.cnt ?? 0,
        converted: converted?.cnt ?? 0,
        code: codeRow?.referral_code || ''
      };
    } finally { db.close(); }
  }
}

export const sharingService = new SharingService();
export default SharingService;
