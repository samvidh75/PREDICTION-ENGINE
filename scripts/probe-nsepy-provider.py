#!/usr/bin/env python3
"""Probe nsepy SDK — check if it still works or is stale."""
import json, sys, platform

try:
    import nsepy
    VERSION = getattr(nsepy, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "nsepy", "installed": False, "error": str(e)}))
    sys.exit(1)

def safe_call(fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        count = len(result) if hasattr(result, "__len__") else 1
        cols = list(result.columns[:6]) if hasattr(result, "columns") else []
        return {"status": "ok", "rows": count, "sampleFields": cols}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

results = {
    "provider": "nsepy",
    "packageVersion": VERSION,
    "pythonVersion": platform.python_version(),
    "domains": {
        "historical": {"status": "skip", "failureClass": "known_stale", "note": "nsepy is no longer maintained; migrated to nsepython. Old NSE website endpoints may be blocked."},
    },
    "safeToActivate": False,
    "warnings": [
        "No longer maintained — last update 2021",
        "Old NSE website scraping — likely blocked",
        "Migrated to nsepython",
        "Recommend archive"
    ]
}

print(json.dumps(results, default=str))
