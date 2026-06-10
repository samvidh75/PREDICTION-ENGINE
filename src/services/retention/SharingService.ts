/**
 * TRACK-87 — SharingService (async version)
 * Prediction sharing (social cards) and referral tracking.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';
import crypto from 'crypto';

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
  async createShareLink(userId: string, symbol: string, predictionDate: string, horizon: number): Promise<ShareResult | null> {
    const token = crypto.randomBytes(8).toString('hex');
    const id = `share_${Date.now()}_${token.substring(0, 6)}`;

    // Get prediction data for OG tags
    const predRes = await dbAdapter.query(
      `SELECT symbol, ranking_score, classification, confidence_level, prediction_horizon
       FROM prediction_registry
       WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
       ORDER BY created_at DESC LIMIT 1`,
      [symbol, predictionDate, horizon]
    );
    const pred = predRes.rows[0] as any;

    await dbAdapter.query(
      `INSERT INTO shared_predictions (id, symbol, prediction_date, prediction_horizon, shared_by_user_id, share_token, view_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP)`,
      [id, symbol, predictionDate, horizon, userId, token]
    );

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
  }

  async getSharedPrediction(token: string): Promise<any | null> {
    // Increment view count
    await dbAdapter.query('UPDATE shared_predictions SET view_count = view_count + 1 WHERE share_token = $1', [token]);

    const shareRes = await dbAdapter.query(
      'SELECT * FROM shared_predictions WHERE share_token = $1',
      [token]
    );
    const share = shareRes.rows[0] as any;
    if (!share) return null;

    const predRes = await dbAdapter.query(
      `SELECT * FROM prediction_registry
       WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
       ORDER BY created_at DESC LIMIT 1`,
      [share.symbol, share.prediction_date, share.prediction_horizon]
    );
    const pred = predRes.rows[0] as any;

    return {
      share,
      prediction: pred || null,
      viewCount: (share?.view_count || 0) + 1
    };
  }

  async generateReferralCode(userId: string): Promise<{ code: string; link: string }> {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await dbAdapter.query(
      `INSERT INTO referrals (referrer_user_id, referral_code, invited_user_id, status, created_at)
       VALUES ($1, $2, NULL, 'pending', CURRENT_TIMESTAMP)`,
      [userId, code]
    );
    return { code, link: `/invite/${code}` };
  }

  async trackReferral(code: string, invitedUserId: string): Promise<boolean> {
    const referralRes = await dbAdapter.query('SELECT * FROM referrals WHERE referral_code = $1 AND status = $2', [code, 'pending']);
    const referral = referralRes.rows[0];
    if (!referral) return false;

    await dbAdapter.query(
      `UPDATE referrals SET invited_user_id = $1, status = 'signed_up' WHERE referral_code = $2`,
      [invitedUserId, code]
    );
    return true;
  }

  async markReferralConverted(code: string): Promise<void> {
    await dbAdapter.query(
      `UPDATE referrals SET status = 'converted', converted_at = CURRENT_TIMESTAMP WHERE referral_code = $1`,
      [code]
    );
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const totalRes = await dbAdapter.query(
      'SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = $1',
      [userId]
    );
    const total = totalRes.rows[0] as any;

    const signedUpRes = await dbAdapter.query(
      "SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = $1 AND status IN ('signed_up','converted')",
      [userId]
    );
    const signedUp = signedUpRes.rows[0] as any;

    const convertedRes = await dbAdapter.query(
      'SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = $1 AND status = $2',
      [userId, 'converted']
    );
    const converted = convertedRes.rows[0] as any;

    // Get user's primary referral code (most recently created)
    const codeRowRes = await dbAdapter.query(
      'SELECT referral_code FROM referrals WHERE referrer_user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const codeRow = codeRowRes.rows[0] as any;

    return {
      totalInvites: total?.cnt ? parseInt(total.cnt) : 0,
      signedUp: signedUp?.cnt ? parseInt(signedUp.cnt) : 0,
      converted: converted?.cnt ? parseInt(converted.cnt) : 0,
      code: codeRow?.referral_code || ''
    };
  }
}

export const sharingService = new SharingService();
export default SharingService;
