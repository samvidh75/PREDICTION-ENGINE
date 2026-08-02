-- src/db/migrations/002b_create_user_profiles.sql
-- Migration to create the user_profiles table

CREATE TABLE IF NOT EXISTS user_profiles (
    uid VARCHAR(255) PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
