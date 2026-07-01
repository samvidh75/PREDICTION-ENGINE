-- Phase 14: Razorpay Subscription & Billing Schema
--
-- Tracks user subscriptions, billing transactions, and payment provider
-- metadata for the Equity Lens monetization gateway.

-- ── User Subscriptions ──────────────────────────────────────
-- One row per subscription. A user can have at most one active
-- subscription at a time; historical rows are retained for audit.
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,                          -- Firebase UID
    plan_id         TEXT NOT NULL,                          -- 'plan_free', 'plan_plus_99', 'plan_pro_299'
    tier            TEXT NOT NULL CHECK(tier IN ('free', 'plus', 'pro')),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active', 'trial', 'cancelled', 'expired', 'past_due')),
    -- Razorpay identifiers
    razorpay_order_id       TEXT,
    razorpay_payment_id     TEXT,
    razorpay_subscription_id TEXT,
    -- Billing period (epoch ms)
    current_period_start    INTEGER NOT NULL,
    current_period_end      INTEGER,
    -- Invoice / amount metadata
    amount_paid             INTEGER NOT NULL DEFAULT 0,    -- INR (paise)
    currency                TEXT NOT NULL DEFAULT 'INR',
    -- Provider info
    provider                TEXT DEFAULT 'razorpay',
    provider_sub_id         TEXT,
    auto_renew              INTEGER NOT NULL DEFAULT 1,   -- boolean
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_us_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_us_status ON user_subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_us_active ON user_subscriptions(user_id, status)
    WHERE status IN ('active', 'trial');

-- ── Billing Transactions ────────────────────────────────────
-- Immutable audit log of every payment event received via
-- Razorpay webhooks.
CREATE TABLE IF NOT EXISTS billing_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    subscription_id INTEGER REFERENCES user_subscriptions(id),
    event_type      TEXT NOT NULL,                          -- 'payment.captured', 'payment.failed', 'subscription.cancelled', etc.
    razorpay_event_id   TEXT,
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    amount              INTEGER,                            -- INR (paise)
    currency            TEXT DEFAULT 'INR',
    status              TEXT,                               -- 'captured', 'failed', 'refunded'
    provider_data       TEXT,                               -- JSON blob of raw webhook payload
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bt_user ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bt_sub ON billing_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bt_event ON billing_transactions(event_type);
