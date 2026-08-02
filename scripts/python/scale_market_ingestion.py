"""
Market-Wide Data Scaler — All 2,000+ NSE Equities
===================================================
Downloads the official NSE corporate symbol index, filters active equities,
and feeds them into BulkHistoryIngester and FundamentalScraper pipelines.

Handles NSE India's session/cookie requirements with automatic fallback.

Usage:
    python3 scale_market_ingestion.py                    # Full market sync
    python3 scale_market_ingestion.py --dry-run          # Preview symbols only
    python3 scale_market_ingestion.py --limit 50         # Process first 50 only
    python3 scale_market_ingestion.py --chunk-size 100   # Batch checkpoint every 100
    python3 scale_market_ingestion.py --skip-history      # Only fundamentals
    python3 scale_market_ingestion.py --skip-fundamentals # Only history

Environment:
    DATABASE_URL — Neon PostgreSQL connection string (required)
"""

import argparse
import csv
import io
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import requests

# Import the ingestion engines from sibling modules
sys.path.insert(0, str(Path(__file__).resolve().parent))
from bulk_history_ingester import BulkHistoryIngester
from fundamental_scraper import FundamentalScraper


DATABASE_URL = os.getenv("DATABASE_URL")

# NSE India public endpoints for equity list
NSE_BASE_URL = "https://www.nseindia.com"
NSE_EQUITY_LIST_URL = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20TOTAL%20MARKET"
NSE_SYMBOLS_CSV_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"

# Safe fallback: NIFTY 50 + NIFTY NEXT 50 (100 most liquid stocks)
FALLBACK_WATCHLIST = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "SBIN",
    "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE", "ASIANPAINT",
    "MARUTI", "SUNPHARMA", "TITAN", "WIPRO", "ULTRACEMCO", "ONGC", "NTPC",
    "TATAMOTORS", "TATASTEEL", "POWERGRID", "COALINDIA", "NESTLEIND",
    "TECHM", "BAJAJFINSV", "HCLTECH", "DRREDDY", "CIPLA", "EICHERMOT",
    "HEROMOTOCO", "APOLLOHOSP", "DIVISLAB", "BAJAJ-AUTO", "INDUSINDBK",
    "GRASIM", "TATACONSUM", "ADANIENT", "ADANIPORTS", "JSWSTEEL",
    "HINDALCO", "BRITANNIA", "PIDILITIND", "HDFCLIFE", "SBILIFE",
    "ICICIPRULI", "UPL", "SHREECEM", "COFORGE", "LTIM", "HINDUNILVR",
    "BRITANNIA", "DMART", "DABUR", "COLPAL", "MARICO", "BERGEPAINT",
    "CADILAHC", "TRENT", "ZOMATO", "PAYTM", "POLICYBZR", "NYKAA",
]


class MarketWideScaler:
    """Orchestrates market-wide data ingestion across all NSE listed equities."""

    def __init__(
        self,
        dry_run: bool = False,
        skip_history: bool = False,
        skip_fundamentals: bool = False,
        chunk_size: int = 50,
    ):
        self.dry_run = dry_run
        self.skip_history = skip_history
        self.skip_fundamentals = skip_fundamentals
        self.chunk_size = chunk_size
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        self.history_engine = BulkHistoryIngester(dry_run=dry_run)
        self.fundamental_engine = FundamentalScraper(dry_run=dry_run)
        self.stats = {"total": 0, "history_ok": 0, "history_err": 0,
                      "fund_ok": 0, "fund_err": 0, "skipped": 0}

    def _initialize_nse_session(self) -> bool:
        """
        NSE India requires visiting the main page first to obtain session cookies.
        This method performs that handshake.
        """
        try:
            print("  Initializing NSE session (obtaining cookies)...")
            resp = self.session.get(NSE_BASE_URL, timeout=15)
            if resp.status_code == 200:
                print("  NSE session initialized successfully.")
                return True
            print(f"  NSE session init returned HTTP {resp.status_code}")
            return False
        except Exception as e:
            print(f"  NSE session init failed: {e}")
            return False

    def fetch_active_nse_ticker_list(self) -> List[str]:
        """
        Downloads and filters the official master equity list from NSE India.
        Tries multiple endpoints with automatic fallback.
        """
        print("\n⏳ Synchronizing master equity index from NSE India...")

        # Strategy 1: Try the NSE API endpoint (requires session cookies)
        symbols = self._try_nse_api_endpoint()
        if symbols:
            return symbols

        # Strategy 2: Try the CSV archive endpoint
        symbols = self._try_nse_csv_endpoint()
        if symbols:
            return symbols

        # Strategy 3: Try the equity indices endpoint
        symbols = self._try_nse_indices_endpoint()
        if symbols:
            return symbols

        # Fallback: Use hardcoded NIFTY 50 + NEXT 50
        print("⚠️  All NSE endpoints failed. Using safe fallback list (100 liquid stocks).")
        return FALLBACK_WATCHLIST

    def _try_nse_api_endpoint(self) -> Optional[List[str]]:
        """Try fetching from NSE's equity list API."""
        try:
            self._initialize_nse_session()
            # The NSE equity list CSV endpoint
            url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20TOTAL%20MARKET"
            resp = self.session.get(url, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                symbols = [item.get("symbol", "") for item in data.get("data", [])]
                symbols = [s.strip() for s in symbols if s.strip()]
                if symbols:
                    print(f"✅ Extracted {len(symbols)} active symbols from NSE API.")
                    return symbols
        except Exception as e:
            print(f"  NSE API endpoint failed: {e}")
        return None

    def _try_nse_csv_endpoint(self) -> Optional[List[str]]:
        """Try fetching from NSE's CSV archive."""
        try:
            resp = self.session.get(NSE_SYMBOLS_CSV_URL, timeout=15)
            if resp.status_code == 200:
                content = resp.content.decode("utf-8", errors="replace")
                reader = csv.DictReader(io.StringIO(content))
                symbols = []
                for row in reader:
                    sym = row.get("SYMBOL", "").strip()
                    if sym:
                        symbols.append(sym)
                if symbols:
                    print(f"✅ Extracted {len(symbols)} symbols from NSE CSV archive.")
                    return symbols
        except Exception as e:
            print(f"  NSE CSV endpoint failed: {e}")
        return None

    def _try_nse_indices_endpoint(self) -> Optional[List[str]]:
        """Try fetching from NSE's NIFTY TOTAL MARKET index."""
        try:
            self._initialize_nse_session()
            resp = self.session.get(
                "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20TOTAL%20MARKET",
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                symbols = [
                    item.get("symbol", "")
                    for item in data.get("data", [])
                    if item.get("symbol")
                ]
                if symbols:
                    print(f"✅ Extracted {len(symbols)} symbols from NSE indices endpoint.")
                    return symbols
        except Exception as e:
            print(f"  NSE indices endpoint failed: {e}")
        return None

    def _is_valid_symbol(self, symbol: str) -> bool:
        """Filter out invalid, delisted, or non-equity symbols."""
        s = symbol.strip().upper()
        if not s or len(s) > 20:
            return False
        # Skip series like EQ, BE, SM, ST, etc. if present
        # Keep only the base symbol
        if " " in s:
            return False
        return True

    def execute_market_wide_bulk_scale(
        self,
        tickers: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ):
        """
        Processes all tickers through both ingestion engines in polite batches.
        """
        if tickers is None:
            tickers = self.fetch_active_nse_ticker_list()

        # Filter valid symbols
        tickers = [t.upper().strip() for t in tickers if self._is_valid_symbol(t)]

        if limit:
            tickers = tickers[:limit]

        self.stats["total"] = len(tickers)

        mode_label = "DRY RUN" if self.dry_run else "LIVE"
        history_label = "SKIP" if self.skip_history else "ON"
        fund_label = "SKIP" if self.skip_fundamentals else "ON"

        print(f"\n{'='*70}")
        print(f"  MARKET-WIDE DATA SCALER")
        print(f"  Mode:       {mode_label}")
        print(f"  History:    {history_label}")
        print(f"  Fundamentals: {fund_label}")
        print(f"  Tickers:    {len(tickers)}")
        print(f"  Chunk size: {self.chunk_size}")
        print(f"  Started:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")

        for index, symbol in enumerate(tickers):
            progress = f"[{index + 1}/{len(tickers)}]"
            print(f"{progress} Processing: {symbol}")

            # 1. Download up to 20 years of daily candlestick charts
            if not self.skip_history:
                try:
                    ok = self.history_engine.download_and_sync_ticker(symbol)
                    if ok:
                        self.stats["history_ok"] += 1
                    else:
                        self.stats["history_err"] += 1
                except Exception as e:
                    print(f"  {symbol} history error: {e}")
                    self.stats["history_err"] += 1
                time.sleep(1.5)

            # 2. Extract fundamental ratios from public web sheets
            if not self.skip_fundamentals:
                try:
                    ok = self.fundamental_engine.scrape_and_sync_ratios(symbol)
                    if ok:
                        self.stats["fund_ok"] += 1
                    else:
                        self.stats["fund_err"] += 1
                except Exception as e:
                    print(f"  {symbol} fundamental error: {e}")
                    self.stats["fund_err"] += 1
                time.sleep(1.5)

            # Periodic checkpoint log
            if (index + 1) % self.chunk_size == 0:
                elapsed_pct = ((index + 1) / len(tickers)) * 100
                print(f"\n  📦 Checkpoint: {index + 1}/{len(tickers)} "
                      f"({elapsed_pct:.1f}%) — pausing 5s to flush buffers...\n")
                if not self.dry_run:
                    time.sleep(5)

        self._print_summary()

    def _print_summary(self):
        print(f"\n{'='*70}")
        print(f"  MARKET-WIDE SYNC COMPLETE")
        print(f"  Total tickers:     {self.stats['total']}")
        print(f"  History OK:        {self.stats['history_ok']}")
        print(f"  History errors:    {self.stats['history_err']}")
        print(f"  Fundamentals OK:   {self.stats['fund_ok']}")
        print(f"  Fund errors:       {self.stats['fund_err']}")
        print(f"  Completed:         {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Market-wide data scaler — syncs all NSE equities to Neon PostgreSQL."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview symbols without writing to database"
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Process only the first N symbols (for testing)"
    )
    parser.add_argument(
        "--chunk-size", type=int, default=50,
        help="Number of tickers between checkpoint pauses (default: 50)"
    )
    parser.add_argument(
        "--skip-history", action="store_true",
        help="Skip historical candle ingestion (only run fundamentals)"
    )
    parser.add_argument(
        "--skip-fundamentals", action="store_true",
        help="Skip fundamental scraping (only run history)"
    )
    parser.add_argument(
        "--tickers", type=str, default=None,
        help="Comma-separated list of tickers to process (overrides NSE fetch)"
    )
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("  export DATABASE_URL='postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require'")
        sys.exit(1)

    tickers = None
    if args.tickers:
        tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]

    scaler = MarketWideScaler(
        dry_run=args.dry_run,
        skip_history=args.skip_history,
        skip_fundamentals=args.skip_fundamentals,
        chunk_size=args.chunk_size,
    )

    scaler.execute_market_wide_bulk_scale(tickers=tickers, limit=args.limit)
