#!/usr/bin/env python3
"""
everyday_latest_sync.py — StockEX Daily EOD Ingestion Daemon.
Scrapes closing price data from the public Yahoo Finance API and writes to
Neon PostgreSQL. Covers the PSE main board and the SME (Small, Medium and
Emerging) board.
Designed to run via crontab at 4:30 PM PHT every market day (after the
PSE's 3:30 PM PHT close).

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

PSE_UNIVERSE = [
    "BDO.PS", "JFC.PS", "SM.PS", "AC.PS", "ALI.PS",
    "SMPH.PS", "BPI.PS", "TEL.PS", "GLO.PS", "MER.PS",
    "MBT.PS", "URC.PS", "AEV.PS", "JGS.PS", "SECB.PS",
    "GTCAP.PS", "CNPF.PS", "EMI.PS", "WLCON.PS", "MONDE.PS",
    "PGOLD.PS", "RRHI.PS", "RLC.PS", "DMC.PS", "ACEN.PS",
    "BLOOM.PS", "AP.PS", "FGEN.PS", "MWIDE.PS", "ANI.PS",
    "CEB.PS", "FLI.PS", "IMI.PS", "MEG.PS", "NIKL.PS",
    "PXP.PS", "SCC.PS", "SSI.PS", "TFHI.PS", "VLL.PS",
    "CHP.PS", "MJC.PS", "HCOR.PS", "ATN.PS", "DMP.PS",
    "CLC.PS", "WEB.PS", "NCM.PS", "OPM.PS",
]

# Small, Medium and Emerging board — left empty rather than filled with
# guessed tickers (see the same reasoning in PSESymbolNormalizer.ts).
SME_UNIVERSE: list[str] = []

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
        symbol_clean = ticker.replace(".PS", "")
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
            print(f"PHP {current_price}")
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
    total += sync_board(conn, cursor, PSE_UNIVERSE, "PSE", today_str, headers)
    if SME_UNIVERSE:
        total += sync_board(conn, cursor, SME_UNIVERSE, "SME", today_str, headers)

    cursor.close()
    conn.close()
    total_boards = len(PSE_UNIVERSE) + len(SME_UNIVERSE)
    print(f"[{datetime.now().isoformat()}] Sync complete. {total}/{total_boards} updated across PSE + SME.")


if __name__ == "__main__":
    run_daily_eod_sync()
