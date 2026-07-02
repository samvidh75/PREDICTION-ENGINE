#!/usr/bin/env python3
"""
everyday_latest_sync.py — StockEX Daily EOD Ingestion Daemon.
Scrapes closing price data from public Yahoo Finance API and writes to Neon PostgreSQL.
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

ACTIVE_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "WIPRO.NS", "HCLTECH.NS",
    "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "TITAN.NS", "ASIANPAINT.NS", "NTPC.NS", "KOTAKBANK.NS", "ONGC.NS",
]

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"


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
    headers = {"User-Agent": "Mozilla/5.0"}

    success_count = 0
    for ticker in ACTIVE_UNIVERSE:
        symbol_clean = ticker.replace(".NS", "").replace(".BO", "")
        url = YAHOO_CHART_URL.format(ticker=ticker)
        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code != 200:
                print(f"  {symbol_clean}: HTTP {res.status_code}")
                continue

            data = res.json()
            result = data.get("chart", {}).get("result", [])
            if not result:
                print(f"  {symbol_clean}: no data in response")
                continue

            meta = result[0].get("meta", {})
            current_price = float(meta.get("regularMarketPrice", 0.0))
            if current_price == 0.0:
                print(f"  {symbol_clean}: zero price, skipping")
                continue

            cursor.execute("""
                INSERT INTO asset_historical_candles (ticker, timestamp, open, high, low, close, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker, date(timestamp)) DO UPDATE
                SET close = EXCLUDED.close, volume = EXCLUDED.volume;
            """, (symbol_clean, today_str, current_price, current_price, current_price, current_price, 0))

            conn.commit()
            success_count += 1
            print(f"  {symbol_clean}: ₹{current_price} synced")

        except Exception as e:
            conn.rollback()
            print(f"  {symbol_clean}: error - {e}")

        time.sleep(1.0)

    cursor.close()
    conn.close()
    print(f"[{datetime.now().isoformat()}] Sync complete. {success_count}/{len(ACTIVE_UNIVERSE)} updated.")


if __name__ == "__main__":
    run_daily_eod_sync()
