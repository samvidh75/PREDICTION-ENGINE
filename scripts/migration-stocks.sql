CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
  sector VARCHAR(100),
  sub_sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap NUMERIC(20, 2),
  isin VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_is_active ON stocks(is_active);

CREATE TABLE IF NOT EXISTS market_holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO market_holidays (date, description) VALUES
  ('2026-01-26', 'Republic Day'),
  ('2026-03-25', 'Holi'),
  ('2026-04-02', 'Good Friday'),
  ('2026-04-10', 'Ram Navami'),
  ('2026-08-15', 'Independence Day'),
  ('2026-09-16', 'Ganesh Chaturthi'),
  ('2026-10-02', 'Mahatma Gandhi Jayanti'),
  ('2026-10-20', 'Diwali'),
  ('2026-11-09', 'Chhat Puja'),
  ('2026-11-10', 'Guru Nanak Jayanti'),
  ('2026-11-11', 'Bhai Dooj'),
  ('2026-12-25', 'Christmas')
ON CONFLICT (date) DO NOTHING;

CREATE TABLE IF NOT EXISTS market_snapshots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  timestamp TIMESTAMP NOT NULL,
  stocks JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON market_snapshots(date);
