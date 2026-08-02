"""
StockStory Zero-Cost Notification & Report Delivery Engine
============================================================
Replaces paid Twilio SMS/WhatsApp with free Telegram bot alerts,
and paid SMTP relays with free Gmail App Password SMTP (500/day).

Dependencies: none beyond Python stdlib + requests.
"""

import os
import sqlite3
import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

import requests

GMAIL_USER = os.getenv("FREE_EMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("FREE_EMAIL_PASS")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

DB_PATH = os.getenv("DB_PATH", "market_master.db")
REPORTS_DIR = os.getenv("REPORTS_DIR", "/var/www/stockstory/reports")
DRY_RUN = os.getenv("DRY_RUN", "false").lower() in ("1", "true", "yes")


def ensure_schema():
    """Create customer_subscriptions with email column if missing."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='customer_subscriptions'"
    )
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            CREATE TABLE customer_subscriptions (
                user_id TEXT PRIMARY KEY,
                subscription_id TEXT,
                plan_id TEXT,
                billing_status TEXT,
                tier_clearance TEXT,
                expiry_timestamp INTEGER,
                phone_number TEXT,
                user_email TEXT,
                notification_preference TEXT DEFAULT 'SMS',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
    else:
        for col in ["user_email"]:
            cursor.execute(
                "SELECT COUNT(*) FROM pragma_table_info('customer_subscriptions') WHERE name=?",
                (col,),
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(f"ALTER TABLE customer_subscriptions ADD COLUMN {col} TEXT")
    conn.commit()
    conn.close()


ensure_schema()


class FreeEquityLensNotificationEngine:

    def send_free_whatsapp_alternative_alert(
        self, ticker: str, signal_desc: str, price: float
    ):
        """Dispatch real-time breakout signals to a private Telegram channel.
        Completely free, no rate limits — replaces paid SMS/WhatsApp APIs."""
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            print("  Telegram env vars not configured — skipping alert")
            return

        message = (
            f"StockStory Alert | {ticker}\n"
            f"Signal: {signal_desc}\n"
            f"CMP: \u20b9{price}\n"
            f"Time: {datetime.now().strftime('%d-%b %H:%M')}\n"
            f"View: https://stockstory.in/{ticker}"
        )

        if DRY_RUN:
            print(f"  [DRY-RUN] Telegram to {TELEGRAM_CHAT_ID}: {message[:60]}...")
            return

        telegram_url = (
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        )
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
        }

        try:
            res = requests.post(telegram_url, json=payload, timeout=10)
            if res.status_code == 200:
                print(f"  Telegram alert sent for {ticker}")
            else:
                print(f"  Telegram API error ({res.status_code}): {res.text[:100]}")
        except requests.RequestException as e:
            print(f"  Telegram network error: {e}")

    def log_email_delivery(self, user_id: str, email: str, subject: str,
                          status: str = "sent", error: Optional[str] = None):
        """Record an email delivery attempt in email_delivery_log."""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='email_delivery_log'"
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS email_delivery_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        recipient_email TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'sent',
                        sent_at TEXT NOT NULL DEFAULT (datetime('now')),
                        error TEXT
                    )
                """)
            cursor.execute(
                "INSERT INTO email_delivery_log (user_id, recipient_email, subject, status, error) "
                "VALUES (?, ?, ?, ?, ?)",
                (user_id, email, subject, status, error),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"  Failed to log email delivery: {e}")

    def dispatch_weekly_reports_to_subscribers(self):
        """Scan for the latest markdown report, email to all active premium users
        via free Gmail SMTP relay (App Password). ~500 emails/day limit."""
        if not GMAIL_USER or not GMAIL_APP_PASSWORD:
            print("  Gmail SMTP env vars not configured — skipping email dispatch")
            return

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, user_email FROM customer_subscriptions "
            "WHERE billing_status = 'ACTIVE' AND user_email IS NOT NULL"
        )
        subscribers = [(row["user_id"], row["user_email"]) for row in cursor.fetchall()]
        conn.close()

        if not subscribers:
            print("  No active premium subscribers with email addresses found")
            return

        try:
            all_reports = sorted(
                [
                    os.path.join(REPORTS_DIR, f)
                    for f in os.listdir(REPORTS_DIR)
                    if f.endswith(".md")
                ],
                key=os.path.getmtime,
            )
            if not all_reports:
                print("  No markdown reports found in REPORTS_DIR")
                return
            with open(all_reports[-1], "r", encoding="utf-8") as f:
                report_content = f.read()
        except Exception as e:
            print(f"  Failed to read reports: {e}")
            return

        subject = (
            f"Your Weekly Market Intelligence Digest - "
            f"{datetime.now().strftime('%d %B %Y')}"
        )

        if DRY_RUN:
            print(
                f"  [DRY-RUN] Would email {len(subscribers)} subscribers via {GMAIL_USER}"
            )
            return

        print(
            f"  Sending weekly digest to {len(subscribers)} subscribers..."
        )
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)

            for user_id, email in subscribers:
                msg = MIMEMultipart()
                msg["From"] = f"StockStory <{GMAIL_USER}>"
                msg["To"] = email
                msg["Subject"] = subject
                body_text = (
                    f"Hello Investor,\n\n"
                    f"Here is your weekly stock analysis report:\n\n"
                    f"{report_content}\n\n"
                    f"--\n"
                    f"StockStory India\n"
                    f"https://stockstory.in"
                )
                msg.attach(MIMEText(body_text, "plain"))
                try:
                    server.sendmail(GMAIL_USER, email, msg.as_string())
                    print(f"  ✓ Report emailed to {email}")
                    self.log_email_delivery(user_id, email, subject, "sent")
                except smtplib.SMTPRecipientsRefused as e:
                    print(f"  ✗ Recipient refused for {email}: {e}")
                    self.log_email_delivery(user_id, email, subject, "bounced", str(e))
                except smtplib.SMTPSenderRefused as e:
                    print(f"  ✗ Sender refused for {email}: {e}")
                    self.log_email_delivery(user_id, email, subject, "failed", str(e))

            server.quit()
            print("  Weekly digest broadcast complete")
        except smtplib.SMTPAuthenticationError:
            print(
                "  Gmail auth failed. Use an App Password "
                "(not your normal password).\n"
                "  1. Enable 2FA at https://myaccount.google.com/security\n"
                "  2. Generate App Password at https://myaccount.google.com/apppasswords\n"
                "  3. Set FREE_EMAIL_USER and FREE_EMAIL_PASS in .env"
            )
        except Exception as e:
            print(f"  SMTP error: {e}")

    def register_subscriber(
        self, user_id: str, email: str, phone: str = "", channel: str = "SMS"
    ) -> bool:
        """Register or update a subscriber's notification preferences."""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO customer_subscriptions "
            "(user_id, user_email, phone_number, notification_preference, billing_status) "
            "VALUES (?, ?, ?, ?, 'ACTIVE') "
            "ON CONFLICT(user_id) DO UPDATE SET "
            "user_email = excluded.user_email, "
            "phone_number = excluded.phone_number, "
            "notification_preference = excluded.notification_preference, "
            "updated_at = datetime('now')",
            (user_id, email, phone, channel.upper()),
        )
        conn.commit()
        conn.close()
        return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="StockStory Free Alert System")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--test-telegram", action="store_true", help="Send a test Telegram alert")
    parser.add_argument("--test-email", action="store_true", help="Test email dispatch")
    parser.add_argument("--register", nargs=3, metavar=("USER_ID", "EMAIL", "PHONE"),
                        help="Register a subscriber")

    args = parser.parse_args()

    if args.dry_run:
        DRY_RUN = True

    engine = FreeEquityLensNotificationEngine()

    if args.register:
        uid, email, phone = args.register
        engine.register_subscriber(uid, email, phone)
        print(f"Registered {uid} -> {email} / {phone}")

    if args.test_telegram:
        engine.send_free_whatsapp_alternative_alert(
            ticker="TCS",
            signal_desc="Institutional Accumulation — Multi-Year Breakout",
            price=4120.50,
        )

    if args.test_email:
        engine.dispatch_weekly_reports_to_subscribers()

    if not any(vars(args).values()):
        print("StockStory Free Alert System")
        print(f"  Gmail configured:   {bool(GMAIL_USER and GMAIL_APP_PASSWORD)}")
        print(f"  Telegram configured: {bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)}")
        print(f"  DB: {DB_PATH}")
        print()
        print("Usage:")
        print("  --dry-run                  Preview without sending")
        print("  --test-telegram            Test Telegram alert")
        print("  --test-email               Test email dispatch")
        print("  --register UID EMAIL PHONE Register subscriber")
        print()
        print("Example:")
        print("  python free_alert_system.py --dry-run --test-telegram")
