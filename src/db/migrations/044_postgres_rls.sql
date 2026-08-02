-- Migration 044: Multi-Tenant Isolation & Row-Level Security (RLS)
-- Enables PostgreSQL Row-Level Security on all multi-tenant user data tables.
-- Each policy uses app.current_user_id session variable set by the application
-- at the start of each transaction, ensuring tenant-isolated data access.

-- 1. Enable RLS on sensitive multi-tenant tables
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- 2. Create tenant-scoped policies
-- Each policy cross-references app.current_user_id set by the backend
-- before any query executes, preventing cross-tenant data leaks.

CREATE POLICY broker_connections_tenant_isolation ON broker_connections
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY user_subscriptions_tenant_isolation ON user_subscriptions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY user_alert_preferences_tenant_isolation ON user_alert_preferences
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY user_portfolio_transactions_tenant_isolation ON user_portfolio_transactions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY user_portfolio_snapshots_tenant_isolation ON user_portfolio_snapshots
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true));
