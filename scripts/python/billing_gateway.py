"""
StockStory Razorpay Billing Gateway — Python Microservice
===========================================================
Standalone FastAPI-compatible billing router that handles Razorpay
webhook verification, subscription lifecycle management, and user
premium access token lookups.

Can run as:
  1. Standalone microservice: python billing_gateway.py
  2. Imported module: from billing_gateway import verify_user_access_token

Environment:
    RAZORPAY_WEBHOOK_SECRET  — Shared secret from Razorpay dashboard
    DB_PATH                  — Path to SQLite database (default: market_master.db)
"""

import hashlib
import hmac
import json
import os
import sqlite3
import time
from datetime import datetime
from typing import Optional

RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "equity_lens_webhook_secret_key")
DB_PATH = os.getenv("DB_PATH", "market_master.db")


def initialize_billing_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_subscriptions (
            user_id TEXT PRIMARY KEY,
            subscription_id TEXT,
            plan_id TEXT,
            billing_status TEXT,
            tier_clearance TEXT,
            expiry_timestamp INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS billing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            user_id TEXT,
            subscription_id TEXT,
            payload TEXT,
            received_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


initialize_billing_schema()


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    computed = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def process_webhook_event(event_payload: dict) -> dict:
    event_type = event_payload.get("event", "")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    conn.execute(
        "INSERT INTO billing_events (event_type, subscription_id, payload) VALUES (?, ?, ?)",
        (event_type,
         event_payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("id", ""),
         json.dumps(event_payload)),
    )

    result = {"status": "ignored", "event": event_type}

    if event_type in ("subscription.charged", "subscription.activated"):
        entity = event_payload["payload"]["subscription"]["entity"]
        user_id = entity.get("notes", {}).get("user_id", "anonymous_investor")

        cursor.execute("""
            INSERT OR REPLACE INTO customer_subscriptions
            (user_id, subscription_id, plan_id, billing_status, tier_clearance, expiry_timestamp, updated_at)
            VALUES (?, ?, ?, 'ACTIVE', 'PREMIUM', ?, datetime('now'))
        """, (
            user_id,
            entity["id"],
            entity.get("plan_id", "plan_pro_299"),
            int(entity.get("current_end", time.time() + 2592000)),
        ))
        print(f"Subscription activated for user: {user_id}")
        result = {"status": "activated", "user_id": user_id}

    elif event_type in ("subscription.cancelled", "subscription.completed"):
        entity = event_payload["payload"]["subscription"]["entity"]
        user_id = entity.get("notes", {}).get("user_id", "anonymous_investor")

        cursor.execute("""
            UPDATE customer_subscriptions
            SET billing_status = 'EXPIRED', tier_clearance = 'FREE', updated_at = datetime('now')
            WHERE user_id = ?
        """, (user_id,))
        print(f"Subscription expired for user: {user_id}")
        result = {"status": "expired", "user_id": user_id}

    elif event_type == "payment.failed":
        entity = event_payload["payload"].get("payment", {}).get("entity", {})
        user_id = entity.get("notes", {}).get("user_id", "anonymous_investor")
        cursor.execute("""
            UPDATE customer_subscriptions
            SET billing_status = 'PAST_DUE', updated_at = datetime('now')
            WHERE user_id = ?
        """, (user_id,))
        print(f"Payment failed for user: {user_id}")
        result = {"status": "payment_failed", "user_id": user_id}

    conn.commit()
    conn.close()
    return result


def verify_user_access_token(user_id: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customer_subscriptions WHERE user_id = ?", (user_id,))
    record = cursor.fetchone()
    conn.close()

    current_ts = int(time.time())

    if not record:
        return {"has_premium_access": False, "tier": "FREE", "reason": "no_subscription"}

    if record["billing_status"] != "ACTIVE":
        return {"has_premium_access": False, "tier": "FREE", "reason": f"status_{record['billing_status']}"}

    if current_ts > record["expiry_timestamp"]:
        return {"has_premium_access": False, "tier": "FREE", "reason": "expired"}

    return {
        "has_premium_access": True,
        "tier": record["tier_clearance"],
        "subscription_id": record["subscription_id"],
        "expires_at": record["expiry_timestamp"],
    }


def get_active_subscriptions() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM customer_subscriptions WHERE billing_status = 'ACTIVE' AND expiry_timestamp > ?",
        (int(time.time()),),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        uid = sys.argv[2] if len(sys.argv) > 2 else "test_user"
        result = verify_user_access_token(uid)
        print(json.dumps(result, indent=2))

    elif len(sys.argv) > 1 and sys.argv[1] == "--active":
        subs = get_active_subscriptions()
        print(f"Active subscriptions: {len(subs)}")
        for s in subs:
            print(f"  {s['user_id']}: {s['plan_id']} expires {datetime.fromtimestamp(s['expiry_timestamp']).date()}")

    elif len(sys.argv) > 1 and sys.argv[1] == "--simulate":
        payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {
            "event": "subscription.activated",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_simulated",
                        "plan_id": "plan_pro_299",
                        "notes": {"user_id": "sim_user"},
                        "current_end": int(time.time()) + 2592000,
                    }
                }
            },
        }
        result = process_webhook_event(payload)
        print(json.dumps(result, indent=2))

    else:
        print("StockStory Billing Gateway")
        print(f"  DB: {DB_PATH}")
        print(f"  Active subs: {len(get_active_subscriptions())}")
        print()
        print("Commands:")
        print("  python billing_gateway.py --verify <user_id>     Check user access")
        print("  python billing_gateway.py --active               List active subscriptions")
        print("  python billing_gateway.py --simulate <json>       Simulate a webhook event")
