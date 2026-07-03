-- Migration 051: User features — portfolio positions, transactions, thesis snapshots, custom watchlists, investor memory

-- Portfolio positions (mirrors IndexedDB for signed-in sync)
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(14, 4) NOT NULL,
  entry_price DECIMAL(14, 4) NOT NULL,
  entry_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  thesis_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user ON portfolio_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_symbol ON portfolio_positions(symbol);

-- Portfolio transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id TEXT PRIMARY KEY,
  position_id TEXT REFERENCES portfolio_positions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  quantity DECIMAL(14, 4) NOT NULL,
  price DECIMAL(14, 4) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_position ON portfolio_transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user ON portfolio_transactions(user_id);

-- Thesis snapshots
CREATE TABLE IF NOT EXISTS thesis_snapshots (
  id TEXT PRIMARY KEY,
  position_id TEXT REFERENCES portfolio_positions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  bull_case TEXT NOT NULL,
  bear_case TEXT NOT NULL,
  risk_factors JSONB DEFAULT '[]',
  catalysts JSONB DEFAULT '[]',
  conviction INTEGER NOT NULL CHECK (conviction BETWEEN 1 AND 10),
  target_price DECIMAL(14, 4),
  stop_loss DECIMAL(14, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_thesis_snapshots_position ON thesis_snapshots(position_id);
CREATE INDEX IF NOT EXISTS idx_thesis_snapshots_user ON thesis_snapshots(user_id);

-- Custom watchlists (remote mirror of localStorage)
CREATE TABLE IF NOT EXISTS custom_watchlists (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tickers JSONB DEFAULT '[]',
  is_archived BOOLEAN DEFAULT FALSE,
  is_favourite BOOLEAN DEFAULT FALSE,
  list_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_watchlists_user ON custom_watchlists(user_id);

-- Investor memory (preferences, decisions, learnings)
CREATE TABLE IF NOT EXISTS investor_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  preferences JSONB DEFAULT '{}',
  past_decisions JSONB DEFAULT '[]',
  learnings JSONB DEFAULT '[]',
  saved_companies JSONB DEFAULT '[]',
  saved_sectors JSONB DEFAULT '[]',
  saved_searches JSONB DEFAULT '[]',
  recent_activity JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investor_memory_user ON investor_memory(user_id);
