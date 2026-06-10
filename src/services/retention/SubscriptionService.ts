/**
 * TRACK-87 — SubscriptionService
 * Manages user subscriptions, plan definitions, and feature access.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  price_monthly: number;
  features: string[];
  is_trial_eligible: boolean;
}

export interface UserSubscription {
  user_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface SubDbRow {
  user_id: string;
  plan_id: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface PlanDbRow {
  plan_id: string;
  name: string;
  price_monthly: number;
  features: string;
  is_trial_eligible: number;
}

interface CountResult {
  cnt: number;
}

const DEFAULT_FEATURES: Record<string, string[]> = {
  free: ['watchlists', 'basic_alerts', 'daily_digest'],
  pro: ['watchlists', 'basic_alerts', 'daily_digest', 'advanced_predictions', 'export_csv', 'priority_support'],
  enterprise: ['watchlists', 'basic_alerts', 'daily_digest', 'advanced_predictions', 'export_csv', 'priority_support', 'api_access', 'custom_models']
};

export class SubscriptionService {
  /** Return all defined plans (hardcoded + DB-backed) */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const result = await dbAdapter.query(
      'SELECT * FROM subscription_plans'
    );
    const dbPlans = (result.rows as unknown as PlanDbRow[]) || [];

    if (dbPlans.length > 0) {
      return dbPlans.map(p => ({
        plan_id: p.plan_id,
        name: p.name,
        price_monthly: Number(p.price_monthly),
        features: JSON.parse(p.features || '[]'),
        is_trial_eligible: !!p.is_trial_eligible
      }));
    }

    // Fallback to built-in plans
    return [
      { plan_id: 'free', name: 'Free', price_monthly: 0, features: DEFAULT_FEATURES.free, is_trial_eligible: false },
      { plan_id: 'pro', name: 'Pro', price_monthly: 499, features: DEFAULT_FEATURES.pro, is_trial_eligible: true },
      { plan_id: 'enterprise', name: 'Enterprise', price_monthly: 1999, features: DEFAULT_FEATURES.enterprise, is_trial_eligible: false }
    ];
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const result = await dbAdapter.query(
      `SELECT user_id, plan_id, status, trial_start, trial_end,
              current_period_start, current_period_end, created_at
       FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const rows = result.rows as unknown as SubDbRow[];
    if (rows.length === 0) {
      // No subscription row: treat as free
      return {
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
        created_at: new Date().toISOString()
      };
    }
    const r = rows[0];
    return {
      user_id: r.user_id,
      plan_id: r.plan_id,
      status: r.status as UserSubscription['status'],
      trial_start: r.trial_start,
      trial_end: r.trial_end,
      current_period_start: r.current_period_start,
      current_period_end: r.current_period_end,
      created_at: r.created_at
    };
  }

  async checkFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (!sub) return DEFAULT_FEATURES.free.includes(featureKey);

    const plans = await this.getPlans();
    const plan = plans.find(p => p.plan_id === sub.plan_id);
    if (!plan) return DEFAULT_FEATURES.free.includes(featureKey);

    return plan.features.includes(featureKey);
  }

  async assignTrial(userId: string): Promise<void> {
    const existing = await this.getUserSubscription(userId);
    if (existing && existing.status !== 'expired') {
      // Already has an active subscription or trial
      return;
    }

    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await dbAdapter.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end, created_at)
       VALUES ($1, 'pro', 'trial', $2, $3, $4, $5, $6)`,
      [userId, now, trialEnd, now, trialEnd, now]
    );
  }

  async subscribe(userId: string, planId: string): Promise<void> {
    const now = new Date().toISOString();
    const periodEnd = planId === 'pro'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Cancel any existing active subscriptions
    await dbAdapter.query(
      `UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status IN ('active','trial')`,
      [userId]
    );

    await dbAdapter.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end, created_at)
       VALUES ($1, $2, 'active', NULL, NULL, $3, $4, $5)`,
      [userId, planId, now, periodEnd, now]
    );
  }
}

export const subscriptionService = new SubscriptionService();
export default SubscriptionService;