-- Add phone_number and notification_preference columns to user_subscriptions
-- for the multi-channel alert gateway (SMS / WhatsApp).

ALTER TABLE user_subscriptions ADD COLUMN phone_number TEXT;
ALTER TABLE user_subscriptions ADD COLUMN notification_preference TEXT NOT NULL DEFAULT 'SMS';
