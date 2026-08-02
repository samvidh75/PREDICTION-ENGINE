CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  exchange VARCHAR(10) NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
  sector VARCHAR(100),
  sub_sector VARCHAR(100),
  market_cap DECIMAL(20, 2),
  isin VARCHAR(12) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_stocks_is_active ON stocks(is_active);

CREATE TABLE IF NOT EXISTS stock_updates (
  id SERIAL PRIMARY KEY,
  stock_id INT NOT NULL REFERENCES stocks(id),
  update_type VARCHAR(50),
  update_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_updates_stock_id ON stock_updates(stock_id);
