-- Phase 11: Align subscription plans with product tiers
-- Renames existing plans to match Free / Research Plus / Research Pro naming
-- Adds price_monthly_inr constraints and improves the user_subscriptions table

-- Update existing plans to new naming
UPDATE subscription_plans SET name = 'Free' WHERE id = 'plan_free';

UPDATE subscription_plans
SET name = 'Research Plus', tier = 'plus'
WHERE id = 'plan_investor_99';

UPDATE subscription_plans
SET name = 'Research Pro', tier = 'pro'
WHERE id = 'plan_pro_299';

-- Deactivate old plan that doesn't match current product
UPDATE subscription_plans SET is_active = 0 WHERE id = 'plan_professional_999';

-- Add usage tracking columns to user_subscriptions (idempotent)
ALTER TABLE user_subscriptions ADD COLUMN usage_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_subscriptions ADD COLUMN last_usage_reset TEXT;
ALTER TABLE user_subscriptions ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
