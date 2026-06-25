export type PlanTier = "free" | "premium_monthly" | "premium_yearly";

export interface PlanFeature {
  text: string;
  included: boolean;
  premium?: boolean;
}

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  period: "month" | "year";
  priceLabel: string;
  popular?: boolean;
  features: PlanFeature[];
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "month",
    priceLabel: "Free",
    features: [
      { text: "5 stock research views per day", included: true },
      { text: "Basic AI scores (Quality, Growth, Valuation, Momentum, Risk)", included: true },
      { text: "Live NSE/BSE prices & market ticker", included: true },
      { text: "AI Stock Scanner (10 companies)", included: true },
      { text: "Watchlist (up to 5 stocks)", included: true },
      { text: "Unlimited stock research", included: false, premium: true },
      { text: "Advanced AI Investment Thesis", included: false, premium: true },
      { text: "Fair Value (DCF) estimates", included: false, premium: true },
      { text: "PDF Research Reports", included: false, premium: true },
      { text: "Email alerts for score changes", included: false, premium: true },
      { text: "Portfolio tracking & analytics", included: false, premium: true },
      { text: "Historical data export (CSV)", included: false, premium: true },
      { text: "Priority market data updates (5-min intervals)", included: false, premium: true },
      { text: "No daily research limit", included: false, premium: true },
    ],
    cta: "Current Plan",
  },
  {
    id: "premium_monthly",
    name: "Premium",
    price: 199,
    period: "month",
    priceLabel: "₹199/mo",
    popular: true,
    features: [
      { text: "Unlimited stock research views", included: true },
      { text: "Advanced AI scores with full explanations", included: true },
      { text: "AI Investment Thesis for every stock", included: true },
      { text: "Fair Value (DCF) estimates", included: true },
      { text: "Full AI Stock Scanner (all Nifty 50 + sector stocks)", included: true },
      { text: "Watchlist (unlimited stocks)", included: true },
      { text: "PDF Research Reports (download)", included: true },
      { text: "Email alerts for score changes", included: true },
      { text: "Portfolio tracking & analytics", included: true },
      { text: "Historical data export (CSV)", included: true },
      { text: "Priority market data updates", included: true },
      { text: "Cancel anytime", included: true },
    ],
    cta: "Start Premium",
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    price: 9999,
    period: "year",
    priceLabel: "₹9999/yr",
    features: [
      { text: "Everything in Premium Monthly", included: true },
      { text: "Save 58% vs monthly plan (₹2,388/yr savings)", included: true, premium: true },
      { text: "Early access to new features", included: true, premium: true },
      { text: "Priority support", included: true, premium: true },
      { text: "Custom alerts & watchlist filters", included: true, premium: true },
      { text: "API access for personal use", included: true, premium: true },
    ],
    cta: "Start Yearly",
  },
];

const SUBSCRIPTION_KEY = "ss_subscription";

export interface SubscriptionState {
  tier: PlanTier;
  activatedAt: string;
  expiresAt?: string;
  features: Record<string, boolean>;
}

function getDefaultFeatures(tier: PlanTier): Record<string, boolean> {
  const plan = PLANS.find(p => p.id === tier);
  if (!plan) return {};
  const features: Record<string, boolean> = {};
  plan.features.forEach(f => { features[f.text] = f.included; });
  return features;
}

export function getSubscription(): SubscriptionState {
  try {
    const stored = localStorage.getItem(SUBSCRIPTION_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { tier: "free", activatedAt: new Date().toISOString(), features: getDefaultFeatures("free") };
}

export function setSubscription(tier: PlanTier): SubscriptionState {
  const state: SubscriptionState = {
    tier,
    activatedAt: new Date().toISOString(),
    features: getDefaultFeatures(tier),
  };
  try {
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
  return state;
}

export function hasFeature(featureName: string): boolean {
  const sub = getSubscription();
  return sub.features[featureName] ?? false;
}

export function isPremium(): boolean {
  const sub = getSubscription();
  return sub.tier === "premium_monthly" || sub.tier === "premium_yearly";
}
