"""
Bulk Historical Candle Ingester — Free Data Pipeline
=====================================================
Downloads 20 years of daily OHLCV data from Yahoo Finance public endpoints
and upserts into Neon PostgreSQL asset_historical_candles table.

No broker API key required. Uses unrestricted public charting endpoints.

Usage:
    python3 bulk_history_ingester.py                          # Default watchlist
    python3 bulk_history_ingester.py --tickers RELIANCE,TCS   # Specific tickers
    python3 bulk_history_ingester.py --watchlist-file stocks.txt  # From file
    python3 bulk_history_ingester.py --dry-run                 # Preview only

Environment:
    DATABASE_URL — Neon PostgreSQL connection string (required)
"""

import argparse
import os
import sys
import time
from datetime import datetime
from typing import List

import requests

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


DATABASE_URL = os.getenv("DATABASE_URL")

# Default NSE blue-chip watchlist
DEFAULT_WATCHLIST = [
    "RELIANCE", "TCS", "SBIN", "INFY", "TATAMOTORS", "HDFCBANK",
    "ICICIBANK", "HINDUNILVR", "ITC", "KOTAKBANK", "BHARTIARTL",
    "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE",
    "WIPRO", "HCLTECH", "ADANIENT", "ONGC", "NTPC", "TATASTEEL",
    "JSWSTEEL", "POWERGRID", "COALINDIA", "TECHM", "DRREDDY",
    "CIPLA", "DIVISLAB", "EICHERMOT", "BAJAJFINSV", "HEROMOTOCO",
    "BAJAJ-AUTO", "INDUSINDBK", "GRASIM", "TATACONSUM", "APOLLOHOSP",
    "NESTLEIND", "UPL", "SHREECEM", "LTIM", "HDFCLIFE", "SBILIFE",
    "BRITANNIA", "BPCL", "HINDALCO", "COFORGE", "PIDILITIND",
]


class BulkHistoryIngester:
    """Downloads maximum historical daily candles from Yahoo Finance and syncs to Postgres."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        self.stats = {"tickers": 0, "candles": 0, "errors": 0, "skipped": 0}

    def download_and_sync_ticker(self, ticker: str) -> bool:
        """Fetch max historical data for a single ticker and upsert to Postgres."""
        clean_ticker = ticker.upper().strip()
        print(f"  [{clean_ticker}] Fetching max daily history...")

        # Yahoo Finance v8 chart endpoint — range=max returns maximum available history
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/"
            f"{clean_ticker}.NS?interval=1d&range=max"
        )

        try:
            res = self.session.get(url, timeout=15)
            if res.status_code != 200:
                print(f"  [{clean_ticker}] SKIP — HTTP {res.status_code}")
                self.stats["skipped"] += 1
                return False

            data = res.json()
            chart_result = data.get("chart", {}).get("result")
            if not chart_result:
                print(f"  [{clean_ticker}] SKIP — No chart data returned")
                self.stats["skipped"] += 1
                return False

            result = chart_result[0]
            timestamps = result.get("timestamp", [])
            indicators = result.get("indicators", {}).get("quote", [{}])[0]

            if not timestamps:
                print(f"  [{clean_ticker}] SKIP — Empty timestamp array")
                self.stats["skipped"] += 1
                return False

            # Build batch records, filtering corrupted rows
            batch_records = []
            for i in range(len(timestamps)):
                open_px = indicators.get("open", [None] * len(timestamps))[i]
                high_px = indicators.get("high", [None] * len(timestamps))[i]
                low_px = indicators.get("low", [None] * len(timestamps))[i]
                close_px = indicators.get("close", [None] * len(timestamps))[i]
                volume = indicators.get("volume", [0] * len(timestamps))[i]

                if None in (open_px, high_px, low_px, close_px):
                    continue

                batch_records.append((
                    clean_ticker,
                    int(timestamps[i]),
                    float(open_px),
                    float(high_px),
                    float(low_px),
                    float(close_px),
                    int(volume or 0),
                ))

            if not batch_records:
                print(f"  [{clean_ticker}] SKIP — No valid OHLCV rows after filtering")
                self.stats["skipped"] += 1
                return False

            self.stats["candles"] += len(batch_records)
            self.stats["tickers"] += 1

            if self.dry_run:
                print(f"  [{clean_ticker}] DRY RUN — Would upsert {len(batch_records)} candles")
                return True

            self._write_to_postgres(clean_ticker, batch_records)
            print(f"  [{clean_ticker}] OK — {len(batch_records)} candles upserted")
            return True

        except requests.exceptions.Timeout:
            print(f"  [{clean_ticker}] ERROR — Request timed out")
            self.stats["errors"] += 1
            return False
        except Exception as e:
            print(f"  [{clean_ticker}] ERROR — {e}")
            self.stats["errors"] += 1
            return False

    def _write_to_postgres(self, ticker: str, records: list):
        """Batch upsert candle records into Neon PostgreSQL."""
        conn = psycopg2.connect(DATABASE_URL)
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO asset_historical_candles
                    (ticker, timestamp, open, high, low, close, volume)
                VALUES %s
                ON CONFLICT (ticker, timestamp) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
            """
            execute_values(cursor, query, records, page_size=500)
            conn.commit()
            cursor.close()
        finally:
            conn.close()

    def run(self, tickers: List[str]):
        """Process all tickers sequentially with a polite delay."""
        print(f"\n{'='*60}")
        print(f"  BULK HISTORY INGESTER")
        print(f"  Tickers: {len(tickers)} | Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

        for i, ticker in enumerate(tickers):
            self.download_and_sync_ticker(ticker)
            # Polite delay to avoid rate limits (1 second between requests)
            if i < len(tickers) - 1:
                time.sleep(1)

        print(f"\n{'='*60}")
        print(f"  COMPLETE")
        print(f"  Tickers processed: {self.stats['tickers']}")
        print(f"  Total candles:     {self.stats['candles']}")
        print(f"  Skipped:           {self.stats['skipped']}")
        print(f"  Errors:            {self.stats['errors']}")
        print(f"{'='*60}\n")


def load_tickers_from_file(path: str) -> List[str]:
    """Read tickers from a file (one per line, comma or newline separated)."""
    with open(path, "r") as f:
        content = f.read()
    tickers = []
    for part in content.replace("\n", ",").split(","):
        t = part.strip().upper()
        if t and len(t) <= 20:
            tickers.append(t)
    return tickers


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Bulk historical candle ingester — downloads max daily OHLCV to Postgres."
    )
    parser.add_argument(
        "--tickers", type=str, default=None,
        help="Comma-separated list of tickers (e.g. RELIANCE,TCS,INFY)"
    )
    parser.add_argument(
        "--watchlist-file", type=str, default=None,
        help="Path to file containing tickers (one per line or comma-separated)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be downloaded without writing to database"
    )
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("  export DATABASE_URL='postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require'")
        sys.exit(1)

    # Determine tickers to process
    if args.watchlist_file:
        tickers = load_tickers_from_file(args.watchlist_file)
    elif args.tickers:
        tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    else:
        tickers = DEFAULT_WATCHLIST

    if not tickers:
        print("ERROR: No tickers to process.")
        sys.exit(1)

    ingester = BulkHistoryIngester(dry_run=args.dry_run)
    ingester.run(tickers)
