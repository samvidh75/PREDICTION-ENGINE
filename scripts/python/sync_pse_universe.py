#!/usr/bin/env python3
"""
Sync PSE universe to our company_registry table.

Run weekly to catch new listings.

KNOWN GAP (fixed from a real bug, not just relabeled): this file previously
called the real Indian NSE website API (www.nseindia.com, NIFTY 500 index)
and inserted the result into company_registry under a "PSE" label — meaning
every past run would have written real Indian company data into a table that
is supposed to hold Philippine Stock Exchange listings. Its INSERT statement
also referenced columns (company_name, pe, active, nse_listed) that don't
exist on the real company_registry schema (see
src/db/migrations/050_live_quotes_tables.sql — actual columns are id, symbol,
name, sector, industry, market_cap, listed_date, isin, updated_at,
created_at), so even ignoring the wrong-country bug this script has never
successfully run against the real schema.

There is no confirmed, working, free bulk PSE symbol-list API as of this
fix — PSE EDGE (edge.pse.com.ph) is a per-disclosure scraper, not a company
directory. Rather than invent a plausible-looking endpoint, this sync is
left as a documented no-op until a real PSE symbol source is wired in. The
static list in src/services/universe/StockUniverse.ts remains the source of
truth for now.
"""

import logging
import os

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URL = os.getenv('DATABASE_URL', 'postgresql://localhost/stockstory')
engine = create_engine(DB_URL)


async def fetch_pse_universe() -> list:
    """Not implemented — see module doc for why. Returns no results rather
    than fabricating or fetching the wrong country's data."""
    logger.warning("fetch_pse_universe: no verified PSE symbol-list source wired in — skipping")
    return []


def upsert_company_registry(symbols: list):
    if not symbols:
        logger.info("No symbols to upsert.")
        return

    with engine.connect() as conn:
        for row in symbols:
            conn.execute(text("""
                INSERT INTO company_registry (
                    symbol, name, sector, industry, market_cap, listed_date, isin
                ) VALUES (
                    :symbol, :name, :sector, :industry, :market_cap, :listed_date, :isin
                )
                ON CONFLICT (symbol) DO UPDATE SET
                    name = EXCLUDED.name,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    market_cap = EXCLUDED.market_cap,
                    updated_at = now()
            """), row)

        conn.commit()
        logger.info(f"Upserted {len(symbols)} symbols to company_registry")


def validate_known_symbol(symbol: str = "BDO"):
    """Sanity-check that a real, well-known PSE symbol is present in the
    registry and fundamentals tables after a sync."""
    with engine.connect() as conn:
        registry = conn.execute(text(
            "SELECT symbol FROM company_registry WHERE symbol = :symbol"
        ), {"symbol": symbol}).scalar()

        if registry:
            logger.info(f"{symbol} found in registry")
        else:
            logger.warning(f"{symbol} NOT in registry — will be added by upsert")

        fundamentals = conn.execute(text(
            "SELECT symbol FROM stock_fundamentals WHERE symbol = :symbol LIMIT 1"
        ), {"symbol": symbol}).scalar()

        if fundamentals:
            logger.info(f"{symbol} found in stock_fundamentals")
        else:
            logger.warning(f"{symbol} NOT in stock_fundamentals — needs EOD sync")


import asyncio


async def main():
    logger.info("PSE Universe Sync Starting...")

    symbols = await fetch_pse_universe()
    upsert_company_registry(symbols)
    validate_known_symbol()

    logger.info("PSE universe sync complete")


if __name__ == "__main__":
    asyncio.run(main())
