#!/usr/bin/env python3
"""Probe jugaad-data SDK for usable Indian market data domains."""
import json, sys, platform
from datetime import date, timedelta

try:
    from jugaad_data.nse import NSELive, stock_df, bhavcopy_save
    import jugaad_data
    VERSION = getattr(jugaad_data, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "jugaad-data", "installed": False, "error": str(e)}))
    sys.exit(1)

def probe_quote():
    try:
        n = NSELive()
        q = n.stock_quote("RELIANCE")
        price = q.get("priceInfo", {}).get("lastPrice")
        if price:
            return {"status": "ok", "sampleFields": ["lastPrice", "change", "pChange", "open", "close"], "rows": 1}
        return {"status": "no_data", "failureClass": "empty_response"}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

def probe_historical():
    try:
        df = stock_df(symbol="SBIN", from_date=date.today() - timedelta(days=30), to_date=date.today(), series="EQ")
        count = len(df)
        if count > 0:
            cols = [c for c in df.columns if not c.startswith("_")][:6]
            return {"status": "ok", "sampleFields": cols, "rows": count}
        return {"status": "no_data", "failureClass": "empty_dataframe"}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

def probe_bhavcopy():
    try:
        bhavcopy_save(date.today() - timedelta(days=2), "/tmp/bhavcopy_test")
        return {"status": "ok", "rows": 1, "sampleFields": ["bhavcopy_file_written"]}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

def probe_index():
    try:
        from jugaad_data.nse import index_summary
        idx = index_summary()
        if idx is not None:
            return {"status": "ok", "rows": len(idx) if hasattr(idx, "__len__") else 1, "sampleFields": list(idx.columns[:6]) if hasattr(idx, "columns") else ["index_summary"]}
        return {"status": "no_data", "failureClass": "empty_response"}
    except Exception as e:
        return {"status": "fail", "failureClass": type(e).__name__, "error": str(e)[:200]}

results = {
    "provider": "jugaad-data",
    "packageVersion": VERSION,
    "pythonVersion": platform.python_version(),
    "domains": {
        "quote": probe_quote(),
        "historical": probe_historical(),
        "bhavcopy": probe_bhavcopy(),
        "index": probe_index(),
    },
    "safeToActivate": False,
    "warnings": ["Scrapes NSE website directly — may get blocked under heavy use", "License is YOLO (non-standard)"]
}

all_ok = all(d.get("status") == "ok" for d in results["domains"].values())
results["safeToActivate"] = all_ok
print(json.dumps(results, default=str))
