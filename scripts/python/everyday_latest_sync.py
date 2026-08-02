#!/usr/bin/env python3
"""
everyday_latest_sync.py — StockEX Daily EOD Ingestion Daemon.
Scrapes closing price data from public Yahoo Finance API and writes to Neon PostgreSQL.
Covers NSE Mainboard, BSE Script Codes, and SME Emerge boards.
Designed to run via crontab at 4:30 PM IST every market day.

Crontab entry:
    30 16 * * 1-5 DATABASE_URL="your_neon_url" /usr/bin/python3 /path/to/everyday_latest_sync.py >> /var/log/stockex_sync.log 2>&1
"""

import os
import sys
import time
import json
from datetime import datetime, timezone

try:
    import requests
    import psycopg2
except ImportError as e:
    print(f"Missing dependency: {e.name}")
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL")

NSE_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "WIPRO.NS", "HCLTECH.NS",
    "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "TITAN.NS", "ASIANPAINT.NS", "NTPC.NS", "KOTAKBANK.NS", "ONGC.NS",
    "POWERGRID.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "M&M.NS", "JSWSTEEL.NS",
    "TATAMOTORS.NS", "TATASTEEL.NS", "TECHM.NS", "GRASIM.NS", "INDUSINDBK.NS",
    "BAJAJFINSV.NS", "ADANIPORTS.NS", "DIVISLAB.NS", "DRREDDY.NS", "BRITANNIA.NS",
    "HINDUNILVR.NS", "COALINDIA.NS", "BPCL.NS", "IOC.NS", "EICHERMOT.NS",
    "HINDALCO.NS", "ADANIENT.NS", "CIPLA.NS", "HEROMOTOCO.NS", "BAJAJ-AUTO.NS",
    "SHREECEM.NS", "APOLLOHOSP.NS", "TATACONSUM.NS", "DLF.NS", "PIDILITIND.NS",
]

BSE_UNIVERSE = [
    "RELIANCE.BO", "TCS.BO", "HDFCBANK.BO", "INFY.BO", "ICICIBANK.BO",
    "SBIN.BO", "BHARTIARTL.BO", "ITC.BO", "WIPRO.BO", "HCLTECH.BO",
    "LT.BO", "AXISBANK.BO", "MARUTI.BO", "SUNPHARMA.BO", "TITAN.BO",
    "ASIANPAINT.BO", "NTPC.BO", "M&M.BO", "TATAMOTORS.BO", "TATASTEEL.BO",
    "HINDUNILVR.BO", "CIPLA.BO", "DRREDDY.BO", "BAJAJFINSV.BO", "EICHERMOT.BO",
]

SME_UNIVERSE = [
    "AARON.NS", "AAVAS.NS", "ACE.NS", "ALKYLAMINE.NS", "AMBER.NS",
    "ANURAS.NS", "APLAPOLLO.NS", "ASKAUTOLTD.NS", "AVANTIFEED.NS", "BASML.NS",
]

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
MAX_RETRIES = 3
POLITENESS_DELAY = 1.2


def fetch_with_retry(url: str, headers: dict, retries: int = MAX_RETRIES) -> dict | None:
    for attempt in range(retries):
        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code == 200:
                return res.json()
            if res.status_code == 429:
                wait = POLITENESS_DELAY * (attempt + 1) * 2
                print(f"    Rate limited. Backing off {wait:.1f}s...")
                time.sleep(wait)
                continue
            print(f"    HTTP {res.status_code} on attempt {attempt + 1}")
        except requests.RequestException as e:
            print(f"    Network error on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                time.sleep(POLITENESS_DELAY * (attempt + 1))
    return None


def sync_board(conn, cursor, board_tickers: list, board_name: str, today_str: str, headers: dict) -> int:
    success_count = 0
    for ticker in board_tickers:
        symbol_clean = ticker.replace(".NS", "").replace(".BO", "")
        url = YAHOO_CHART_URL.format(ticker=ticker)
        print(f"  [{board_name}] {symbol_clean}...", end=" ")

        data = fetch_with_retry(url, headers)
        if not data:
            print("SKIP (no data after retries)")
            continue

        result = data.get("chart", {}).get("result", [])
        if not result:
            print("SKIP (empty result)")
            continue

        meta = result[0].get("meta", {})
        current_price = float(meta.get("regularMarketPrice", 0.0))
        if current_price == 0.0:
            current_price = float(meta.get("chartPreviousClose", 0.0))
        if current_price == 0.0:
            print("SKIP (zero price)")
            continue

        try:
            cursor.execute("""
                INSERT INTO asset_historical_candles (ticker, timestamp, open, high, low, close, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker, date(timestamp)) DO UPDATE
                SET close = EXCLUDED.close, volume = EXCLUDED.volume;
            """, (symbol_clean, today_str, current_price, current_price, current_price, current_price, 0))
            conn.commit()
            success_count += 1
            print(f"INR {current_price}")
        except Exception as e:
            conn.rollback()
            print(f"DB error: {e}")

        time.sleep(POLITENESS_DELAY)

    return success_count


def run_daily_eod_sync():
    print(f"[{datetime.now().isoformat()}] Starting daily EOD sync...")

    if not DATABASE_URL:
        print("DATABASE_URL not set. Skipping sync.")
        return

    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    total = 0
    total += sync_board(conn, cursor, NSE_UNIVERSE, "NSE", today_str, headers)
    total += sync_board(conn, cursor, BSE_UNIVERSE, "BSE", today_str, headers)
    total += sync_board(conn, cursor, SME_UNIVERSE, "SME", today_str, headers)

    cursor.close()
    conn.close()
    total_boards = len(NSE_UNIVERSE) + len(BSE_UNIVERSE) + len(SME_UNIVERSE)
    print(f"[{datetime.now().isoformat()}] Sync complete. {total}/{total_boards} updated across NSE + BSE + SME.")


if __name__ == "__main__":
    run_daily_eod_sync()
