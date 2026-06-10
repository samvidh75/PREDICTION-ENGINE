/**
 * TRACK-87 — SubscriptionService (async version)
 * Subscription plan management and feature gating.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly_inr: number;
  features: string[];
  is_active: boolean;
}

export interface UserSubscription {
  userId: string;
  planId: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  plan?: SubscriptionPlan;
}

const FEATURE_HIERARCHY: Record<string, string[]> = {
  free: ['stock_health_basic', 'factor_breakdown', 'narrative', 'basic_search', '1_watchlist'],
  investor: ['stock_health_basic', 'factor_breakdown', 'narrative', 'basic_search', 'unlimited_watchlists', 'watchlist_alerts', 'daily_digest_email', 'prediction_accuracy_history'],
  pro: ['stock_health_basic', 'factor_breakdown', 'narrative', 'advanced_search', 'unlimited_watchlists', 'watchlist_alerts', 'daily_digest_email', 'prediction_accuracy_history', 'expected_returns', 'peer_comparison', 'csv_export', 'portfolio_tracking'],
  professional: ['stock_health_basic', 'factor_breakdown', 'narrative', 'advanced_search', 'unlimited_watchlists', 'watchlist_alerts', 'daily_digest_email', 'prediction_accuracy_history', 'expected_returns', 'peer_comparison', 'csv_export', 'portfolio_tracking', 'api_access', 'realtime_data', 'custom_factors', 'priority_support', 'backtesting']
};

export class SubscriptionService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await dbAdapter.query('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly_inr ASC');
    return res.rows.map((r: any) => ({
      ...r,
      features: typeof r.features === 'string' ? JSON.parse(r.features || '[]') : r.features,
      is_active: !!r.is_active
    }));
  }

  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const subRes = await dbAdapter.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1',
      [userId]
    );
    const sub = subRes.rows[0] as any;
    if (!sub) return this.getDefaultFreeSubscription(userId);

    const planRes = await dbAdapter.query('SELECT * FROM subscription_plans WHERE id = $1', [sub.plan_id]);
    const plan = planRes.rows[0] as any;
    return {
      userId: sub.user_id,
      planId: sub.plan_id,
      status: sub.status,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      autoRenew: !!sub.auto_renew,
      plan: plan ? {
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : plan.features,
        is_active: !!plan.is_active
      } : undefined
    };
  }

  private getDefaultFreeSubscription(userId: string): UserSubscription {
    return {
      userId,
      planId: 'plan_free',
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: null,
      autoRenew: false,
      plan: {
        id: 'plan_free',
        name: 'Free',
        tier: 'free',
        price_monthly_inr: 0,
        features: FEATURE_HIERARCHY.free,
        is_active: true
      }
    };
  }

  async checkFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (!sub?.plan) return false;
    return sub.plan.features.includes(featureKey);
  }

  async assignTrial(userId: string): Promise<UserSubscription> {
    // Check if already has a trial or paid subscription
    const existingRes = await dbAdapter.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1 AND status != $2',
      [userId, 'cancelled']
    );
    const existing = existingRes.rows[0];
    if (existing) return (await this.getUserSubscription(userId)) ?? this.getDefaultFreeSubscription(userId);

    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

    await dbAdapter.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew)
       VALUES ($1, 'plan_investor_99', 'trial', $2, $3, 0)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = EXCLUDED.status,
         started_at = EXCLUDED.started_at,
         expires_at = EXCLUDED.expires_at,
         auto_renew = EXCLUDED.auto_renew`,
      [userId, startedAt, expiresAt]
    );

    return (await this.getUserSubscription(userId)) || this.getDefaultFreeSubscription(userId);
  }

  async subscribe(userId: string, planId: string): Promise<UserSubscription> {
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    await dbAdapter.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew)
       VALUES ($1, $2, 'active', $3, $4, 1)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = EXCLUDED.status,
         started_at = EXCLUDED.started_at,
         expires_at = EXCLUDED.expires_at,
         auto_renew = EXCLUDED.auto_renew`,
      [userId, planId, startedAt, expiresAt]
    );

    // If this came via a referral, mark it as converted
    await dbAdapter.query(
      `UPDATE referrals SET status = 'converted', converted_at = CURRENT_TIMESTAMP
       WHERE invited_user_id = $1 AND status = 'signed_up'`,
      [userId]
    );

    return (await this.getUserSubscription(userId)) ?? this.getDefaultFreeSubscription(userId);
  }

  async cancelSubscription(userId: string): Promise<void> {
    await dbAdapter.query(
      `UPDATE user_subscriptions SET status = 'cancelled', auto_renew = 0
       WHERE user_id = $1 AND status IN ('active', 'trial')`,
      [userId]
    );
  }
}

export const subscriptionService = new SubscriptionService();
export default SubscriptionService;
