-- src/db/migrations/003_create_investor_state.sql
-- Migration to create investor_state table for persisting user-specific data

CREATE TABLE IF NOT EXISTS investor_state (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    watchlists JSONB NOT NULL DEFAULT '[]'::jsonb,
    alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
    memory JSONB NOT NULL DEFAULT '{}'::jsonb,
    dashboard_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_profiles(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_investor_state_user_id ON investor_state(user_id);
