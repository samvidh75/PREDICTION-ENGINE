-- User portfolio transactions for the Premium Portfolio Analyzer.
-- Stores buy/sell logs and enables allocation calculations.

CREATE TABLE IF NOT EXISTS user_portfolio_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL,
    average_price REAL NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON user_portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_ticker ON user_portfolio_transactions(ticker);
