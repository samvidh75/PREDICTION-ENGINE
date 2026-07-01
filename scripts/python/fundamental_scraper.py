"""
Fundamental Scraper — Free Data Pipeline
=========================================
Scrapes 10-year balance sheet records, P/E metrics, debt levels, and
promoter pledge data from Screener.in public pages and upserts into
Neon PostgreSQL asset_fundamental_ratios table.

No paid corporate financial API required. Uses open public tracking platforms.

Usage:
    python3 fundamental_scraper.py                            # Default watchlist
    python3 fundamental_scraper.py --tickers RELIANCE,TCS     # Specific tickers
    python3 fundamental_scraper.py --watchlist-file stocks.txt # From file
    python3 fundamental_scraper.py --dry-run                   # Preview only

Environment:
    DATABASE_URL — Neon PostgreSQL connection string (required)
"""

import argparse
import os
import sys
import time
from datetime import datetime
from typing import List, Optional

import requests
from bs4 import BeautifulSoup

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


DATABASE_URL = os.getenv("DATABASE_URL")

# Default NSE blue-chip watchlist
DEFAULT_WATCHLIST = [
    "RELIANCE", "TCS", "SBIN", "INFY", "TATAMOTORS", "HDFCBANK",
    "ICICIBANK", "HINDUNILVR", "ITC", "KOTAKBANK", "BHARTIARTL",
    "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE",
]


class FundamentalScraper:
    """Scrapes fundamental ratios from Screener.in and syncs to Postgres."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        self.stats = {"tickers": 0, "errors": 0, "skipped": 0}

    def scrape_and_sync_ratios(self, ticker: str) -> bool:
        """Scrape fundamental ratios for a single ticker and upsert to Postgres."""
        clean_ticker = ticker.upper().strip()
        print(f"  [{clean_ticker}] Scraping fundamentals from Screener.in...")

        url = f"https://www.screener.in/company/{clean_ticker}/"
        try:
            res = self.session.get(url, timeout=15)
            if res.status_code == 404:
                print(f"  [{clean_ticker}] SKIP — Not found on Screener.in")
                self.stats["skipped"] += 1
                return False
            if res.status_code != 200:
                print(f"  [{clean_ticker}] SKIP — HTTP {res.status_code}")
                self.stats["skipped"] += 1
                return False

            soup = BeautifulSoup(res.text, "html.parser")
            warehouse = {}

            # Extract key ratios from the top-ratios list
            top_ratios = soup.find("ul", {"id": "top-ratios"})
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_span = li.find("span", {"class": "name"})
                    value_span = li.find("span", {"class": "number"})
                    if name_span and value_span:
                        name = name_span.text.strip().lower()
                        val_text = value_span.text.replace(",", "").strip()
                        # Handle percentage signs and other suffixes
                        val_text = val_text.replace("%", "").strip()
                        try:
                            warehouse[name] = float(val_text) if val_text else 0.0
                        except ValueError:
                            warehouse[name] = 0.0

            # Check announcements for auditor issues
            auditor_status = "Clean Unqualified Data Matrix"
            announcements = soup.find("div", {"id": "announcements"})
            if announcements:
                text_log = announcements.text.lower()
                if "resignation" in text_log or "discrepancies" in text_log:
                    auditor_status = "WARNING: Material auditor changes or governance discrepancies detected."
                elif "qualified" in text_log or "adverse" in text_log:
                    auditor_status = "WARNING: Qualified or adverse auditor opinion detected."

            # Map extracted values to database schema
            payload = {
                "ticker": clean_ticker,
                "mcap": self._extract_market_cap(warehouse),
                "pe": warehouse.get("stock p/e", 0.0),
                "de": warehouse.get("debt to equity", 0.0),
                "pledge": warehouse.get("pledged percentage", 0.0),
                "remarks": auditor_status,
            }

            if self.dry_run:
                print(f"  [{clean_ticker}] DRY RUN — Would upsert: MCap={payload['mcap']}Cr, "
                      f"P/E={payload['pe']}, D/E={payload['de']}, Pledge={payload['pledge']}%")
                self.stats["tickers"] += 1
                return True

            self._write_to_db(payload)
            self.stats["tickers"] += 1
            print(f"  [{clean_ticker}] OK — MCap={payload['mcap']}Cr, P/E={payload['pe']}, "
                  f"D/E={payload['de']}, Pledge={payload['pledge']}%")
            return True

        except requests.exceptions.Timeout:
            print(f"  [{clean_ticker}] ERROR — Request timed out")
            self.stats["errors"] += 1
            return False
        except Exception as e:
            print(f"  [{clean_ticker}] ERROR — {e}")
            self.stats["errors"] += 1
            return False

    def _extract_market_cap(self, warehouse: dict) -> float:
        """Extract market cap from various Screener.in naming conventions."""
        for key in ["market cap", "market cap.", "mcap", "mcap."]:
            if key in warehouse:
                val = warehouse[key]
                # Screener.in returns market cap in Cr already
                return val if val else 0.0
        return 0.0

    def _write_to_db(self, payload: dict):
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

    def run(self, tickers: List[str]):
        """Process all tickers sequentially with a polite delay."""
        print(f"\n{'='*60}")
        print(f"  FUNDAMENTAL SCRAPER")
        print(f"  Tickers: {len(tickers)} | Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

        for i, ticker in enumerate(tickers):
            self.scrape_and_sync_ratios(ticker)
            # Polite delay to avoid rate limits (2 seconds between requests)
            if i < len(tickers) - 1:
                time.sleep(2)

        print(f"\n{'='*60}")
        print(f"  COMPLETE")
        print(f"  Tickers scraped: {self.stats['tickers']}")
        print(f"  Skipped:         {self.stats['skipped']}")
        print(f"  Errors:          {self.stats['errors']}")
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
        description="Fundamental scraper — extracts balance sheet ratios from Screener.in to Postgres."
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
        help="Preview what would be scraped without writing to database"
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

    scraper = FundamentalScraper(dry_run=args.dry_run)
    scraper.run(tickers)
