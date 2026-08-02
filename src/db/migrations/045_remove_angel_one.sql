-- Migration 045: Remove Angel One from broker CHECK constraints
-- Angel One provider has been removed from the codebase.
-- This migration updates CHECK constraints on existing tables
-- to remove 'angel_one' from the allowed broker values.

-- Note: PostgreSQL does not allow ALTER TYPE CHECK on existing constraints.
-- We must drop and recreate the constraints.

ALTER TABLE broker_connections DROP CONSTRAINT IF EXISTS broker_connections_broker_check;
ALTER TABLE broker_connections ADD CONSTRAINT broker_connections_broker_check
    CHECK (broker IN ('upstox', 'zerodha', 'dhan'));

ALTER TABLE user_portfolio_snapshots DROP CONSTRAINT IF EXISTS user_portfolio_snapshots_broker_check;
ALTER TABLE user_portfolio_snapshots ADD CONSTRAINT user_portfolio_snapshots_broker_check
    CHECK (broker IN ('upstox', 'zerodha', 'dhan'));
