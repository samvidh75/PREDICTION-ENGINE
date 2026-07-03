#!/usr/bin/env python3
"""
Sync NSE universe from official NSE API to our company_registry table.

Fetch all ~2000 NSE equity symbols + metadata, upsert to Postgres.
Run weekly to catch new listings.
"""

import httpx
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, text
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URL = os.getenv('DATABASE_URL', 'postgresql://localhost/stockstory')
engine = create_engine(DB_URL)


async def fetch_nse_universe() -> list:
    nse_url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                nse_url,
                headers={"Referer": "https://www.nseindia.com/"}
            )
            data = response.json()

            symbols = []
            for record in data.get('data', []):
                symbols.append({
                    'symbol': record['symbol'],
                    'company_name': record['name'],
                    'sector': record.get('sector', 'General'),
                    'industry': record.get('industry', ''),
                    'market_cap': record.get('marketCap'),
                    'pe': record.get('pe'),
                    'nse_listed': True,
                    'last_updated': datetime.now()
                })

            logger.info(f"Fetched {len(symbols)} NSE symbols")
            return symbols
        except Exception as e:
            logger.error(f"NSE fetch failed: {e}")
            return []


def upsert_company_registry(symbols: list):
    if not symbols:
        return

    df = pd.DataFrame(symbols)

    with engine.connect() as conn:
        for _, row in df.iterrows():
            conn.execute(text("""
                INSERT INTO company_registry (
                    symbol, company_name, sector, industry, 
                    market_cap, pe, nse_listed, active, created_at, updated_at
                ) VALUES (
                    :symbol, :name, :sector, :industry,
                    :market_cap, :pe, :nse_listed, true, now(), now()
                )
                ON CONFLICT (symbol) DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    market_cap = EXCLUDED.market_cap,
                    pe = EXCLUDED.pe,
                    updated_at = now()
            """), {
                'symbol': row['symbol'],
                'name': row['company_name'],
                'sector': row['sector'],
                'industry': row['industry'],
                'market_cap': row['market_cap'],
                'pe': row['pe'],
                'nse_listed': True
            })

        conn.commit()
        logger.info(f"Upserted {len(df)} symbols to company_registry")


def validate_chennpetro():
    with engine.connect() as conn:
        registry = conn.execute(text(
            "SELECT symbol, active FROM company_registry WHERE symbol = 'CHENNPETRO'"
        )).scalar()

        if registry:
            logger.info("CHENNPETRO found in registry")
        else:
            logger.warning("CHENNPETRO NOT in registry — will be added by upsert")

        universe = conn.execute(text(
            "SELECT symbol FROM stock_fundamentals WHERE symbol = 'CHENNPETRO' LIMIT 1"
        )).scalar()

        if universe:
            logger.info("CHENNPETRO found in backend universe (fundamentals)")
        else:
            logger.warning("CHENNPETRO NOT in fundamentals — needs EOD sync")


import asyncio


async def main():
    logger.info("NSE Universe Sync Starting...")

    symbols = await fetch_nse_universe()
    upsert_company_registry(symbols)
    validate_chennpetro()

    logger.info("NSE universe sync complete")


if __name__ == "__main__":
    asyncio.run(main())
