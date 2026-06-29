/**
 * commercial/plans — Product tier definitions and plan registry.
 *
 * StockStory India provides research scores and analysis tools only.
 * No buy/sell recommendations, no investment advice, no portfolio
 * management. Plans unlock research features, not trading.
 *
 * Tiers:
 *   free       → Basic stock health, 1 watchlist, manual refresh
 *   plus       → Unlimited watchlists, alerts, daily digest (₹99/mo)
 *   pro        → Advanced search, peer comparison, CSV export (₹299/mo)
 *
 * "Investor" and "Professional" from the legacy DB migration are
 * mapped to "plus" and "pro" for cleaner product naming.
 */

// ─── Tier Enum ──────────────────────────────────────────────────────

export type PlanTier = 'free' | 'plus' | 'pro';

// ─── Feature Keys ───────────────────────────────────────────────────

/**
 * Every feature in the product. A plan declares which of these it
 * includes via the features array. The EntitlementService checks
 * membership at runtime.
 */
export type FeatureKey =
  | 'stock_health_basic'
  | 'factor_breakdown'
  | 'narrative'
  | 'basic_search'
  | 'unlimited_watchlists'
  | 'watchlist_alerts'
  | 'daily_digest_email'
  | 'prediction_accuracy_history'
  | 'expected_returns'
  | 'peer_comparison'
  | 'csv_export'
  | 'portfolio_tracking'
  | 'advanced_search'
  | 'api_access'
  | 'priority_support'
  ;

// ─── Plan Definition ────────────────────────────────────────────────

export interface Plan {
  /** Unique identifier, e.g. "plan_free" */
  id: string;
  /** Display name e.g. "Free", "Research Plus" */
  name: string;
  tier: PlanTier;
  /** Monthly price in INR (0 for free) */
  priceInr: number;
  /** Feature keys this plan unlocks */
  features: FeatureKey[];
  /** Human-readable feature list for the pricing page */
  highlights: string[];
  /** Limits applied to this tier */
  limits: {
    maxWatchlists: number;
    maxAlerts: number;
    maxPortfolioEntries: number;
    searchDepthDays: number;
  };
  /** Is this plan actively sold */
  active: boolean;
}

// ─── Plan Registry ──────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    tier: 'free',
    priceInr: 0,
    features: [
      'stock_health_basic',
      'factor_breakdown',
      'narrative',
      'basic_search',
    ],
    highlights: [
      'Stock health scores (0-100)',
      'Factor breakdown for each stock',
      'Narrative analysis',
      'Basic stock search',
      '1 watchlist (up to 20 stocks)',
    ],
    limits: {
      maxWatchlists: 1,
      maxAlerts: 0,
      maxPortfolioEntries: 0,
      searchDepthDays: 90,
    },
    active: true,
  },
  {
    id: 'plan_plus_99',
    name: 'Research Plus',
    tier: 'plus',
    priceInr: 99,
    features: [
      'stock_health_basic',
      'factor_breakdown',
      'narrative',
      'basic_search',
      'unlimited_watchlists',
      'watchlist_alerts',
      'daily_digest_email',
      'prediction_accuracy_history',
    ],
    highlights: [
      'Everything in Free',
      'Unlimited watchlists',
      'Price & health change alerts',
      'Daily research digest email',
      'Prediction accuracy history',
    ],
    limits: {
      maxWatchlists: Infinity,
      maxAlerts: 50,
      maxPortfolioEntries: 30,
      searchDepthDays: 365,
    },
    active: true,
  },
  {
    id: 'plan_pro_299',
    name: 'Research Pro',
    tier: 'pro',
    priceInr: 299,
    features: [
      'stock_health_basic',
      'factor_breakdown',
      'narrative',
      'advanced_search',
      'unlimited_watchlists',
      'watchlist_alerts',
      'daily_digest_email',
      'prediction_accuracy_history',
      'expected_returns',
      'peer_comparison',
      'csv_export',
      'portfolio_tracking',
      'api_access',
      'priority_support',
    ],
    highlights: [
      'Everything in Research Plus',
      'Expected returns projections',
      'Peer comparison tool',
      'CSV export for all data',
      'Portfolio tracking & analysis',
      'Advanced search with filters',
      'Ad-free experience',
      'Priority email support',
    ],
    limits: {
      maxWatchlists: Infinity,
      maxAlerts: Infinity,
      maxPortfolioEntries: Infinity,
      searchDepthDays: 1095,
    },
    active: true,
  },
];

// ─── Lookup Helpers ─────────────────────────────────────────────────

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getPlanByTier(tier: PlanTier): Plan | undefined {
  return PLANS.find((p) => p.tier === tier && p.active);
}

export function getAllPlans(): Plan[] {
  return PLANS.filter((p) => p.active);
}

export function getDefaultPlan(): Plan {
  return PLANS[0]; // free
}

/**
 * Return features for a given plan ID. Falls back to free.
 */
export function getPlanFeatures(planId: string | null | undefined): FeatureKey[] {
  const plan = planId ? getPlan(planId) : undefined;
  return plan?.features ?? getDefaultPlan().features;
}
