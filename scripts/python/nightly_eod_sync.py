#!/usr/bin/env python3
"""
Nightly EOD Data Sync
- Runs daily after market close (4:30 PM IST)
- Fetches fundamentals from Upstox, Screener, Groww
- Writes to PostgreSQL
- Updates stock_scores table with fresh calculations
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from sqlalchemy import create_engine, text
import httpx
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URL = os.getenv('DATABASE_URL')
engine = create_engine(DB_URL)


async def fetch_upstox_fundamentals(symbol: str) -> dict:
    api_key = os.getenv('UPSTOX_API_KEY')

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://api.upstox.com/v2/stock/{symbol}/fundamentals",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            data = response.json()

            return {
                'symbol': symbol,
                'pe': data.get('pe'),
                'pb': data.get('pb'),
                'roe': data.get('roe'),
                'roic': data.get('roic'),
                'debt_to_equity': data.get('debt_to_equity'),
                'ev_ebitda': data.get('ev_ebitda'),
                'dividend_yield': data.get('dividend_yield'),
                'fcf_yield': data.get('fcf_yield'),
                'current_ratio': data.get('current_ratio'),
                'interest_coverage': data.get('interest_coverage'),
                'operating_margin': data.get('operating_margin'),
                'fetched_from': 'upstox',
                'fetched_at': datetime.now()
            }
        except Exception as e:
            logger.error(f"Upstox fetch failed for {symbol}: {e}")
            return None


async def fetch_screener_fundamentals(symbol: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://www.screener.in/api/company/{symbol}/",
                headers={"User-Agent": "StockStory/1.0"}
            )
            data = response.json()

            return {
                'symbol': symbol,
                'revenue_growth_3y': data.get('revenue_growth_3y'),
                'profit_growth_3y': data.get('profit_growth_3y'),
                'operating_margin': data.get('operating_margin'),
                'dividend_yield': data.get('dividend_yield'),
                'market_cap': data.get('market_cap'),
                'eps': data.get('eps'),
                'fetched_from': 'screener',
                'fetched_at': datetime.now()
            }
        except Exception as e:
            logger.error(f"Screener fetch failed for {symbol}: {e}")
            return None


def get_all_symbols() -> list:
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT symbol FROM company_registry WHERE active = true ORDER BY market_cap DESC"
        ))
        return [row[0] for row in result.fetchall()]


def upsert_fundamentals(symbol: str, fundamentals: dict):
    if not fundamentals:
        return

    with engine.connect() as conn:
        existing = conn.execute(text(
            "SELECT id FROM stock_fundamentals WHERE symbol = :symbol ORDER BY snapshot_date DESC LIMIT 1"
        ), {"symbol": symbol}).scalar()

        if existing:
            conn.execute(text("""
                UPDATE stock_fundamentals
                SET
                    pe = COALESCE(:pe, pe),
                    pb = COALESCE(:pb, pb),
                    roe = COALESCE(:roe, roe),
                    roic = COALESCE(:roic, roic),
                    debt_to_equity = COALESCE(:de, debt_to_equity),
                    ev_ebitda = COALESCE(:ev_ebitda, ev_ebitda),
                    dividend_yield = COALESCE(:div_yield, dividend_yield),
                    fcf_yield = COALESCE(:fcf_yield, fcf_yield),
                    current_ratio = COALESCE(:cr, current_ratio),
                    interest_coverage = COALESCE(:ic, interest_coverage),
                    operating_margin = COALESCE(:op_margin, operating_margin),
                    updated_at = now()
                WHERE symbol = :symbol
            """), {
                'symbol': symbol,
                'pe': fundamentals.get('pe'),
                'pb': fundamentals.get('pb'),
                'roe': fundamentals.get('roe'),
                'roic': fundamentals.get('roic'),
                'de': fundamentals.get('debt_to_equity'),
                'ev_ebitda': fundamentals.get('ev_ebitda'),
                'div_yield': fundamentals.get('dividend_yield'),
                'fcf_yield': fundamentals.get('fcf_yield'),
                'cr': fundamentals.get('current_ratio'),
                'ic': fundamentals.get('interest_coverage'),
                'op_margin': fundamentals.get('operating_margin')
            })
        else:
            conn.execute(text("""
                INSERT INTO stock_fundamentals (
                    symbol, pe, pb, roe, roic, debt_to_equity, ev_ebitda,
                    dividend_yield, fcf_yield, current_ratio, interest_coverage,
                    operating_margin, snapshot_date
                ) VALUES (
                    :symbol, :pe, :pb, :roe, :roic, :de, :ev_ebitda,
                    :div_yield, :fcf_yield, :cr, :ic, :op_margin, now()
                )
            """), {
                'symbol': symbol,
                'pe': fundamentals.get('pe'),
                'pb': fundamentals.get('pb'),
                'roe': fundamentals.get('roe'),
                'roic': fundamentals.get('roic'),
                'de': fundamentals.get('debt_to_equity'),
                'ev_ebitda': fundamentals.get('ev_ebitda'),
                'div_yield': fundamentals.get('dividend_yield'),
                'fcf_yield': fundamentals.get('fcf_yield'),
                'cr': fundamentals.get('current_ratio'),
                'ic': fundamentals.get('interest_coverage'),
                'op_margin': fundamentals.get('operating_margin')
            })

        conn.commit()


async def run_nightly_sync():
    logger.info("Nightly EOD Sync Starting...")

    symbols = get_all_symbols()
    logger.info(f"Syncing {len(symbols)} symbols")

    batch_size = 10
    success_count = 0
    error_count = 0

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]

        tasks = [
            fetch_upstox_fundamentals(sym) for sym in batch
        ]
        results = await asyncio.gather(*tasks)

        for symbol, fundamentals in zip(batch, results):
            if fundamentals:
                upsert_fundamentals(symbol, fundamentals)
                success_count += 1
            else:
                screener_data = await fetch_screener_fundamentals(symbol)
                if screener_data:
                    upsert_fundamentals(symbol, screener_data)
                    success_count += 1
                else:
                    error_count += 1
                    logger.warning(f"No data for {symbol}")

        logger.info(f"Processed batch {i // batch_size + 1}/{(len(symbols) - 1) // batch_size + 1}")

    logger.info(f"Sync complete: {success_count} success, {error_count} failed")


if __name__ == "__main__":
    asyncio.run(run_nightly_sync())
