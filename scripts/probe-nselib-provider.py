#!/usr/bin/env python3
"""Domain-grade probe for nselib v2.x. Discovers API at runtime."""

import json
import sys
import time
import inspect
from datetime import datetime, timedelta

DOMAINS: dict[str, dict] = {}

def probe(domain: str, fn) -> dict:
    start = time.time()
    try:
        result = fn()
        elapsed = round(time.time() - start, 2)
        rows = result.get("rows", 0) if isinstance(result, dict) else 0
        status = "healthy" if rows > 0 else "no_rows"
        entry = {"domain": domain, "status": status, "elapsed": elapsed, "rows": rows}
        if isinstance(result, dict):
            for k in ("latest_date", "sample", "detail"):
                if k in result:
                    entry[k] = result[k]
        DOMAINS[domain] = entry
    except Exception as e:
        msg = str(e)[:300]
        if "401" in msg or "403" in msg:
            DOMAINS[domain] = {"domain": domain, "status": "blocked", "detail": msg}
        elif "attribute" in msg.lower() and "module" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "unavailable", "detail": msg[:120]}
        else:
            DOMAINS[domain] = {"domain": domain, "status": "endpoint_failed", "detail": msg[:120]}
    return DOMAINS[domain]

# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------
try:
    import nselib
    _ver = getattr(nselib, "__version__", "unknown")
    DOMAINS["import"] = {"domain": "import", "status": "healthy", "detail": f"nselib v{_ver}"}
except Exception as exc:
    DOMAINS["import"] = {"domain": "import", "status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps({"probe": "nselib", "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", "domains": DOMAINS}, indent=2))
    sys.exit(0)

# ---------------------------------------------------------------------------
# API discovery
# ---------------------------------------------------------------------------
_avail = {}
for mod_name in dir(nselib):
    if mod_name.startswith("_"):
        continue
    obj = getattr(nselib, mod_name)
    if inspect.ismodule(obj):
        funcs = [n for n in dir(obj) if not n.startswith("_")]
        _avail[mod_name] = funcs

DOMAINS["api_discovery"] = {"domain": "api_discovery", "status": "healthy", "detail": json.dumps(_avail, default=str)[:2000]}

# Map known function names (nselib v1.x compatibility)
CM = nselib.capital_market if hasattr(nselib, "capital_market") else None
IND = nselib.indices if hasattr(nselib, "indices") else None
DER = nselib.derivatives if hasattr(nselib, "derivatives") else None

# ---------------------------------------------------------------------------
# 1. equity_list
# ---------------------------------------------------------------------------
def _equity_list():
    if CM is None or not hasattr(CM, "equity_list"):
        raise AttributeError("capital_market.equity_list not available")
    df = CM.equity_list()
    return {"rows": len(df), "sample": {"total_symbols": len(df)}}
probe("equity_list", _equity_list)

# ---------------------------------------------------------------------------
# 2. bhav_copy_equities (try d/m/y format)
# ---------------------------------------------------------------------------
def _bhav_copy():
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%d-%m-%Y")
            df = CM.bhav_copy_equities(ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": d.strftime("%Y-%m-%d"), "sample": {"symbols": len(df)}}
        except Exception:
            continue
    return {"rows": 0, "detail": "no recent bhavcopy"}
probe("bhavcopy_equities", _bhav_copy)

# ---------------------------------------------------------------------------
# 3. bhav_copy_with_delivery
# ---------------------------------------------------------------------------
def _bhav_delivery():
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%d-%m-%Y")
            df = CM.bhav_copy_with_delivery(ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": d.strftime("%Y-%m-%d")}
        except Exception:
            continue
    return {"rows": 0, "detail": "no recent bhavcopy-with-delivery"}
probe("bhavcopy_with_delivery", _bhav_delivery)

# ---------------------------------------------------------------------------
# 4. price_volume_data (try different param combos)
# ---------------------------------------------------------------------------
def _price_volume():
    if CM is None:
        raise AttributeError("capital_market not available")
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%d-%m-%Y")
            df = CM.price_volume_data("RELIANCE", ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": ds, "sample": {"symbol": "RELIANCE"}}
        except Exception:
            continue
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%d-%m-%Y")
            df = CM.price_volume_data("RELIANCE", from_date=ds, to_date=ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": ds, "sample": {"symbol": "RELIANCE"}}
        except Exception:
            continue
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%Y-%m-%d")
            df = CM.price_volume_data("RELIANCE", ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": ds}
        except Exception:
            continue
    return {"rows": 0, "detail": "price_volume not available or NSE blocked"}
probe("price_volume", _price_volume)

# ---------------------------------------------------------------------------
# 5. deliverable position
# ---------------------------------------------------------------------------
def _deliverable():
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            ds = d.strftime("%d-%m-%Y")
            df = CM.price_volume_and_deliverable_position_data("TCS", ds)
            if df is not None and len(df) > 0:
                return {"rows": len(df), "latest_date": ds}
        except Exception:
            continue
    return {"rows": 0, "detail": "deliverable not available"}
probe("deliverable_position", _deliverable)

# ---------------------------------------------------------------------------
# 6. index list (try various function names)
# ---------------------------------------------------------------------------
def _index_functions():
    if IND is None:
        raise AttributeError("indices module not available")
    funcs = [n for n in dir(IND) if not n.startswith("_")]
    return {"rows": len(funcs), "sample": {"functions": funcs[:20]}}
probe("index_functions", _index_functions)

# ---------------------------------------------------------------------------
# 7. Nifty 50 constituents (try various names)
# ---------------------------------------------------------------------------
def _nifty50():
    if IND is None:
        raise AttributeError("indices module not available")
    for fname in ["nifty_indices_constituents", "nifty_constituents", "index_constituents", "nifty50_constituents",
                  "nifty50_equity_list", "equity_list"]:
        if hasattr(IND, fname):
            try:
                fn = getattr(IND, fname)
                df = fn("NIFTY 50") if fname != "equity_list" else fn()
                if df is not None and len(df) > 0:
                    return {"rows": len(df), "sample": {"via": fname}}
            except Exception:
                continue
    # try nselib top-level
    for fname in dir(nselib):
        obj = getattr(nselib, fname)
        if callable(obj) and "nifty" in fname.lower():
            try:
                df = obj("NIFTY 50")
                if df is not None and len(df) > 0:
                    return {"rows": len(df), "sample": {"via": f"nselib.{fname}"}}
            except Exception:
                continue
    return {"rows": 0, "detail": "no index function found"}
probe("nifty50_constituents", _nifty50)

# ---------------------------------------------------------------------------
# 8. corporate_actions
# ---------------------------------------------------------------------------
def _corp_actions():
    if CM is None:
        raise AttributeError("capital_market not available")
    try:
        df = CM.corporate_actions("RELIANCE")
        if df is not None and len(df) > 0:
            return {"rows": len(df)}
    except Exception:
        pass
    try:
        df = CM.corporate_actions_for_equity("RELIANCE")
        if df is not None and len(df) > 0:
            return {"rows": len(df)}
    except Exception:
        pass
    try:
        df = CM.corporate_actions_between_dates("RELIANCE", "01-01-2024", "31-12-2024")
        if df is not None and len(df) > 0:
            return {"rows": len(df)}
    except Exception:
        pass
    return {"rows": 0, "detail": "no corporate actions endpoint"}
probe("corporate_actions", _corp_actions)

# ---------------------------------------------------------------------------
# 9. financial_results
# ---------------------------------------------------------------------------
def _financials():
    if CM is None:
        raise AttributeError("capital_market not available")
    try:
        df = CM.financial_results("RELIANCE")
        if df is not None and len(df) > 0:
            cols = list(df.columns[:15])
            numeric_cols = [c for c in cols if df[c].dtype in ("int64", "float64")] if len(df) > 0 else []
            return {"rows": len(df), "sample": {"columns": cols, "numeric": numeric_cols[:8]}}
    except Exception:
        pass
    try:
        df = CM.financial_results("RELIANCE", period="annual")
        if df is not None and len(df) > 0:
            return {"rows": len(df)}
    except Exception:
        pass
    try:
        df = CM.financial_results_for_equity("RELIANCE")
        if df is not None and len(df) > 0:
            return {"rows": len(df)}
    except Exception:
        pass
    return {"rows": 0, "detail": "no financial results endpoint"}
probe("financial_results", _financials)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
healthy_count = sum(1 for d in DOMAINS.values() if d["status"] == "healthy")
blocked_count = sum(1 for d in DOMAINS.values() if d["status"] == "blocked")

report = {
    "probe": "nselib",
    "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    "healthy_domains": healthy_count,
    "total_domains": len(DOMAINS),
    "blocked_domains": blocked_count,
    "domains": DOMAINS,
}

print(json.dumps(report, indent=2))
sys.exit(0)
