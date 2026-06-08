/**
 * TRACK-87 — SubscriptionService
 * Subscription plan management and feature gating.
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');

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
  getPlans(): SubscriptionPlan[] {
    const db = new Database(DB_PATH);
    try {
      const rows = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly_inr ASC').all() as any[];
      return rows.map(r => ({ ...r, features: JSON.parse(r.features || '[]'), is_active: !!r.is_active }));
    } finally { db.close(); }
  }

  getUserSubscription(userId: string): UserSubscription | null {
    const db = new Database(DB_PATH);
    try {
      const sub = db.prepare(
        'SELECT * FROM user_subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1'
      ).get(userId) as any;
      if (!sub) return this.getDefaultFreeSubscription(userId);

      const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(sub.plan_id) as any;
      return {
        userId: sub.user_id,
        planId: sub.plan_id,
        status: sub.status,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        autoRenew: !!sub.auto_renew,
        plan: plan ? { ...plan, features: JSON.parse(plan.features || '[]'), is_active: !!plan.is_active } : undefined
      };
    } finally { db.close(); }
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

  checkFeatureAccess(userId: string, featureKey: string): boolean {
    const sub = this.getUserSubscription(userId);
    if (!sub?.plan) return false;
    return sub.plan.features.includes(featureKey);
  }

  assignTrial(userId: string): UserSubscription {
    const db = new Database(DB_PATH);
    try {
      // Check if already has a trial or paid subscription
      const existing = db.prepare(
        'SELECT * FROM user_subscriptions WHERE user_id = ? AND status != ?'
      ).get(userId, 'cancelled') as any;
      if (existing) return this.getUserSubscription(userId);

      const startedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

      db.prepare(
        `INSERT OR REPLACE INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew)
         VALUES (?, 'plan_investor_99', 'trial', ?, ?, 0)`
      ).run(userId, startedAt, expiresAt);

      return this.getUserSubscription(userId);
    } finally { db.close(); }
  }

  subscribe(userId: string, planId: string): UserSubscription {
    const db = new Database(DB_PATH);
    try {
      const startedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

      db.prepare(
        `INSERT OR REPLACE INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew)
         VALUES (?, ?, 'active', ?, ?, 1)`
      ).run(userId, planId, startedAt, expiresAt);

      // If this came via a referral, mark it as converted
      db.prepare(
        `UPDATE referrals SET status = 'converted', converted_at = datetime('now')
         WHERE invited_user_id = ? AND status = 'signed_up'`
      ).run(userId);

      return this.getUserSubscription(userId);
    } finally { db.close(); }
  }

  cancelSubscription(userId: string): void {
    const db = new Database(DB_PATH);
    try {
      db.prepare(
        `UPDATE user_subscriptions SET status = 'cancelled', auto_renew = 0 WHERE user_id = ? AND status IN ('active', 'trial')`
      ).run(userId);
    } finally { db.close(); }
  }
}

export const subscriptionService = new SubscriptionService();
export default SubscriptionService;
