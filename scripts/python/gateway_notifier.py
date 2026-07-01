"""
StockStory Infrastructure Sentinel — Zero-cost Discord alert dispatcher.

Usage from any Python ingestion script:
    from gateway_notifier import dispatch_critical_alert
    try:
        ...
    except Exception as exc:
        dispatch_critical_alert("NSE_EOD_INGESTION", exc)
        raise

Set MONITORING_DISCORD_WEBHOOK_URL in your environment.
"""

import json
import os
import traceback
import sys
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    requests = None  # type: ignore[assignment]

DISCORD_WEBHOOK_URL: Optional[str] = os.getenv("MONITORING_DISCORD_WEBHOOK_URL")


def dispatch_critical_alert(service_name: str, exception_obj: Exception) -> None:
    """
    Capture the stack trace, format it into a Discord embed,
    and fire it to the monitoring channel.
    """
    print(f"[Sentinel] Dispatching alert for: {service_name}")

    # 1. Capture stack trace
    error_trace = "".join(
        traceback.format_exception(
            type(exception_obj), exception_obj, exception_obj.__traceback__
        )
    )
    if len(error_trace) > 1500:
        error_trace = error_trace[-1500:]

    # 2. Build Discord embed payload
    payload = {
        "username": "StockStory Infrastructure Sentinel",
        "embeds": [
            {
                "title": "❌ CRITICAL: PIPELINE FAULT DETECTED",
                "color": 15548997,  # Crimson
                "fields": [
                    {
                        "name": "⚙️ Service",
                        "value": f"`{service_name}`",
                        "inline": True,
                    },
                    {
                        "name": "⏰ Time",
                        "value": f"`{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
                        "inline": True,
                    },
                    {
                        "name": "⚠️ Error",
                        "value": f"```\n{str(exception_obj)}\n```",
                        "inline": False,
                    },
                    {
                        "name": "📊 Stack Trace",
                        "value": f"```\n{error_trace}\n```",
                        "inline": False,
                    },
                ],
                "footer": {"text": "Production Node • Self-Healing Active"},
            }
        ],
    }

    # 3. Send
    if not DISCORD_WEBHOOK_URL:
        print("[Sentinel] MONITORING_DISCORD_WEBHOOK_URL not set — logging locally:")
        print(json.dumps(payload, indent=2))
        return

    if requests is None:
        print("[Sentinel] 'requests' package not installed — cannot send webhook.")
        return

    try:
        resp = requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=5)
        if resp.status_code in (204, 240):
            print("[Sentinel] Alert delivered successfully.")
        else:
            print(f"[Sentinel] Webhook returned {resp.status_code}: {resp.text[:200]}")
    except Exception as net_err:
        print(f"[Sentinel] Failed to reach webhook: {net_err}")


# ── Example usage / smoke-test ─────────────────────────────────────────────
if __name__ == "__main__":
    print("[Sentinel] Running smoke test...")
    try:
        1 / 0  # intentional
    except Exception as exc:
        dispatch_critical_alert("SMOKE_TEST_PIPELINE", exc)
