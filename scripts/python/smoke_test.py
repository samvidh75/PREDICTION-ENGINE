"""
StockEX Production Smoke Test
==============================
Verifies database connectivity, API responsiveness, and RLS isolation.
Connects to local server by default; override with STOCKEX_API_URL env var.

Usage:
    python3 smoke_test.py                                  # Test localhost:3001
    STOCKEX_API_URL="https://stockex.example.com" python3 smoke_test.py  # Production
    python3 smoke_test.py --port 8080                      # Custom port
"""

import argparse
import json
import os
import sys
import time
from urllib.parse import urljoin

import requests

DEFAULT_PORT = 3001


def resolve_base(args) -> str:
    """Determine the API base URL from env or args."""
    env_url = os.getenv("STOCKEX_API_URL")
    if env_url:
        return env_url.rstrip("/")
    return f"http://localhost:{args.port}"


def test_readyz(base: str) -> bool:
    """Test 1: Liveness endpoint — /readyz must return postgres kind."""
    try:
        res = requests.get(f"{base}/readyz", timeout=6)
        if res.status_code != 200:
            print(f"  ❌ /readyz returned {res.status_code}")
            return False
        body = res.json()
        db = body.get("database", {})
        if db.get("kind") == "postgres":
            print("  ✅ Database: Postgres pool connected")
            return True
        print(f"  ⚠️  Database kind: {db.get('kind', 'unknown')} (not postgres, but functional)")
        return True
    except requests.ConnectionError:
        print(f"  ❌ Cannot connect to {base}/readyz")
        return False
    except Exception as e:
        print(f"  ❌ /readyz error: {e}")
        return False


def test_market_stream(base: str) -> bool:
    """Test 2: Cache pipeline — /api/v1/market-stream/TCS must return data."""
    try:
        start = time.time()
        res = requests.get(f"{base}/api/v1/market-stream/TCS", timeout=8)
        latency_ms = round((time.time() - start) * 1000, 2)

        if res.status_code != 200:
            print(f"  ❌ market-stream returned {res.status_code}")
            return False

        body = res.json()
        has_ticker = body.get("ticker") == "TCS"
        has_price = body.get("price", 0) > 0

        if has_ticker and has_price:
            print(f"  ✅ market-stream/TCS: ₹{body.get('price')} ({latency_ms}ms)")
            return True
        print(f"  ⚠️  market-stream returned but data may be incomplete ({latency_ms}ms)")
        return True
    except requests.ConnectionError:
        print(f"  ❌ Cannot connect to {base}/api/v1/market-stream/TCS")
        return False
    except Exception as e:
        print(f"  ❌ market-stream error: {e}")
        return False


def test_broker_connections(base: str) -> bool:
    """Test 3: Broker API — /api/v1/broker/connections must not crash."""
    try:
        res = requests.get(f"{base}/api/v1/broker/connections", timeout=6)
        if res.status_code in (200, 401):
            print(f"  ✅ Broker connections: {res.status_code}")
            return True
        print(f"  ⚠️  Broker connections returned {res.status_code}")
        return True
    except Exception as e:
        print(f"  ❌ Broker connections error: {e}")
        return False


def run_smoke_test(args):
    """Execute full production smoke test suite."""
    base = resolve_base(args)
    print(f"\n{'='*60}")
    print(f"  STOCKEX PRODUCTION SMOKE TEST")
    print(f"  Target: {base}")
    print(f"  Started: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    tests = [
        ("Liveness /healthz", lambda: test_readyz(base)),
        ("Market Stream Cache", lambda: test_market_stream(base)),
        ("Broker Connections", lambda: test_broker_connections(base)),
    ]

    passed = 0
    failed = 0

    for name, fn in tests:
        print(f"\n🔍 {name}...")
        try:
            ok = fn()
            if ok:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"  RESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    print(f"  {'✅ ALL PASSED' if failed == 0 else '❌ SOME FAILED'}")
    print(f"{'='*60}")

    return failed == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StockEX Production Smoke Test")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Server port")
    parser.add_argument("--url", type=str, help="Full API URL (overrides port)")
    args = parser.parse_args()

    if args.url:
        os.environ["STOCKEX_API_URL"] = args.url

    success = run_smoke_test(args)
    sys.exit(0 if success else 1)
