"""
Database upload pipeline — reads cached market data, fundamentals, options
and upserts into PostgreSQL.

Lightweight: uses pandas .to_sql() with if_exists='append'.
No ORM overhead.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy import create_engine, text

from .market_data import get_historical, get_indicators
from .fundamental_scraper import screener_export


def get_engine(db_url: Optional[str] = None) -> object:
    """Create SQLAlchemy engine. Falls back to env DATABASE_URL."""
    if db_url is None:
        import os
        db_url = os.environ.get("DATABASE_URL", "sqlite:///market_live.db")
    return create_engine(db_url)


def upsert_ohlcv(engine, symbol: str) -> int:
    """
    Upload OHLCV + indicators to 'daily_prices' table.
    Returns number of rows inserted.
    """
    df = get_indicators(symbol)
    if df.empty:
        return 0

    df = df.reset_index()
    df["fetched_at"] = datetime.now()

    with engine.begin() as conn:
        # Delete existing rows for this symbol to avoid dups
        conn.execute(
            text("DELETE FROM daily_prices WHERE ticker = :sym"),
            {"sym": symbol.upper()},
        )
        df.to_sql("daily_prices", conn, if_exists="append", index=False)
    return len(df)


def upsert_fundamentals(engine, symbol: str) -> int:
    """
    Upload Screener.in fundamentals to 'stock_fundamentals' table.
    Returns number of rows inserted.
    """
    df = screener_export(symbol)
    if df is None or df.empty:
        return 0

    df["symbol"] = symbol.upper()
    df["synced_at"] = datetime.now()

    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM stock_fundamentals WHERE symbol = :sym"),
            {"sym": symbol.upper()},
        )
        df.to_sql("stock_fundamentals", conn, if_exists="append", index=False)
    return len(df)


def upsert_option_chain(engine, symbol: str, chain: list[dict]) -> int:
    """
    Upload option chain data (including Greeks) to 'option_chain' table.
    Returns number of rows.
    """
    rows = []
    for entry in chain:
        for side in ("ce", "pe"):
            leg = entry.get(side)
            if not leg:
                continue
            rows.append({
                "symbol": symbol.upper(),
                "strike": entry["strikePrice"],
                "expiry": entry.get("expiryDate"),
                "side": side,
                "last_price": leg.get("lastPrice"),
                "iv": leg.get("iv"),
                "delta": leg.get("delta"),
                "gamma": leg.get("gamma"),
                "vega": leg.get("vega"),
                "theta": leg.get("theta"),
                "rho": leg.get("rho"),
                "open_interest": leg.get("openInterest"),
                "volume": leg.get("volume"),
                "fetched_at": datetime.now(),
            })

    if not rows:
        return 0

    df = pd.DataFrame(rows)
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM option_chain WHERE symbol = :sym"),
            {"sym": symbol.upper()},
        )
        df.to_sql("option_chain", conn, if_exists="append", index=False)
    return len(df)


def create_tables_sql(engine):
    """
    Create target tables if they don't exist.
    Safe to call on every startup.
    """
    stmts = [
        """
        CREATE TABLE IF NOT EXISTS daily_prices (
            id SERIAL PRIMARY KEY,
            ticker VARCHAR(20) NOT NULL,
            date DATE NOT NULL,
            open DOUBLE PRECISION,
            high DOUBLE PRECISION,
            low DOUBLE PRECISION,
            close DOUBLE PRECISION,
            volume BIGINT,
            sma_20 DOUBLE PRECISION,
            sma_50 DOUBLE PRECISION,
            sma_200 DOUBLE PRECISION,
            ema_12 DOUBLE PRECISION,
            ema_26 DOUBLE PRECISION,
            ema_50 DOUBLE PRECISION,
            ema_200 DOUBLE PRECISION,
            rsi_14 DOUBLE PRECISION,
            macd DOUBLE PRECISION,
            macd_signal DOUBLE PRECISION,
            macd_hist DOUBLE PRECISION,
            bb_upper DOUBLE PRECISION,
            bb_lower DOUBLE PRECISION,
            bb_width DOUBLE PRECISION,
            atr_14 DOUBLE PRECISION,
            fetched_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(ticker, date)
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS stock_fundamentals (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            data JSONB,
            synced_at TIMESTAMP DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS option_chain (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            strike DOUBLE PRECISION,
            expiry DATE,
            side VARCHAR(4),
            last_price DOUBLE PRECISION,
            iv DOUBLE PRECISION,
            delta DOUBLE PRECISION,
            gamma DOUBLE PRECISION,
            vega DOUBLE PRECISION,
            theta DOUBLE PRECISION,
            rho DOUBLE PRECISION,
            open_interest BIGINT,
            volume BIGINT,
            fetched_at TIMESTAMP DEFAULT NOW()
        );
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_daily_prices_ticker
            ON daily_prices(ticker);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_option_chain_symbol
            ON option_chain(symbol);
        """,
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))
