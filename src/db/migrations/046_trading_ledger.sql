-- Migration 046: Multi-Tenant Trading Ledger
-- Tracks user trade journal entries with Row-Level Security enforced
-- via the app.current_user_id session variable.
--
-- Usage:
--   INSERT INTO trading_ledger (...) VALUES (...) — protected by RLS
--   SELECT * FROM trading_ledger WHERE user_id = current_setting('app.current_user_id')
--   Performance stats are computed server-side in ledgerRoutes.ts

-- 1. Create the trading_ledger table
CREATE TABLE IF NOT EXISTS trading_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL DEFAULT current_setting('app.current_user_id', true),

  -- Trade metadata
  symbol          TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price     NUMERIC(14, 2) NOT NULL CHECK (entry_price > 0),
  exit_price      NUMERIC(14, 2),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),

  -- Computed P&L (set on exit)
  pnl             NUMERIC(14, 2),       -- absolute profit/loss in rupees
  pnl_percentage  NUMERIC(8, 2),        -- percentage return

  -- Dates
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Free-form notes
  notes           TEXT
);

-- 2. Index for fast user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_trading_ledger_user_id ON trading_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_trading_ledger_symbol   ON trading_ledger (symbol);

-- 3. Enable Row-Level Security
ALTER TABLE trading_ledger ENABLE ROW LEVEL SECURITY;

-- 4. Tenant isolation policy — queries only see own rows
CREATE POLICY trading_ledger_tenant_isolation ON trading_ledger
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true));

-- 5. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_trading_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trading_ledger_updated_at ON trading_ledger;
CREATE TRIGGER trg_trading_ledger_updated_at
  BEFORE UPDATE ON trading_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_ledger_timestamp();
