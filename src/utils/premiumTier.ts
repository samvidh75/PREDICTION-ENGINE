/**
 * Premium Tier Management System
 * Handle subscriptions, features, and usage limits
 */

export type SubscriptionPlan = 'free' | 'premium' | 'pro';

export interface Subscription {
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired';
  startDate: number;
  endDate: number;
  renewalDate: number;
  paymentId?: string;
  price: number; // Monthly price in INR
}

export interface PremiumFeatures {
  name: string;
  tier1QueriesPerDay: number;
  tier2QueriesPerDay: number;
  tier3QueriesPerDay: number; // Groq API calls
  portfolioAnalysis: boolean;
  advancedReporting: boolean;
  emailReports: boolean;
  shareReports: boolean;
  newsAnalysis: boolean;
  customAlerts: number;
  apiAccess: boolean;
  monthlyPrice: number;
  yearlyPrice?: number;
}

const TIER_FEATURES: Record<SubscriptionPlan, PremiumFeatures> = {
  free: {
    name: 'Free',
    tier1QueriesPerDay: 50, // Unlimited local (0.5B)
    tier2QueriesPerDay: 20, // Limited 1B
    tier3QueriesPerDay: 5, // Very limited Groq
    portfolioAnalysis: false,
    advancedReporting: false,
    emailReports: false,
    shareReports: false,
    newsAnalysis: false,
    customAlerts: 3,
    apiAccess: false,
    monthlyPrice: 0,
  },
  premium: {
    name: 'Premium',
    tier1QueriesPerDay: 500,
    tier2QueriesPerDay: 100,
    tier3QueriesPerDay: 50, // Most users need ~30-40
    portfolioAnalysis: true,
    advancedReporting: true,
    emailReports: true,
    shareReports: true,
    newsAnalysis: true,
    customAlerts: 20,
    apiAccess: false,
    monthlyPrice: 299, // ~$3.60/month in INR
    yearlyPrice: 2499, // ~$30/year (save 30%)
  },
  pro: {
    name: 'Pro',
    tier1QueriesPerDay: 1000,
    tier2QueriesPerDay: 500,
    tier3QueriesPerDay: 200, // For power users
    portfolioAnalysis: true,
    advancedReporting: true,
    emailReports: true,
    shareReports: true,
    newsAnalysis: true,
    customAlerts: 100,
    apiAccess: true, // Can build apps on top
    monthlyPrice: 799, // ~$9.60/month
    yearlyPrice: 6999, // ~$85/year (save 27%)
  },
};

class PremiumTierManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'StockExPremium';
  private readonly STORE_NAME = 'subscriptions';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'userId' });
        }
      };
    });
  }

  /**
   * Get user's subscription
   */
  async getSubscription(userId: string): Promise<Subscription> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const store = this.db!.transaction(this.STORE_NAME, 'readonly').objectStore(this.STORE_NAME);
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(
          request.result || {
            userId,
            plan: 'free',
            status: 'active',
            startDate: Date.now(),
            endDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
            renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            price: 0,
          }
        );
      };

      request.onerror = () =>
        resolve({
          userId,
          plan: 'free',
          status: 'active',
          startDate: Date.now(),
          endDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
          renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          price: 0,
        });
    });
  }

  /**
   * Save/update subscription
   */
  async updateSubscription(subscription: Subscription): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.STORE_NAME, 'readwrite').objectStore(this.STORE_NAME);
      const request = store.put(subscription);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get features for a plan
   */
  getFeatures(plan: SubscriptionPlan = 'free'): PremiumFeatures {
    return TIER_FEATURES[plan];
  }

  /**
   * Check if user has access to feature
   */
  async hasFeatureAccess(userId: string, feature: keyof PremiumFeatures): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    const features = this.getFeatures(subscription.plan);

    // Check if subscription is still active
    if (subscription.status !== 'active' || Date.now() > subscription.endDate) {
      return false;
    }

    const featureValue = features[feature];
    return Boolean(featureValue);
  }

  /**
   * Check usage limits
   */
  async checkUsageLimit(
    userId: string,
    feature: 'tier1' | 'tier2' | 'tier3'
  ): Promise<{ allowed: boolean; remaining: number }> {
    const subscription = await this.getSubscription(userId);
    const features = this.getFeatures(subscription.plan);

    const featureKey = `${feature}QueriesPerDay` as keyof PremiumFeatures;
    const limit = features[featureKey] as number;

    // TODO: Implement usage tracking
    // For now, assume unlimited
    return {
      allowed: true,
      remaining: limit,
    };
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(
    userId: string,
    newPlan: SubscriptionPlan,
    paymentId: string
  ): Promise<Subscription> {
    const features = this.getFeatures(newPlan);
    const now = Date.now();

    const subscription: Subscription = {
      userId,
      plan: newPlan,
      status: 'active',
      startDate: now,
      endDate: now + 365 * 24 * 60 * 60 * 1000,
      renewalDate: now + 30 * 24 * 60 * 60 * 1000,
      paymentId,
      price: features.monthlyPrice,
    };

    await this.updateSubscription(subscription);
    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getSubscription(userId);
    subscription.status = 'cancelled';
    subscription.plan = 'free';
    await this.updateSubscription(subscription);
  }

  /**
   * Get all plans with pricing
   */
  getAllPlans(): Record<SubscriptionPlan, PremiumFeatures> {
    return TIER_FEATURES;
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency = 'INR'): string {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `$${(amount / 80).toFixed(2)}`; // Rough conversion
  }
}

// Export singleton
export const premiumTierManager = new PremiumTierManager();
