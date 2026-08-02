-- Broker Connections
-- ==================
-- Securely stores user broker OAuth tokens with AES-256-GCM encryption.
-- Supports multiple brokers per user but only one active connection per broker.
--
-- Dependencies: pgcrypto extension (PostgreSQL) for gen_random_uuid()
-- Tokens are encrypted by the application layer (Node.js crypto) before insertion.
-- The broker_encryption_key is read from the BROKER_ENCRYPTION_KEY env var.
--
-- Broker IDs: 'upstox', 'zerodha', 'angel_one', 'dhan'

CREATE TABLE IF NOT EXISTS broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  broker TEXT NOT NULL CHECK(broker IN ('upstox', 'zerodha', 'angel_one', 'dhan')),
  label TEXT NOT NULL DEFAULT 'My Account',
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  broker_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, broker, status)
);

CREATE INDEX IF NOT EXISTS idx_broker_conn_user ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_conn_broker ON broker_connections(broker);
CREATE INDEX IF NOT EXISTS idx_broker_conn_status ON broker_connections(status);
