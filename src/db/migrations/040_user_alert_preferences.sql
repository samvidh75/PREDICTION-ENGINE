-- Phase 32: User Alert Preferences Schema
--
-- Stores per-user notification delivery preferences for breakout alerts,
-- volume spikes, and other scanner events. Supports SMS, Email, and Telegram
-- channels with granular alert type toggles.

-- ── User Alert Preferences ──────────────────────────────────
-- One row per user. Stores all notification channel preferences.
CREATE TABLE IF NOT EXISTS user_alert_preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL UNIQUE,                      -- Firebase UID

    -- Delivery channels (boolean toggles)
    sms_enabled     INTEGER NOT NULL DEFAULT 0,
    email_enabled   INTEGER NOT NULL DEFAULT 0,
    telegram_enabled INTEGER NOT NULL DEFAULT 0,

    -- Contact details
    phone_number    TEXT,                                      -- +91XXXXXXXXXX format
    email_address   TEXT,                                      -- user@example.com
    telegram_chat_id TEXT,                                     -- Telegram chat/channel ID

    -- Alert type preferences (which events trigger notifications)
    breakout_alerts     INTEGER NOT NULL DEFAULT 1,           -- Volume + price breakouts
    volume_spike_alerts INTEGER NOT NULL DEFAULT 1,           -- Unusual volume detection
    trend_change_alerts INTEGER NOT NULL DEFAULT 0,           -- Trend reversal signals
    earnings_alerts     INTEGER NOT NULL DEFAULT 0,           -- Earnings date reminders
    price_target_alerts INTEGER NOT NULL DEFAULT 0,           -- Price target hits

    -- Frequency preferences
    frequency       TEXT NOT NULL DEFAULT 'real_time'
                    CHECK(frequency IN ('real_time', 'daily_digest', 'weekly_summary')),

    -- Quiet hours (no alerts during these times)
    quiet_hours_start TEXT,                                    -- HH:MM format (e.g., '22:00')
    quiet_hours_end   TEXT,                                    -- HH:MM format (e.g., '07:00')

    -- Metadata
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_uap_user ON user_alert_preferences(user_id);

-- ── Alert Delivery Log ──────────────────────────────────────
-- Tracks every alert sent to a user for debugging and analytics.
CREATE TABLE IF NOT EXISTS alert_delivery_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    alert_type      TEXT NOT NULL,                             -- 'breakout', 'volume_spike', etc.
    channel         TEXT NOT NULL,                             -- 'sms', 'email', 'telegram'
    ticker          TEXT,                                      -- Related stock symbol
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'sent', 'failed', 'quiet_hours')),
    error_message   TEXT,
    sent_at         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_adl_user ON alert_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_adl_status ON alert_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_adl_created ON alert_delivery_log(created_at);
