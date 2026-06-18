#!/usr/bin/env python3
"""Probe nsepython SDK for usable Indian market data domains."""
import json, sys, platform

try:
    import nsepython
    VERSION = getattr(nsepython, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "nsepython", "installed": False, "error": str(e)}))
    sys.exit(1)

def safe_call(name, fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        count = len(result) if hasattr(result, "__len__") else 1
        return {"status": "ok", "sampleFields": ["response_received"], "rows": count}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

results = {
    "provider": "nsepython",
    "packageVersion": VERSION,
    "pythonVersion": platform.python_version(),
    "domains": {
        "historical": safe_call("equity_history", nsepython.equity_history, "SBIN", "01-01-2025", "01-06-2025"),
        "bhavcopy": safe_call("get_bhavcopy", nsepython.get_bhavcopy, "01", "06", "2025"),
        "index": safe_call("index_history", nsepython.index_history, "NIFTY 50"),
    },
    "safeToActivate": False,
    "warnings": ["Depends on NSE website availability", "May get rate-limited under heavy use"]
}

has_ok = any(d.get("status") == "ok" for d in results["domains"].values())
results["safeToActivate"] = has_ok
print(json.dumps(results, default=str))
