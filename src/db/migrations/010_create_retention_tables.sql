-- TRACK-87: Retention Engine — Database Schema Migration
-- Builds on existing investor_state, user_profiles tables

-- User Watchlists (normalized, server-side primary — syncs with localStorage)
CREATE TABLE IF NOT EXISTS user_watchlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tickers TEXT NOT NULL DEFAULT '[]',  -- JSON array
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON user_watchlists(user_id);

-- User Alerts (stock-level health/prediction changes)
CREATE TABLE IF NOT EXISTS user_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'health_change', 'prediction_upgrade', 'prediction_downgrade',
    'confidence_change', 'new_opportunity', 'price_target_update'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',  -- JSON: old_score, new_score, delta, etc.
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON user_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON user_alerts(created_at DESC);

-- Daily Digest tracking
CREATE TABLE IF NOT EXISTS daily_digests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  digest_date TEXT NOT NULL,
  content TEXT NOT NULL,        -- JSON: full digest payload
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE,
  UNIQUE(user_id, digest_date)
);
CREATE INDEX IF NOT EXISTS idx_digests_user_date ON daily_digests(user_id, digest_date DESC);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  invited_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  converted_at TEXT,
  FOREIGN KEY (referrer_user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'investor', 'pro', 'professional')),
  price_monthly_inr INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',  -- JSON array of feature keys
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  auto_renew INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON user_subscriptions(user_id);

-- Shared predictions (for social sharing)
CREATE TABLE IF NOT EXISTS shared_predictions (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  prediction_date TEXT NOT NULL,
  prediction_horizon INTEGER NOT NULL,
  shared_by_user_id TEXT,
  share_token TEXT NOT NULL UNIQUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shared_token ON shared_predictions(share_token);

-- Seed subscription plans
INSERT OR IGNORE INTO subscription_plans (id, name, tier, price_monthly_inr, features) VALUES
('plan_free', 'Free', 'free', 0, '["stock_health_basic","factor_breakdown","narrative","basic_search","1_watchlist"]'),
('plan_investor_99', 'Investor', 'investor', 99, '["stock_health_basic","factor_breakdown","narrative","basic_search","unlimited_watchlists","watchlist_alerts","daily_digest_email","prediction_accuracy_history"]'),
('plan_pro_299', 'Plus', 'pro', 299, '["stock_health_basic","factor_breakdown","narrative","advanced_search","unlimited_watchlists","watchlist_alerts","daily_digest_email","prediction_accuracy_history","expected_returns","peer_comparison","csv_export","portfolio_tracking"]'),
('plan_professional_999', 'Professional', 'professional', 999, '["stock_health_basic","factor_breakdown","narrative","advanced_search","unlimited_watchlists","watchlist_alerts","daily_digest_email","prediction_accuracy_history","expected_returns","peer_comparison","csv_export","portfolio_tracking","api_access","realtime_data","custom_factors","priority_support","backtesting"]');
