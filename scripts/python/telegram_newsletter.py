"""
Telegram Breakout Newsletter Daemon
====================================
Scans 7,500+ NSE/BSE/SME equities for institutional entry patterns and
extreme mean-reversion zones, then broadcasts a professional technical
newsletter digest to your Telegram channel via the free Bot API.

No paid messaging service required.

Usage:
    python3 telegram_newsletter.py                    # Scan and broadcast
    python3 telegram_newsletter.py --dry-run          # Preview without sending
    python3 telegram_newsletter.py --limit 10         # Top 10 anomalies only
    python3 telegram_newsletter.py --min-pledge 5     # Filter: pledge > 5%

Environment:
    DATABASE_URL          — Neon PostgreSQL connection string (required)
    TELEGRAM_BOT_TOKEN    — Telegram Bot API token from @BotFather (required)
    TELEGRAM_CHAT_ID      — Channel ID or @channel_username (required)
"""

import argparse
import os
import sys
from datetime import datetime

import requests

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


DATABASE_URL = os.getenv("DATABASE_URL")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


class TelegramNewsletter:
    """Scans Neon PostgreSQL for breakout patterns and dispatches to Telegram."""

    def __init__(self, dry_run: bool = False, limit: int = 5, min_pledge: float = 0.0):
        self.dry_run = dry_run
        self.limit = limit
        self.min_pledge = min_pledge
        self.api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage" if TELEGRAM_BOT_TOKEN else ""

    def scan_breakthrough_stocks(self) -> list:
        """Query Neon PostgreSQL for stocks matching institutional breakout criteria."""
        print("\n🔍 Scanning universal market matrix for breakthrough setups...")

        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()

            # Query assets with clean governance, reasonable P/E, and recent volume activity
            cursor.execute("""
                WITH latest_candles AS (
                    SELECT DISTINCT ON (ticker)
                        ticker, close, volume, timestamp
                    FROM asset_historical_candles
                    ORDER BY ticker, timestamp DESC
                )
                SELECT 
                    r.ticker,
                    r.market_cap_cr,
                    r.pe_ratio,
                    r.debt_to_equity,
                    r.promoter_pledged_pct,
                    r.auditor_remarks,
                    c.close,
                    c.volume,
                    c.timestamp
                FROM asset_fundamental_ratios r
                JOIN latest_candles c ON r.ticker = c.ticker
                WHERE r.promoter_pledged_pct >= %s
                  AND r.pe_ratio > 0
                  AND r.pe_ratio < 40
                  AND c.close > 0
                  AND c.volume > 100000
                ORDER BY r.market_cap_cr DESC
                LIMIT %s;
            """, (self.min_pledge, self.limit))

            results = cursor.fetchall()
            cursor.close()
            return results

        finally:
            conn.close()

    def fetch_telegram_subscribers(self) -> list:
        """Fetch all users with Telegram alerts enabled from user_alert_preferences."""
        print("\n📋 Fetching Telegram subscribers...")

        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_id, telegram_chat_id, breakout_alerts, frequency
                FROM user_alert_preferences
                WHERE telegram_enabled = 1
                  AND telegram_chat_id IS NOT NULL
                  AND telegram_chat_id != ''
                  AND breakout_alerts = 1;
            """)
            subscribers = cursor.fetchall()
            cursor.close()
            print(f"   Found {len(subscribers)} Telegram subscribers")
            return subscribers
        finally:
            conn.close()

    def log_delivery(self, user_id: str, channel: str, ticker: str, status: str, error_message: str = ""):
        """Log alert delivery to the database for analytics."""
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alert_delivery_log (user_id, alert_type, channel, ticker, status, error_message, sent_at)
                VALUES (%s, 'breakout', %s, %s, %s, %s, %s);
            """, (user_id, channel, ticker, status, error_message or None, datetime.now().isoformat() if status == 'sent' else None))
            conn.commit()
            cursor.close()
        except Exception as e:
            print(f"   ⚠️  Failed to log delivery: {e}")
        finally:
            conn.close()

    def build_newsletter(self, stocks: list) -> str:
        """Construct a professional Markdown newsletter from scanned stocks."""
        current_date = datetime.now().strftime("%d %B %Y | %H:%M IST")

        header = (
            f"⚡ *EQUITY LENS BREAKTHROUGH INTELLIGENCE DISPATCH* ⚡\n"
            f"📅 *Timestamp:* `{current_date}`\n"
            f"🚨 *Target Scope:* Universal Indian Equities (NSE + BSE + SME)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        )

        body_parts = []
        for idx, stock in enumerate(stocks):
            ticker = stock["ticker"].replace(".NS", "").replace(".BO", "")
            board = "BSE/SME" if ".BO" in stock["ticker"] else "NSE"
            mcap = int(stock["market_cap_cr"]) if stock["market_cap_cr"] else 0
            pe = stock["pe_ratio"] or 0
            pledge = stock["promoter_pledged_pct"] or 0
            de = stock["debt_to_equity"] or 0
            remarks = stock["auditor_remarks"] or "Clean"
            price = stock["close"] or 0
            volume = stock["volume"] or 0

            # Determine signal strength based on criteria
            signals = []
            if pledge == 0:
                signals.append("0% Pledge")
            if pe < 20:
                signals.append(f"Low P/E ({pe:.1f})")
            if de < 0.5:
                signals.append(f"Low D/E ({de:.2f})")
            if volume > 500000:
                signals.append("High Volume")

            signal_text = " | ".join(signals[:3]) if signals else "Fundamental Screen Pass"

            body_parts.append(
                f"🔥 *{idx + 1}. {ticker} ({board})*\n"
                f"   💰 CMP: `₹{price:,.2f}` • M-Cap: `₹{mcap:,} Cr`\n"
                f"   📊 P/E: `{pe:.1f}` • D/E: `{de:.2f}` • Pledge: `{pledge:.1f}%`\n"
                f"   🧬 Governance: `{remarks}`\n"
                f"   🎯 Signals: {signal_text}\n"
                f"   🔗 [View Live](https://equitylens.in/stock/{ticker})\n"
                f"────────────────────────\n"
            )

        body = "\n".join(body_parts)

        footer = (
            f"\n🔒 *Want real-time push-notifications?* "
            f"Upgrade your profile to unlock automated scanning capabilities.\n"
            f"\n📡 _Equity Lens — Decentralized Market Intelligence Terminal_"
        )

        return header + body + footer

    def send_to_telegram(self, text: str) -> bool:
        """Dispatch the newsletter to Telegram via free Bot API."""
        if self.dry_run:
            print("\n📝 DRY RUN — Newsletter preview:")
            print("=" * 60)
            print(text)
            print("=" * 60)
            return True

        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }

        try:
            res = requests.post(self.api_url, json=payload, timeout=10)
            if res.status_code == 200:
                print("🚀 Newsletter broadcast sent successfully!")
                return True
            print(f"❌ Telegram API returned status {res.status_code}: {res.text[:200]}")
            return False
        except Exception as e:
            print(f"❌ Failed to send to Telegram: {e}")
            return False

    def run(self):
        """Execute the full scan → compile → broadcast pipeline."""
        print(f"\n{'='*60}")
        print(f"  TELEGRAM BREAKOUT NEWSLETTER DAEMON")
        print(f"  Mode: {'DRY RUN' if self.dry_run else 'LIVE BROADCAST'}")
        print(f"  Limit: {self.limit} stocks")
        print(f"  Min Pledge: {self.min_pledge}%")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        stocks = self.scan_breakthrough_stocks()

        if not stocks:
            print("\nℹ️ No breakthrough signals triggered. Market matrix stable.")
            return

        print(f"  Found {len(stocks)} breakthrough candidates")

        newsletter = self.build_newsletter(stocks)

        # Send to main channel
        success = self.send_to_telegram(newsletter)

        # Send to individual subscribers
        if not self.dry_run:
            subscribers = self.fetch_telegram_subscribers()
            sent_count = 0
            failed_count = 0

            for sub in subscribers:
                try:
                    # Send personalized message to each subscriber
                    payload = {
                        "chat_id": sub["telegram_chat_id"],
                        "text": newsletter,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": True,
                    }
                    res = requests.post(self.api_url, json=payload, timeout=10)
                    if res.status_code == 200:
                        sent_count += 1
                        self.log_delivery(sub["user_id"], "telegram", "BROADCAST", "sent")
                    else:
                        failed_count += 1
                        self.log_delivery(sub["user_id"], "telegram", "BROADCAST", "failed", f"API status {res.status_code}")
                except Exception as e:
                    failed_count += 1
                    self.log_delivery(sub["user_id"], "telegram", "BROADCAST", "failed", str(e))

            print(f"\n  Subscriber delivery: {sent_count} sent, {failed_count} failed")

        print(f"\n{'='*60}")
        print(f"  {'COMPLETE' if success else 'FAILED'}")
        print(f"  Stocks scanned: {len(stocks)}")
        print(f"  Broadcast: {'Sent' if self.dry_run else ('Delivered' if success else 'Failed')}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Telegram breakout newsletter — scans Postgres and broadcasts to Telegram."
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending to Telegram")
    parser.add_argument("--limit", type=int, default=5, help="Maximum stocks to include (default: 5)")
    parser.add_argument("--min-pledge", type=float, default=0.0, help="Minimum promoter pledge percentage filter")
    args = parser.parse_args()

    # Validate environment
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)
    if not TELEGRAM_BOT_TOKEN and not args.dry_run:
        print("ERROR: TELEGRAM_BOT_TOKEN environment variable is not set.")
        print("  Get one from https://t.me/BotFather")
        sys.exit(1)
    if not TELEGRAM_CHAT_ID and not args.dry_run:
        print("ERROR: TELEGRAM_CHAT_ID environment variable is not set.")
        print("  Use @your_channel or your chat ID")
        sys.exit(1)

    daemon = TelegramNewsletter(
        dry_run=args.dry_run,
        limit=args.limit,
        min_pledge=args.min_pledge,
    )
    daemon.run()
