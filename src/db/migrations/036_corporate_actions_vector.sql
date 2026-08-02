-- Phase 13: Corporate Actions, Insider Trading & Bulk/Block Deals Schema
--
-- These tables store structured data from NSE/BSE exchange filings and
-- feed the Ollama stockstory-slm training dataset pipeline.

-- ── Corporate Actions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS corporate_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN (
        'dividend', 'split', 'bonus', 'rights', 'buyback', 'merger', 'delisting'
    )),
    announcement_date TEXT,
    ex_date TEXT,
    record_date TEXT,
    value REAL,
    ratio_text TEXT,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, action_type, announcement_date)
);

CREATE INDEX IF NOT EXISTS idx_ca_symbol ON corporate_actions(symbol);
CREATE INDEX IF NOT EXISTS idx_ca_ex_date ON corporate_actions(ex_date);
CREATE INDEX IF NOT EXISTS idx_ca_type ON corporate_actions(action_type);

-- ── Insider Trading (SEBI SAST disclosures) ───────────────
CREATE TABLE IF NOT EXISTS insider_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    acquirer_name TEXT NOT NULL,
    acquirer_category TEXT CHECK(acquirer_category IN (
        'promoter', 'director', 'key_managerial', 'group_company', 'other'
    )),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell', 'gift', 'pledge')),
    quantity INTEGER NOT NULL,
    price REAL,
    transaction_value REAL,
    transaction_date TEXT,
    disclosure_date TEXT,
    pre_holding_pct REAL,
    post_holding_pct REAL,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_it_symbol ON insider_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_it_date ON insider_trades(transaction_date);
CREATE INDEX IF NOT EXISTS idx_it_type ON insider_trades(transaction_type);

-- ── Bulk & Block Deals ────────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_block_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    deal_type TEXT NOT NULL CHECK(deal_type IN ('bulk', 'block')),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
    client_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    transaction_value REAL,
    deal_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bbd_symbol ON bulk_block_deals(symbol);
CREATE INDEX IF NOT EXISTS idx_bbd_date ON bulk_block_deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_bbd_type ON bulk_block_deals(deal_type);

-- ── Shareholding Pattern Snapshots ────────────────────────
CREATE TABLE IF NOT EXISTS shareholding_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    period_end TEXT NOT NULL,
    promoter_holding_pct REAL,
    institutional_holding_pct REAL,
    public_holding_pct REAL,
    pledged_promoter_pct REAL,
    total_shareholder_count INTEGER,
    source TEXT NOT NULL DEFAULT 'nse',
    source_url TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, period_end)
);

CREATE INDEX IF NOT EXISTS idx_sh_symbol ON shareholding_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_sh_period ON shareholding_snapshots(period_end);
