"""
StockStory Multi-Channel Alert Gateway
========================================
Scans subscription database for premium users with registered mobile numbers,
formats breakout/insider-signal messages, and routes them via Twilio SMS or
WhatsApp based on each user's stored notification preference.

Usage:
    python notification_gateway.py                          # Mock test broadcast
    python notification_gateway.py --dry-run                # Preview without sending
    python notification_gateway.py --trigger SBIN 842.5     # Quick alert for a ticker

Environment:
    TWILIO_ACCOUNT_SID         — From Twilio console
    TWILIO_AUTH_TOKEN          — From Twilio console
    TWILIO_SMS_NUMBER          — Your provisioned SMS number (default: +1234567890)
    TWILIO_WHATSAPP_NUMBER     — Your WhatsApp sender (default: whatsapp:+14155238886)
    DB_PATH                    — SQLite database path (default: market_master.db)
"""

import json
import os
import sqlite3
import sys
import time
from datetime import datetime
from typing import Optional

import requests

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SMS_NUMBER = os.getenv("TWILIO_SMS_NUMBER", "+1234567890")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
DB_PATH = os.getenv("DB_PATH", "market_master.db")


def ensure_notification_schema():
    """Create billing tables and add phone/notification columns if missing."""
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
                notification_preference TEXT DEFAULT 'SMS',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
    else:
        for col in ["phone_number", "notification_preference"]:
            cursor.execute(
                f"SELECT COUNT(*) FROM pragma_table_info('customer_subscriptions') WHERE name='{col}'"
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    f"ALTER TABLE customer_subscriptions ADD COLUMN {col} TEXT"
                )

    conn.commit()
    conn.close()


ensure_notification_schema()

SIGNAL_TEMPLATES = {
    "volume_breakout": "Institutional Volume Breakout — Trade count > 3x 20-day average",
    "insider_accumulation": "Insider Accumulation Detected — Promoter/group buying via bulk window",
    "rsi_oversold": "RSI(14) below 25 — Extreme oversold territory",
    "rsi_overbought": "RSI(14) above 75 — Overbought with expanding volume",
    "delivery_spike": "Delivery volume spike > 70% — Institutional hands changing",
    "block_deal": "Block deal executed on NSE — Large institutional cross",
    "insider_selling": "Insider Selling — Promoter pledge increase or stake reduction",
}


class EquityLensNotificationGateway:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.sms_api_url = (
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        )
        self.auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        self._sent_count = 0
        self._failed_count = 0

    def broadcast_breakout_alert(
        self,
        ticker: str,
        trigger_condition: str,
        current_price: float,
        signal_type: str = "volume_breakout",
    ):
        print(f"Alert routing for {ticker}: {trigger_condition} @ ₹{current_price}")

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, phone_number, notification_preference "
            "FROM customer_subscriptions "
            "WHERE billing_status = 'ACTIVE' AND phone_number IS NOT NULL"
        )
        subscribers = cursor.fetchall()
        conn.close()

        if not subscribers:
            print("  No active premium subscribers with registered phone numbers.")
            return

        signal_label = SIGNAL_TEMPLATES.get(signal_type, trigger_condition)
        timestamp = datetime.now().strftime("%d-%b %H:%M")

        message_body = (
            f"StockStory Alert | {ticker}\n"
            f"Signal: {signal_label}\n"
            f"CMP: \u20b9{current_price}\n"
            f"Time: {timestamp}\n"
            f"View: https://stockstory.in/{ticker}"
        )

        for sub in subscribers:
            phone = sub["phone_number"]
            channel = (sub["notification_preference"] or "SMS").upper()

            if channel == "WHATSAPP":
                ok = self._send_whatsapp(phone, message_body)
            else:
                ok = self._send_sms(phone, message_body)

            if ok:
                self._sent_count += 1
            else:
                self._failed_count += 1

        print(f"  Sent: {self._sent_count}, Failed: {self._failed_count}")

    def _send_sms(self, phone: str, text: str) -> bool:
        if self.dry_run:
            print(f"  [DRY-RUN] SMS to {phone}: {text[:60]}...")
            return True

        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            print(f"  Twilio not configured — skipping SMS to {phone}")
            return False

        try:
            resp = requests.post(
                self.sms_api_url,
                data={"To": phone, "From": TWILIO_SMS_NUMBER, "Body": text},
                auth=self.auth,
                timeout=10,
            )
            if resp.status_code == 201:
                print(f"  SMS sent to {phone}")
                return True
            print(f"  SMS failed ({resp.status_code}): {resp.text[:100]}")
            return False
        except requests.RequestException as e:
            print(f"  SMS network error: {e}")
            return False

    def _send_whatsapp(self, phone: str, text: str) -> bool:
        if self.dry_run:
            print(f"  [DRY-RUN] WhatsApp to {phone}: {text[:60]}...")
            return True

        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            print(f"  Twilio not configured — skipping WhatsApp to {phone}")
            return False

        try:
            resp = requests.post(
                self.sms_api_url,
                data={
                    "To": f"whatsapp:{phone}",
                    "From": TWILIO_WHATSAPP_NUMBER,
                    "Body": text,
                },
                auth=self.auth,
                timeout=10,
            )
            if resp.status_code == 201:
                print(f"  WhatsApp sent to {phone}")
                return True
            print(f"  WhatsApp failed ({resp.status_code}): {resp.text[:100]}")
            return False
        except requests.RequestException as e:
            print(f"  WhatsApp network error: {e}")
            return False

    def update_subscriber_preferences(
        self, user_id: str, phone_number: str, preference: str = "SMS"
    ) -> bool:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO customer_subscriptions (user_id, phone_number, notification_preference, billing_status) "
            "VALUES (?, ?, ?, 'ACTIVE') "
            "ON CONFLICT(user_id) DO UPDATE SET "
            "phone_number = excluded.phone_number, "
            "notification_preference = excluded.notification_preference, "
            "updated_at = datetime('now')",
            (user_id, phone_number, preference.upper()),
        )
        conn.commit()
        conn.close()
        return True

    def get_subscriber(self, user_id: str) -> Optional[dict]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM customer_subscriptions WHERE user_id = ?", (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None


# ── Standalone CLI ─────────────────────────────────────────────

def evaluate_incoming_ticks(
    ticker: str,
    rsi_value: float,
    volume_ratio: float,
    current_price: float,
    delivery_pct: Optional[float] = None,
    notifier: Optional[EquityLensNotificationGateway] = None,
):
    """
    Plug this into any live price ingestion loop.
    Fires alerts when technical thresholds are breached.
    """
    if notifier is None:
        notifier = EquityLensNotificationGateway()

    if rsi_value > 75 and volume_ratio > 3.0:
        notifier.broadcast_breakout_alert(
            ticker, "RSI Overbought + Volume Spike", current_price, "rsi_overbought"
        )
    elif rsi_value < 25:
        notifier.broadcast_breakout_alert(
            ticker, "RSI Extreme Oversold", current_price, "rsi_oversold"
        )
    elif volume_ratio > 3.0 and delivery_pct and delivery_pct > 70:
        notifier.broadcast_breakout_alert(
            ticker, "High Delivery + Volume Breakout", current_price, "delivery_spike"
        )
    elif volume_ratio > 5.0:
        notifier.broadcast_breakout_alert(
            ticker, "Massive Volume Expansion", current_price, "volume_breakout"
        )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="StockStory Alert Gateway")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--trigger", nargs=2, metavar=("TICKER", "PRICE"),
                        help="Quick alert: ticker and current price")
    parser.add_argument("--signal", default="volume_breakout",
                        choices=list(SIGNAL_TEMPLATES.keys()),
                        help="Signal type for quick alert")
    parser.add_argument("--condition", default="Manual test trigger",
                        help="Trigger condition description")
    parser.add_argument("--register", nargs=3, metavar=("USER_ID", "PHONE", "CHANNEL"),
                        help="Register/update notification preferences")

    args = parser.parse_args()

    gateway = EquityLensNotificationGateway(dry_run=args.dry_run)

    if args.register:
        uid, phone, channel = args.register
        ok = gateway.update_subscriber_preferences(uid, phone, channel)
        print(f"Updated: {ok} — {uid} -> {phone} ({channel})")

    elif args.trigger:
        ticker, price_str = args.trigger
        price = float(price_str)
        gateway.broadcast_breakout_alert(ticker, args.condition, price, args.signal)
        print(f"Alert broadcast complete: {ticker} @ \u20b9{price}")

    else:
        print("StockStory Alert Gateway")
        print(f"  Twilio configured: {bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)}")
        print(f"  DB path: {DB_PATH}")
        print()
        print("Commands:")
        print("  --dry-run                    Preview broadcast")
        print("  --trigger TICKER PRICE       Send alert for a ticker")
        print("  --register UID PHONE CHANNEL Save user preferences")
        print()
        print("Example:")
        print("  python notification_gateway.py --dry-run --trigger SBIN 842.5 --signal volume_breakout")
