CREATE TABLE IF NOT EXISTS market_snapshots (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  stocks JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_date ON market_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_timestamp ON market_snapshots(timestamp);

CREATE TABLE IF NOT EXISTS stock_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES market_snapshots(id),
  symbol VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(snapshot_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_symbol ON stock_snapshots(symbol);

CREATE TABLE IF NOT EXISTS market_holidays (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_holidays_date ON market_holidays(date);


CREATE TABLE IF NOT EXISTS market_holidays (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);
