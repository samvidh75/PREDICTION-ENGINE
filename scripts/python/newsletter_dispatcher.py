"""
Automated Newsletter Dispatcher
================================
Generates HTML/Markdown newsletters from breakout data and dispatches
to premium subscribers via Telegram and email based on user preferences.

Builds on the existing telegram_newsletter.py engine but adds:
  - HTML email templates with dark-mode styling
  - Per-user dispatch based on alert_preferences frequency setting
  - Delivery logging to alert_delivery_log table

Usage:
    python3 newsletter_dispatcher.py                           # Dispatch to all subscribers
    python3 newsletter_dispatcher.py --mode daily              # Daily digest mode
    python3 newsletter_dispatcher.py --mode weekly             # Weekly summary
    python3 newsletter_dispatcher.py --dry-run                 # Preview without sending

Environment:
    DATABASE_URL          — Neon PostgreSQL connection string (required)
    TELEGRAM_BOT_TOKEN    — Telegram Bot API token (optional, for Telegram dispatch)
    SMTP_HOST/SMTP_PORT   — SMTP server for email dispatch (optional)
    SMTP_USERNAME/SMTP_PASSWORD — SMTP credentials (optional)
    NEWSLETTER_FROM_EMAIL — Sender address for email newsletters
"""

import argparse
import os
import smtplib
import sys
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
NEWSLETTER_FROM_EMAIL = os.getenv("NEWSLETTER_FROM_EMAIL", "newsletter@stockex.com")

# ── HTML Template ─────────────────────────────────────────────────────

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace; color: #f4f4f5; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .header { border-bottom: 1px solid #1A1A1A; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 18px; font-weight: 900; color: #818cf8; margin: 0; text-transform: uppercase; }
  .header p { font-size: 11px; color: #64748b; margin: 4px 0 0 0; }
  .stock-card { background-color: #0D0D0D; border: 1px solid #1A1A1A; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .stock-card h3 { font-size: 14px; font-weight: bold; color: #ffffff; margin: 0 0 8px 0; }
  .stock-card .metric { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
  .metric-label { color: #64748b; }
  .green { color: #34d399; }
  .red { color: #f87171; }
  .white { color: #e4e4e7; }
  .footer { border-top: 1px solid #1A1A1A; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 10px; color: #64748b; }
  .badge { display: inline-block; background: #1A1A1A; padding: 2px 8px; border-radius: 4px; font-size: 9px; color: #818cf8; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>StockEX Breakout Dispatch</h1>
      <p>{date} | Institutional accumulation signals detected</p>
    </div>
    {body}
    <div class="footer">
      <p>StockEX — Decentralized Market Intelligence Terminal</p>
      <p>Past performance is not indicative of future results. Educational purposes only.</p>
      <p><span class="badge">Zero Data Costs</span></p>
    </div>
  </div>
</body>
</html>
"""

# ── Dispatcher ────────────────────────────────────────────────────────


class NewsletterDispatcher:
    """Generates and dispatches newsletters to premium subscribers."""

    def __init__(self, dry_run: bool = False, mode: str = "daily", limit: int = 10):
        self.dry_run = dry_run
        self.mode = mode
        self.limit = limit
        self.telegram_api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage" if TELEGRAM_BOT_TOKEN else ""

    # ── Data Fetching ────────────────────────────────────────────

    def fetch_breakout_candidates(self) -> list:
        """Query PostgreSQL for breakout stocks (same logic as telegram_newsletter.py)."""
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                WITH latest_candles AS (
                    SELECT DISTINCT ON (ticker)
                        ticker, close, volume, timestamp
                    FROM asset_historical_candles
                    ORDER BY ticker, timestamp DESC
                )
                SELECT
                    r.ticker, r.market_cap_cr, r.pe_ratio,
                    r.debt_to_equity, r.promoter_pledged_pct,
                    r.auditor_remarks, c.close, c.volume, c.timestamp
                FROM asset_fundamental_ratios r
                JOIN latest_candles c ON r.ticker = c.ticker
                WHERE r.pe_ratio > 0 AND r.pe_ratio < 40
                  AND c.close > 0 AND c.volume > 100000
                ORDER BY r.market_cap_cr DESC
                LIMIT %s;
            """, (self.limit,))
            results = cursor.fetchall()
            cursor.close()
            return results
        finally:
            conn.close()

    def fetch_subscribers(self) -> list:
        """Fetch premium subscribers with alert preferences."""
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()
            mode_filter = "real_time" if self.mode == "daily" else self.mode
            cursor.execute("""
                SELECT uap.user_id, uap.telegram_enabled, uap.telegram_chat_id,
                       uap.email_enabled, uap.email_address, uap.frequency,
                       uap.breakout_alerts, uap.volume_spike_alerts,
                       COALESCE(s.tier, 'free') as tier
                FROM user_alert_preferences uap
                LEFT JOIN user_subscriptions s
                  ON uap.user_id = s.user_id AND s.status IN ('active', 'trial')
                WHERE (uap.telegram_enabled = 1 OR uap.email_enabled = 1)
                  AND uap.breakout_alerts = 1
                  AND (uap.frequency = %s OR uap.frequency = 'real_time')
                  AND s.tier IN ('plus', 'pro');
            """, (mode_filter,))
            results = cursor.fetchall()
            cursor.close()
            return results
        finally:
            conn.close()

    # ── Content Generation ───────────────────────────────────────

    def build_markdown_body(self, stocks: list) -> str:
        """Build markdown newsletter body from breakout stocks."""
        lines = []
        for i, s in enumerate(stocks, 1):
            ticker = s["ticker"]
            close = float(s["close"] or 0)
            volume = int(s["volume"] or 0)
            pe = float(s["pe_ratio"] or 0)
            debt = float(s["debt_to_equity"] or 0)
            mcap = float(s["market_cap_cr"] or 0)
            pledge = float(s["promoter_pledged_pct"] or 0)

            lines.append(
                f"  {i}. *{ticker}* — ₹{close:,.2f}\n"
                f"     MCap: ₹{mcap:,.0f}Cr | P/E: {pe:.1f} | D/E: {debt:.2f}\n"
                f"     Vol: {volume:,} | Pledge: {pledge:.1f}%\n"
            )
        return "\n".join(lines)

    def build_html_body(self, stocks: list) -> str:
        """Build HTML newsletter body from breakout stocks."""
        cards = []
        for s in stocks:
            ticker = s["ticker"]
            close = float(s["close"] or 0)
            volume = int(s["volume"] or 0)
            pe = float(s["pe_ratio"] or 0)
            debt = float(s["debt_to_equity"] or 0)
            mcap = float(s["market_cap_cr"] or 0)
            pledge = float(s["promoter_pledged_pct"] or 0)

            cards.append(f"""
            <div class="stock-card">
              <h3>{ticker} <span class="badge">₹{close:,.2f}</span></h3>
              <div class="metric"><span class="metric-label">Market Cap</span><span class="white">₹{mcap:,.0f}Cr</span></div>
              <div class="metric"><span class="metric-label">P/E Ratio</span><span class="white">{pe:.1f}</span></div>
              <div class="metric"><span class="metric-label">Debt/Equity</span><span class="white">{debt:.2f}</span></div>
              <div class="metric"><span class="metric-label">Volume</span><span class="white">{volume:,}</span></div>
              <div class="metric"><span class="metric-label">Pledge</span><span class="white">{pledge:.1f}%</span></div>
            </div>
            """)

        return "\n".join(cards)

    def build_newsletter(self, stocks: list) -> dict:
        """Build both markdown and HTML versions of the newsletter."""
        current_date = datetime.now().strftime("%d %B %Y | %H:%M IST")
        mode_label = self.mode.upper()

        body_md = self.build_markdown_body(stocks)
        body_html = self.build_html_body(stocks)

        markdown = (
            f"📡 *StockEX {mode_label} BREAKOUT DISPATCH*\n"
            f"{current_date}\n\n"
            f"───\n\n"
            f"{body_md}\n"
            f"───\n\n"
            f"🔒 *Premium subscribers receive real-time push notifications.*\n"
            f"📡 _StockEX — Decentralized Market Intelligence Terminal_"
        )

        html = HTML_TEMPLATE.format(
            date=current_date,
            body=body_html,
        )

        return {"markdown": markdown, "html": html}

    # ── Dispatch ────────────────────────────────────────────────

    def send_telegram(self, chat_id: str, text: str) -> bool:
        """Send message via Telegram Bot API."""
        if not self.telegram_api:
            return False
        try:
            res = requests.post(self.telegram_api, json={
                "chat_id": chat_id, "text": text,
                "parse_mode": "Markdown", "disable_web_page_preview": True,
            }, timeout=10)
            return res.status_code == 200
        except Exception:
            return False

    def send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send email via SMTP."""
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = NEWSLETTER_FROM_EMAIL
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"   ⚠️  Email send failed: {e}")
            return False

    def log_delivery(self, user_id: str, channel: str, status: str, error: str = ""):
        """Log delivery attempt to alert_delivery_log table."""
        conn = psycopg2.connect(DATABASE_URL)
        try:
            cursor = conn.cursor()
            now = datetime.now().isoformat() if status == "sent" else None
            cursor.execute("""
                INSERT INTO alert_delivery_log
                    (user_id, alert_type, channel, ticker, status, error_message, sent_at)
                VALUES (%s, 'newsletter', %s, 'BROADCAST', %s, %s, %s);
            """, (user_id, channel, status, error or None, now))
            conn.commit()
            cursor.close()
        except Exception:
            pass
        finally:
            conn.close()

    # ── Run ─────────────────────────────────────────────────────

    def run(self):
        """Execute the full newsletter dispatch pipeline."""
        print(f"\n{'='*60}")
        print(f"  StockEX NEWSLETTER DISPATCHER")
        print(f"  Mode: {self.mode.upper()} {'(DRY RUN)' if self.dry_run else ''}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        # Fetch breakout data
        stocks = self.fetch_breakout_candidates()
        if not stocks:
            print("\nℹ️ No breakout signals. Skipping dispatch.")
            return

        print(f"\n📊 Found {len(stocks)} breakout candidates")
        newsletter = self.build_newsletter(stocks)

        # Dry run preview
        if self.dry_run:
            print("\n📝 DRY RUN — Preview:")
            print("─" * 40)
            print(newsletter["markdown"][:500] + "...")
            print("─" * 40)
            return

        # Fetch subscribers
        subscribers = self.fetch_subscribers()
        print(f"📋 Found {len(subscribers)} premium subscribers")

        telegram_sent = 0
        email_sent = 0
        telegram_failed = 0
        email_failed = 0

        for sub in subscribers:
            user_id = sub["user_id"]
            tier = sub["tier"]

            # Telegram dispatch
            if sub["telegram_enabled"] and sub["telegram_chat_id"]:
                ok = self.send_telegram(sub["telegram_chat_id"], newsletter["markdown"])
                if ok:
                    telegram_sent += 1
                    self.log_delivery(user_id, "telegram", "sent")
                else:
                    telegram_failed += 1
                    self.log_delivery(user_id, "telegram", "failed")

            # Email dispatch (plus/pro only)
            if sub["email_enabled"] and sub["email_address"] and tier in ("plus", "pro"):
                subject = f"StockEX {self.mode.upper()} — Breakout Dispatch ({datetime.now().strftime('%d %b')})"
                ok = self.send_email(sub["email_address"], subject, newsletter["html"])
                if ok:
                    email_sent += 1
                    self.log_delivery(user_id, "email", "sent")
                else:
                    email_failed += 1
                    self.log_delivery(user_id, "email", "failed")

        print(f"\n📬 Dispatch complete:")
        print(f"   Telegram: {telegram_sent} sent, {telegram_failed} failed")
        print(f"   Email: {email_sent} sent, {email_failed} failed")

        print(f"\n{'='*60}")
        print(f"  DISPATCH COMPLETE")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StockEX Newsletter Dispatcher")
    parser.add_argument("--mode", choices=["daily", "weekly"], default="daily",
                        help="Digest mode (daily or weekly)")
    parser.add_argument("--limit", type=int, default=10,
                        help="Max stocks to include")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without sending")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    dispatcher = NewsletterDispatcher(dry_run=args.dry_run, mode=args.mode, limit=args.limit)
    dispatcher.run()
