-- Phase 36: Multi-Broker Portfolio Sync State
-- Stores aggregated portfolio snapshots from connected broker APIs.
-- Each row represents one sync event for one user + broker combination.

CREATE TABLE IF NOT EXISTS user_portfolio_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    broker          TEXT NOT NULL CHECK(broker IN ('upstox', 'zerodha', 'angel_one', 'dhan')),
    total_value     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_invested  NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_pnl       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    holdings_count  INTEGER NOT NULL DEFAULT 0,
    holdings_json   TEXT,                                      -- JSON array of normalised holdings
    status          TEXT NOT NULL DEFAULT 'success'
                    CHECK(status IN ('success', 'partial', 'failed')),
    error_message   TEXT,
    synced_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ups_user ON user_portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_ups_broker ON user_portfolio_snapshots(broker);
CREATE INDEX IF NOT EXISTS idx_ups_synced ON user_portfolio_snapshots(synced_at DESC);
