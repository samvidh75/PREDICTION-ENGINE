#!/usr/bin/env python3
"""Probe akshare SDK — primarily Chinese markets, check India coverage."""
import json, sys, platform

try:
    import akshare
    VERSION = getattr(akshare, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "akshare", "installed": False, "error": str(e)}))
    sys.exit(1)

def safe_call(name, fn, *args, **kwargs):
    try:
        df = fn(*args, **kwargs)
        count = len(df) if hasattr(df, "__len__") else 1
        cols = list(df.columns[:6]) if hasattr(df, "columns") else []
        return {"status": "ok", "rows": count, "sampleFields": cols}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

results = {
    "provider": "akshare",
    "packageVersion": VERSION,
    "pythonVersion": platform.python_version(),
    "domains": {
        "india_quote": {"status": "skip", "failureClass": "not_probed", "note": "akshare is Chinese-market focused; no India-specific equity endpoints verified"},
        "china_historical": safe_call("stock_zh_a_hist", akshare.stock_zh_a_hist, symbol="000001", period="daily", start_date="20250101", end_date="20250601"),
    },
    "safeToActivate": False,
    "warnings": [
        "Primarily Chinese market data",
        "India-specific endpoints not documented",
        "Heavy dependency tree (pandas, requests, lxml, etc.)",
        "MIT license — acceptable for use if India domains are verified"
    ]
}

print(json.dumps(results, default=str))
