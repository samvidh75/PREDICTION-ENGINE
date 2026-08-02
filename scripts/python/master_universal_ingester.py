"""
Master Universal Ingester — NSE + BSE + SME All Markets
========================================================
Downloads the official company master indices from NSE (Mainboard + Emerge/SME)
and BSE (Mainboard + SME) public registries, then syncs 20-year daily OHLCV
and fundamental ratios into Neon PostgreSQL for free.

No broker API key required. Uses unrestricted public exchange endpoints.

Usage:
    python3 master_universal_ingester.py                    # Full market sync
    python3 master_universal_ingester.py --dry-run          # Preview symbols only
    python3 master_universal_ingester.py --limit 50         # Process first 50 only
    python3 master_universal_ingester.py --skip-history     # Only fundamentals
    python3 master_universal_ingester.py --skip-fundamentals # Only history
    python3 master_universal_ingester.py --markets nse      # NSE only
    python3 master_universal_ingester.py --markets bse      # BSE only

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
from typing import List, Optional, Set

import requests

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not installed. Run: pip install pandas")
    sys.exit(1)


DATABASE_URL = os.getenv("DATABASE_URL")

# ── NSE India Endpoints ─────────────────────────────────────────────────────
NSE_BASE_URL = "https://www.nseindia.com"
NSE_EQUITY_CSV_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
NSE_SME_CSV_URL = "https://nsearchives.nseindia.com/content/equities/SME_EQUITY_L.csv"

# ── BSE India Endpoints ─────────────────────────────────────────────────────
BSE_BASE_URL = "https://www.bseindia.com"
BSE_STOCK_URL = "https://api.bseindia.com/BseIndiaAPI/api/GetStkLstDt/w"

# ── Yahoo Finance (for both .NS and .BO tickers) ────────────────────────────
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"

# Safe fallback: NIFTY 50 + NEXT 50 (100 most liquid stocks)
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
    "DMART", "DABUR", "COLPAL", "MARICO", "BERGEPAINT", "TRENT",
    "ZOMATO", "PAYTM", "POLICYBZR", "NYKAA", "SONACOMS", "ALKYLAMINE",
]


class MasterUniversalIngester:
    """Orchestrates market-wide data ingestion across all NSE and BSE equities."""

    def __init__(
        self,
        dry_run: bool = False,
        skip_history: bool = False,
        skip_fundamentals: bool = False,
        chunk_size: int = 50,
        markets: str = "all",
    ):
        self.dry_run = dry_run
        self.skip_history = skip_history
        self.skip_fundamentals = skip_fundamentals
        self.chunk_size = chunk_size
        self.markets = markets  # "all", "nse", "bse"
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        self.stats = {
            "total": 0, "nse_count": 0, "bse_count": 0,
            "history_ok": 0, "history_err": 0,
            "fund_ok": 0, "fund_err": 0, "skipped": 0,
        }

    def _initialize_nse_session(self) -> bool:
        """NSE India requires visiting the main page first to obtain session cookies."""
        try:
            resp = self.session.get(NSE_BASE_URL, timeout=15)
            return resp.status_code == 200
        except Exception:
            return False

    def fetch_nse_symbols(self) -> Set[str]:
        """Fetch all active NSE Mainboard + SME (Emerge) equity symbols."""
        symbols: Set[str] = set()

        # 1. NSE Mainboard
        try:
            self._initialize_nse_session()
            resp = self.session.get(NSE_EQUITY_CSV_URL, timeout=15)
            if resp.status_code == 200:
                content = resp.content.decode("utf-8", errors="replace")
                reader = csv.DictReader(io.StringIO(content))
                for row in reader:
                    sym = row.get("SYMBOL", "").strip()
                    if sym and len(sym) <= 20:
                        symbols.add(sym)
                print(f"  NSE Mainboard: {len(symbols)} symbols")
        except Exception as e:
            print(f"  ⚠️ NSE Mainboard fetch failed: {e}")

        # 2. NSE SME (Emerge)
        try:
            self._initialize_nse_session()
            resp = self.session.get(NSE_SME_CSV_URL, timeout=15)
            if resp.status_code == 200:
                content = resp.content.decode("utf-8", errors="replace")
                reader = csv.DictReader(io.StringIO(content))
                sme_count = 0
                for row in reader:
                    sym = row.get("SYMBOL", "").strip()
                    if sym and len(sym) <= 20:
                        symbols.add(sym)
                        sme_count += 1
                print(f"  NSE SME (Emerge): {sme_count} symbols")
        except Exception as e:
            print(f"  ⚠️ NSE SME fetch failed: {e}")

        return symbols

    def fetch_bse_symbols(self) -> Set[str]:
        """Fetch all active BSE Mainboard + SME equity symbols."""
        symbols: Set[str] = set()

        try:
            # BSE public API for equity list
            resp = self.session.get(
                BSE_STOCK_URL,
                headers={"Accept": "application/json"},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("Table", []):
                    sc_code = str(item.get("SC_CODE", "")).strip()
                    sc_name = str(item.get("SC_NAME", "")).strip()
                    # BSE uses numeric codes; we store as-is for Yahoo .BO lookup
                    if sc_code and len(sc_code) == 6:
                        symbols.add(sc_code)
                print(f"  BSE: {len(symbols)} symbols")
        except Exception as e:
            print(f"  ⚠️ BSE fetch failed: {e}")

        return symbols

    def fetch_all_market_symbols(self) -> List[str]:
        """
        Combines NSE and BSE symbols into a unified, deduplicated list.
        Returns clean symbol strings for Yahoo Finance lookup.
        """
        print("\n⏳ Compiling universal market symbol registry...")
        all_symbols: Set[str] = set()
        nse_symbols: Set[str] = set()
        bse_symbols: Set[str] = set()

        if self.markets in ("all", "nse"):
            nse_symbols = self.fetch_nse_symbols()
            all_symbols.update(nse_symbols)
            self.stats["nse_count"] = len(nse_symbols)

        if self.markets in ("all", "bse"):
            bse_symbols = self.fetch_bse_symbols()
            all_symbols.update(bse_symbols)
            self.stats["bse_count"] = len(bse_symbols)

        if not all_symbols:
            print("⚠️  All exchange endpoints failed. Using safe fallback list.")
            all_symbols = set(FALLBACK_WATCHLIST)

        result = sorted(all_symbols)
        print(f"✅ Total unique symbols: {len(result)} "
              f"(NSE: {self.stats['nse_count']}, BSE: {self.stats['bse_count']})")
        return result

    def download_and_sync_history(self, ticker: str, exchange_suffix: str = "NS") -> bool:
        """Download max historical daily OHLCV from Yahoo Finance and upsert to Postgres."""
        yahoo_ticker = f"{ticker}.{exchange_suffix}"
        url = f"{YAHOO_CHART_URL}{yahoo_ticker}?interval=1d&range=max"

        try:
            resp = self.session.get(url, timeout=15)
            if resp.status_code != 200:
                return False

            data = resp.json()
            chart_result = data.get("chart", {}).get("result")
            if not chart_result:
                return False

            result = chart_result[0]
            timestamps = result.get("timestamp", [])
            indicators = result.get("indicators", {}).get("quote", [{}])[0]

            if not timestamps:
                return False

            batch = []
            for i in range(len(timestamps)):
                open_px = indicators.get("open", [None] * len(timestamps))[i]
                high_px = indicators.get("high", [None] * len(timestamps))[i]
                low_px = indicators.get("low", [None] * len(timestamps))[i]
                close_px = indicators.get("close", [None] * len(timestamps))[i]
                volume = indicators.get("volume", [0] * len(timestamps))[i]

                if None in (open_px, high_px, low_px, close_px):
                    continue

                batch.append((
                    ticker, int(timestamps[i]),
                    float(open_px), float(high_px), float(low_px), float(close_px),
                    int(volume or 0),
                ))

            if not batch:
                return False

            if self.dry_run:
                return True

            self._upsert_candles(batch)
            return True

        except Exception:
            return False

    def _upsert_candles(self, records: list):
        """Batch upsert candle records into Neon PostgreSQL."""
        conn = psycopg2.connect(DATABASE_URL)
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO asset_historical_candles
                    (ticker, timestamp, open, high, low, close, volume)
                VALUES %s
                ON CONFLICT (ticker, timestamp) DO UPDATE SET
                    open = EXCLUDED.open, high = EXCLUDED.high,
                    low = EXCLUDED.low, close = EXCLUDED.close,
                    volume = EXCLUDED.volume
            """
            execute_values(cursor, query, records, page_size=500)
            conn.commit()
            cursor.close()
        finally:
            conn.close()

    def scrape_and_sync_fundamentals(self, ticker: str) -> bool:
        """Scrape fundamental ratios from Screener.in and upsert to Postgres."""
        from bs4 import BeautifulSoup

        url = f"https://www.screener.in/company/{ticker}/"
        try:
            resp = self.session.get(url, timeout=15)
            if resp.status_code != 200:
                return False

            soup = BeautifulSoup(resp.text, "html.parser")
            warehouse = {}

            top_ratios = soup.find("ul", {"id": "top-ratios"})
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_span = li.find("span", {"class": "name"})
                    value_span = li.find("span", {"class": "number"})
                    if name_span and value_span:
                        name = name_span.text.strip().lower()
                        val_text = value_span.text.replace(",", "").replace("%", "").strip()
                        try:
                            warehouse[name] = float(val_text) if val_text else 0.0
                        except ValueError:
                            warehouse[name] = 0.0

            auditor_status = "Clean Unqualified Data Matrix"
            announcements = soup.find("div", {"id": "announcements"})
            if announcements:
                text_log = announcements.text.lower()
                if "resignation" in text_log or "discrepancies" in text_log:
                    auditor_status = "WARNING: Material auditor changes or governance discrepancies detected."

            payload = {
                "ticker": ticker,
                "mcap": warehouse.get("market cap", 0.0),
                "pe": warehouse.get("stock p/e", 0.0),
                "de": warehouse.get("debt to equity", 0.0),
                "pledge": warehouse.get("pledged percentage", 0.0),
                "remarks": auditor_status,
            }

            if self.dry_run:
                return True

            self._upsert_fundamentals(payload)
            return True

        except Exception:
            return False

    def _upsert_fundamentals(self, payload: dict):
        """Upsert fundamental ratios into Neon PostgreSQL."""
        conn = psycopg2.connect(DATABASE_URL)
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO asset_fundamental_ratios
                    (ticker, market_cap_cr, pe_ratio, debt_to_equity,
                     promoter_pledged_pct, auditor_remarks, last_updated)
                VALUES (%(ticker)s, %(mcap)s, %(pe)s, %(de)s,
                        %(pledge)s, %(remarks)s, NOW())
                ON CONFLICT (ticker) DO UPDATE SET
                    market_cap_cr = EXCLUDED.market_cap_cr,
                    pe_ratio = EXCLUDED.pe_ratio,
                    debt_to_equity = EXCLUDED.debt_to_equity,
                    promoter_pledged_pct = EXCLUDED.promoter_pledged_pct,
                    auditor_remarks = EXCLUDED.auditor_remarks,
                    last_updated = NOW()
            """
            cursor.execute(query, payload)
            conn.commit()
            cursor.close()
        finally:
            conn.close()

    def run(
        self,
        tickers: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ):
        """Process all tickers through both ingestion engines."""
        if tickers is None:
            tickers = self.fetch_all_market_symbols()

        if limit:
            tickers = tickers[:limit]

        self.stats["total"] = len(tickers)

        mode = "DRY RUN" if self.dry_run else "LIVE"
        hist = "SKIP" if self.skip_history else "ON"
        fund = "SKIP" if self.skip_fundamentals else "ON"

        print(f"\n{'='*70}")
        print(f"  MASTER UNIVERSAL INGESTER — NSE + BSE + SME")
        print(f"  Mode:         {mode}")
        print(f"  History:      {hist}")
        print(f"  Fundamentals: {fund}")
        print(f"  Markets:      {self.markets.upper()}")
        print(f"  Tickers:      {len(tickers)}")
        print(f"  Started:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")

        for index, symbol in enumerate(tickers):
            progress = f"[{index + 1}/{len(tickers)}]"

            # Determine exchange suffix: NSE = .NS, BSE codes = .BO
            is_bse_code = symbol.isdigit() and len(symbol) == 6
            exchange_suffix = "BO" if is_bse_code else "NS"

            print(f"{progress} {symbol} (.{'BO' if is_bse_code else 'NS'})")

            # 1. Historical candles
            if not self.skip_history:
                try:
                    ok = self.download_and_sync_history(symbol, exchange_suffix)
                    if ok:
                        self.stats["history_ok"] += 1
                    else:
                        self.stats["history_err"] += 1
                except Exception as e:
                    print(f"  {symbol} history error: {e}")
                    self.stats["history_err"] += 1
                time.sleep(1.5)

            # 2. Fundamentals (only for NSE symbols — Screener.in uses NSE tickers)
            if not self.skip_fundamentals and not is_bse_code:
                try:
                    ok = self.scrape_and_sync_fundamentals(symbol)
                    if ok:
                        self.stats["fund_ok"] += 1
                    else:
                        self.stats["fund_err"] += 1
                except Exception as e:
                    print(f"  {symbol} fundamental error: {e}")
                    self.stats["fund_err"] += 1
                time.sleep(1.5)

            # Periodic checkpoint
            if (index + 1) % self.chunk_size == 0:
                elapsed_pct = ((index + 1) / len(tickers)) * 100
                print(f"\n  📦 Checkpoint: {index + 1}/{len(tickers)} "
                      f"({elapsed_pct:.1f}%) — pausing 5s...\n")
                if not self.dry_run:
                    time.sleep(5)

        self._print_summary()

    def _print_summary(self):
        print(f"\n{'='*70}")
        print(f"  MARKET-WIDE SYNC COMPLETE")
        print(f"  Total tickers:     {self.stats['total']}")
        print(f"  NSE symbols:       {self.stats['nse_count']}")
        print(f"  BSE symbols:       {self.stats['bse_count']}")
        print(f"  History OK:        {self.stats['history_ok']}")
        print(f"  History errors:    {self.stats['history_err']}")
        print(f"  Fundamentals OK:   {self.stats['fund_ok']}")
        print(f"  Fund errors:       {self.stats['fund_err']}")
        print(f"  Completed:         {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Master universal ingester — syncs all NSE + BSE + SME equities to Postgres."
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview without DB writes")
    parser.add_argument("--limit", type=int, default=None, help="Process only first N symbols")
    parser.add_argument("--chunk-size", type=int, default=50, help="Checkpoint interval (default: 50)")
    parser.add_argument("--skip-history", action="store_true", help="Skip historical candle ingestion")
    parser.add_argument("--skip-fundamentals", action="store_true", help="Skip fundamental scraping")
    parser.add_argument("--markets", choices=["all", "nse", "bse"], default="all",
                        help="Which exchanges to process (default: all)")
    parser.add_argument("--tickers", type=str, default=None, help="Comma-separated tickers to process")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("  export DATABASE_URL='postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require'")
        sys.exit(1)

    tickers = None
    if args.tickers:
        tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]

    ingester = MasterUniversalIngester(
        dry_run=args.dry_run,
        skip_history=args.skip_history,
        skip_fundamentals=args.skip_fundamentals,
        chunk_size=args.chunk_size,
        markets=args.markets,
    )

    ingester.run(tickers=tickers, limit=args.limit)
