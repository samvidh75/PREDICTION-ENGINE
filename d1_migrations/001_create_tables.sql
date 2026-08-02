-- D1 Migration: Initial schema for stockex-db
-- Run this in the D1 Console: https://dash.cloudflare.com/26082f24903288544e72acf918323c95/workers/d1/databases/bf97f03f-35e4-45e0-bd35-dbc3f24ac112/console

CREATE TABLE IF NOT EXISTS stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  pe_ratio REAL,
  roe REAL,
  market_cap REAL,
  price REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  method TEXT,
  results TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FTS5 full-text search (free Vectorize alternative for RAG)
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  ticker, content, source,
  content=knowledge_entries,
  content_rowid=id,
  tokenize='porter unicode61'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(rowid, ticker, content, source) VALUES (new.id, new.ticker, new.content, new.source);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, ticker, content, source) VALUES('delete', old.id, old.ticker, old.content, old.source);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, ticker, content, source) VALUES('delete', old.id, old.ticker, old.content, old.source);
  INSERT INTO knowledge_fts(rowid, ticker, content, source) VALUES (new.id, new.ticker, new.content, new.source);
END;

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_knowledge_ticker ON knowledge_entries(ticker);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at);
