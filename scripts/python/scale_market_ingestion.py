"""
Market-Wide Data Scaler — All 2,000+ PSE Equities
===================================================
Downloads the official PSE corporate symbol index, filters active equities,
and feeds them into BulkHistoryIngester and FundamentalScraper pipelines.

KNOWN GAP (fixed from a real bug): this previously called the real Indian
NSE website (www.nseindia.com, NIFTY TOTAL MARKET index) under a "PSE"
label — meaning a live run would have downloaded Indian equity symbols and
fed them into the PSE ingestion pipeline. There is no confirmed, working,
free bulk PSE symbol-list API as of this fix, so rather than swap in a
guessed endpoint, the three NSE-hitting methods below now return None
immediately and this always falls through to FALLBACK_WATCHLIST (real PSE
tickers only). Confirmed dead — no deployment/cron/CI references this
script — but left honest rather than silently wrong in case it's ever run
manually.

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

# No confirmed, working, free bulk PSE symbol-list API is wired in — see the
# module doc for why these are now no-ops rather than real NSE endpoints.
NSE_BASE_URL = None
NSE_EQUITY_LIST_URL = None
NSE_SYMBOLS_CSV_URL = None

# Safe fallback: real PSE-listed tickers only (see src/services/universe/StockUniverse.ts)
FALLBACK_WATCHLIST = [
    "BDO", "JFC", "BPI", "SM", "MBT", "AC", "SECB",
    "TEL", "GTCAP", "JGS", "DMC", "AEV", "EMI",
    "WLCON", "MONDE", "RRHI", "PGOLD", "ACEN", "BLOOM",
    "MEG", "AP", "FGEN", "URC", "SMPH", "ALI",
    "ANI", "MWIDE", "CEB", "FLI", "IMI", "NIKL",
    "PXP", "SCC", "SSI", "TFHI", "VLL", "CHP",
    "MJC", "HCOR", "ATN", "DMP", "CLC", "WEB", "NCM",
]


class MarketWideScaler:
    """Orchestrates market-wide data ingestion across all PSE listed equities."""

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

    def fetch_active_nse_ticker_list(self) -> List[str]:
        """
        No confirmed, working, free bulk PSE symbol-list API is wired in (see
        module doc) — always falls through to FALLBACK_WATCHLIST rather than
        hitting a real (and wrong-country) endpoint.
        """
        print("\n⚠️  No verified PSE symbol-list source wired in. Using fallback list.")
        return FALLBACK_WATCHLIST

    def _try_nse_api_endpoint(self) -> Optional[List[str]]:
        return None

    def _try_nse_csv_endpoint(self) -> Optional[List[str]]:
        return None

    def _try_nse_indices_endpoint(self) -> Optional[List[str]]:
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
        description="Market-wide data scaler — syncs all PSE equities to Neon PostgreSQL."
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
        help="Comma-separated list of tickers to process (overrides PSE fetch)"
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
