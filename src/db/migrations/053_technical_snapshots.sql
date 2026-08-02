-- 053_technical_snapshots.sql
--
-- Persists real technical-indicator snapshots computed from EODHD daily
-- OHLCV history by TechnicalSnapshotRefresh (src/stockstory/ingestion/).
-- All fields are nullable: insufficient candle history or a provider
-- failure yields nulls, never a fabricated value.

CREATE TABLE IF NOT EXISTS technical_snapshots (
  symbol VARCHAR(20) NOT NULL,
  trade_date DATE NOT NULL,

  last_price DECIMAL(14,4),
  change_1d DECIMAL(10,4),
  momentum_1m DECIMAL(10,4),
  momentum_3m DECIMAL(10,4),
  momentum_6m DECIMAL(10,4),
  volatility_30d DECIMAL(10,4),
  drawdown_from_high DECIMAL(10,4),
  volume_trend DECIMAL(10,4),
  rsi_14 DECIMAL(8,4),
  macd DECIMAL(12,6),
  macd_signal DECIMAL(12,6),
  atr_14 DECIMAL(12,6),
  adx_14 DECIMAL(8,4),
  price_vs_52w_high DECIMAL(10,4),
  price_vs_200dma DECIMAL(10,4),

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_technical_snapshots_symbol ON technical_snapshots (symbol, trade_date DESC);
