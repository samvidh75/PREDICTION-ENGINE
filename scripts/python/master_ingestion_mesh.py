"""
Master Ingestion Mesh — Unified Multi-Source Data Pipeline
============================================================
Combines Screener.in fundamentals + Yahoo Finance OHLCV into a single
batched upsert cycle. Runs via cron with 1.2s politeness delays.

Usage:
    python3 master_ingestion_mesh.py                              # Default F&O stocks
    python3 master_ingestion_mesh.py --tickers RELIANCE,TCS,SBIN  # Specific tickers
    python3 master_ingestion_mesh.py --limit 100                  # First 100 F&O stocks
    python3 master_ingestion_mesh.py --dry-run                    # Preview without writing

Environment:
    DATABASE_URL  — Neon PostgreSQL connection string (required)
"""

import argparse
import os
import sys
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

try:
    import psycopg2
    from psycopg2.extras import execute_values, RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL")

# Core F&O stocks + major indices
DEFAULT_TICKERS = [
    "RELIANCE", "TCS", "SBIN", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL",
    "ITC", "LT", "KOTAKBANK", "AXISBANK", "BAJFINANCE", "MARUTI", "HCLTECH",
    "SUNPHARMA", "TITAN", "ASIANPAINT", "WIPRO", "NTPC", "POWERGRID",
    "ULTRACEMCO", "HINDUNILVR", "BAJAJFINSV", "TATASTEEL", "JSWSTEEL",
    "TATAMOTORS", "M&M", "TECHM", "INDUSINDBK", "NESTLEIND",
]


class MasterIngestionMesh:
    """Unified multi-source data ingestion pipeline."""

    def __init__(self, dry_run: bool = False, delay: float = 1.2):
        self.dry_run = dry_run
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        })

    # ── Screener.in Fundamentals ───────────────────────────────

    def scrape_fundamentals(self, ticker: str) -> dict:
        """Extract fundamentals from Screener.in's free public pages."""
        clean = ticker.upper().strip().split(".")[0]
        url = f"https://www.screener.in/company/{clean}/"

        try:
            # Screener.in requires a proper session cookie
            self.session.get("https://www.screener.in", timeout=8)
            res = self.session.get(url, timeout=10)

            if res.status_code != 200:
                return {}

            soup = BeautifulSoup(res.text, "html.parser")
            ratios = {}

            # Top ratios bar: market cap, P/E, D/E, pledged %
            top_ratios = soup.find("ul", {"id": "top-ratios"})
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_el = li.find("span", {"class": "name"})
                    val_el = li.find("span", {"class": "number"})
                    if name_el and val_el:
                        key = name_el.text.strip().lower()
                        raw = val_el.text.replace(",", "").strip()
                        try:
                            ratios[key] = float(raw) if raw else 0.0
                        except ValueError:
                            ratios[key] = 0.0

            # Auditor remarks — check announcements for red flags
            auditor = "Clean Unqualified Data Matrix"
            announcements = soup.find("div", {"id": "announcements"})
            if announcements:
                text = announcements.text.lower()
                if "resignation" in text or "discrepancies" in text or "adverse" in text:
                    auditor = "WARNING: Material auditor changes or governance discrepancies detected."

            return {
                "mcap_cr": ratios.get("market cap", 0.0),
                "pe": ratios.get("stock p/e", 0.0),
                "de": ratios.get("debt to equity", 0.0),
                "pledge": ratios.get("pledged percentage", 0.0),
                "remarks": auditor,
            }
        except Exception:
            return {}

    # ── Yahoo Finance OHLCV ─────────────────────────────────────

    def fetch_ohlcv(self, ticker: str) -> list:
        """Download daily OHLCV history from Yahoo Finance (free, no auth)."""
        clean = ticker.upper().strip().split(".")[0]
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/"
            f"{clean}.NS?interval=1d&range=max"
        )

        try:
            res = requests.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
            )
            if res.status_code != 200:
                return []

            data = res.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            timestamps = result.get("timestamp", [])
            quotes = result.get("indicators", {}).get("quote", [{}])[0]

            batch = []
            for i in range(len(timestamps)):
                o = quotes.get("open", [None])[i]
                h = quotes.get("high", [None])[i]
                l = quotes.get("low", [None])[i]
                c = quotes.get("close", [None])[i]
                v = quotes.get("volume", [None])[i]
                if None in (o, h, l, c):
                    continue
                batch.append((
                    clean,
                    int(timestamps[i]),
                    float(o), float(h), float(l), float(c),
                    int(v or 0),
                ))
            return batch
        except Exception:
            return []

    # ── Database Writes ─────────────────────────────────────────

    def sync_candles(self, cursor, ticker: str, candles: list):
        """Bulk upsert historical candles."""
        if self.dry_run:
            print(f"     [dry-run] Would insert {len(candles)} candle records")
            return
        query = """
            INSERT INTO asset_historical_candles
                (ticker, timestamp, open, high, low, close, volume)
            VALUES %s
            ON CONFLICT (ticker, timestamp) DO NOTHING
        """
        execute_values(cursor, query, candles)

    def sync_fundamentals(self, cursor, ticker: str, fundamentals: dict):
        """Upsert fundamental ratios."""
        if self.dry_run:
            print(f"     [dry-run] Would update fundamentals for {ticker}")
            return
        cursor.execute("""
            INSERT INTO asset_fundamental_ratios
                (ticker, market_cap_cr, pe_ratio, debt_to_equity,
                 promoter_pledged_pct, auditor_remarks, last_updated)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (ticker) DO UPDATE SET
                market_cap_cr = EXCLUDED.market_cap_cr,
                pe_ratio = EXCLUDED.pe_ratio,
                debt_to_equity = EXCLUDED.debt_to_equity,
                promoter_pledged_pct = EXCLUDED.promoter_pledged_pct,
                auditor_remarks = EXCLUDED.auditor_remarks,
                last_updated = NOW()
        """, (
            ticker,
            fundamentals.get("mcap_cr", 0),
            fundamentals.get("pe", 0),
            fundamentals.get("de", 0),
            fundamentals.get("pledge", 0),
            fundamentals.get("remarks", ""),
        ))

    # ── Pipeline ────────────────────────────────────────────────

    def execute_unified_sync(self, tickers: list):
        """Run the full multi-source ingestion cycle."""
        print(f"\n{'='*60}")
        print(f"  MASTER INGESTION MESH")
        print(f"  Tickers: {len(tickers)}")
        print(f"  Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        for idx, ticker in enumerate(tickers):
            print(f"\n  [{idx + 1}/{len(tickers)}] {ticker}")

            # 1. Historical candles
            print(f"     Fetching OHLCV...")
            candles = self.fetch_ohlcv(ticker)
            if candles:
                self.sync_candles(cursor, ticker, candles)
                print(f"     -> {len(candles)} candle records")
            else:
                print(f"     -> No candle data")

            # 2. Fundamentals
            print(f"     Fetching fundamentals...")
            fundamentals = self.scrape_fundamentals(ticker)
            if fundamentals:
                self.sync_fundamentals(cursor, ticker, fundamentals)
                print(f"     -> P/E: {fundamentals.get('pe', 'N/A')}, D/E: {fundamentals.get('de', 'N/A')}")
            else:
                print(f"     -> No fundamental data")

            conn.commit()

            if idx < len(tickers) - 1:
                print(f"     Waiting {self.delay}s...")
                time.sleep(self.delay)

        cursor.close()
        conn.close()

        print(f"\n{'='*60}")
        print(f"  SYNC COMPLETE")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StockEX Master Ingestion Mesh")
    parser.add_argument("--tickers", type=str, help="Comma-separated ticker list")
    parser.add_argument("--limit", type=int, default=5, help="Max tickers (with default list)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without DB writes")
    parser.add_argument("--delay", type=float, default=1.2, help="Seconds between tickers")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    if args.tickers:
        targets = [t.strip().upper() for t in args.tickers.split(",")]
    else:
        targets = DEFAULT_TICKERS[:args.limit]

    mesh = MasterIngestionMesh(dry_run=args.dry_run, delay=args.delay)
    mesh.execute_unified_sync(targets)
