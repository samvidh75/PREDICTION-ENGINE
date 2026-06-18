#!/usr/bin/env python3
"""Domain-grade probe for nselib v2.x. Probes top-level functions directly."""

import json
import sys
import time
import inspect
from datetime import datetime, timedelta

DOMAINS = {}

def probe(domain, fn):
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
        msg = str(e)[:200]
        if "401" in msg or "403" in msg:
            DOMAINS[domain] = {"domain": domain, "status": "blocked", "detail": msg}
        elif "attribute" in msg.lower() and "module" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "unavailable", "detail": msg}
        else:
            DOMAINS[domain] = {"domain": domain, "status": "endpoint_failed", "detail": msg}
    return DOMAINS[domain]

# Import
try:
    import nselib as ns
    _ver = getattr(ns, "__version__", "unknown")
    DOMAINS["import"] = {"domain": "import", "status": "healthy", "detail": f"nselib v{_ver}"}
except Exception as exc:
    DOMAINS["import"] = {"domain": "import", "status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps({"probe": "nselib", "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", "domains": DOMAINS}, indent=2))
    sys.exit(0)

# Discover all callable top-level + module-level functions
_top_funcs = []
_mod_funcs = {}
for attr_name in dir(ns):
    if attr_name.startswith("_"):
        continue
    obj = getattr(ns, attr_name)
    if inspect.ismodule(obj):
        _mod_funcs[attr_name] = [n for n in dir(obj) if not n.startswith("_") and callable(getattr(obj, n))]
    elif callable(obj):
        _top_funcs.append(attr_name)

DOMAINS["api_discovery"] = {"domain": "api_discovery", "status": "healthy",
    "detail": json.dumps({"top_level_callables": _top_funcs, "modules": _mod_funcs}, default=str)[:3000]}

def try_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None

def try_top(name, *args, **kwargs):
    if hasattr(ns, name):
        return try_call(getattr(ns, name), *args, **kwargs)
    return None

def try_mod(mod, name, *args, **kwargs):
    if hasattr(ns, mod) and inspect.ismodule(getattr(ns, mod)):
        m = getattr(ns, mod)
        if hasattr(m, name):
            return try_call(getattr(m, name), *args, **kwargs)
    return None

TODAY = datetime.now()
DATE_FMTS = ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"]

def recent_trading_date():
    for days_ago in range(1, 15):
        d = TODAY - timedelta(days=days_ago)
        if d.weekday() < 5:
            return d
    return TODAY - timedelta(days=1)

def fmt_date(d, fmt="%d-%m-%Y"):
    return d.strftime(fmt)

# 1. equity_list
def _equity_list():
    for name in _top_funcs:
        if "equity" in name.lower() and "list" in name.lower():
            df = try_call(getattr(ns, name))
            if df is not None and hasattr(df, '__len__') and len(df) > 0:
                return {"rows": len(df), "sample": {"via": name}}
    for mod in _mod_funcs:
        for fn in _mod_funcs[mod]:
            if "equity" in fn.lower() and "list" in fn.lower():
                df = try_mod(mod, fn)
                if df is not None and hasattr(df, '__len__') and len(df) > 0:
                    return {"rows": len(df), "sample": {"via": f"{mod}.{fn}"}}
    return {"rows": 0, "detail": "no equity_list function found"}
probe("equity_list", _equity_list)

# 2. bhavcopy (try all date formats)
def _bhavcopy():
    td = recent_trading_date()
    candidates = _top_funcs + [f"{m}.{f}" for m, fl in _mod_funcs.items() for f in fl]
    for name in _top_funcs:
        if "bhav" in name.lower():
            for dfmt in DATE_FMTS:
                try:
                    df = getattr(ns, name)(fmt_date(td, dfmt))
                    if df is not None and hasattr(df, '__len__') and len(df) > 0:
                        return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d"), "sample": {"via": name, "fmt": dfmt}}
                except Exception:
                    continue
    for mod, fl in _mod_funcs.items():
        for fn in fl:
            if "bhav" in fn.lower():
                m = getattr(ns, mod)
                for dfmt in DATE_FMTS:
                    try:
                        df = getattr(m, fn)(fmt_date(td, dfmt))
                        if df is not None and hasattr(df, '__len__') and len(df) > 0:
                            return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d"), "sample": {"via": f"{mod}.{fn}", "fmt": dfmt}}
                    except Exception:
                        continue
    return {"rows": 0, "detail": "no bhavcopy function found"}
probe("bhavcopy", _bhavcopy)

# 3. bhavcopy_with_delivery
def _bhav_delivery():
    td = recent_trading_date()
    for name in _top_funcs:
        if "bhav" in name.lower() and ("delivery" in name.lower() or "deliverable" in name.lower()):
            for dfmt in DATE_FMTS:
                try:
                    df = getattr(ns, name)(fmt_date(td, dfmt))
                    if df is not None and hasattr(df, '__len__') and len(df) > 0:
                        return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d")}
                except Exception:
                    continue
    for mod, fl in _mod_funcs.items():
        for fn in fl:
            if "bhav" in fn.lower() and ("delivery" in fn.lower() or "deliverable" in fn.lower()):
                m = getattr(ns, mod)
                for dfmt in DATE_FMTS:
                    try:
                        df = getattr(m, fn)(fmt_date(td, dfmt))
                        if df is not None and hasattr(df, '__len__') and len(df) > 0:
                            return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d")}
                    except Exception:
                        continue
    return {"rows": 0, "detail": "no bhavcopy with delivery"}
probe("bhavcopy_with_delivery", _bhav_delivery)

# 4. price_volume_data
def _price_volume():
    td = recent_trading_date()
    names = _top_funcs
    for name in names:
        if "price" in name.lower() and "volume" in name.lower() and "deliverable" not in name.lower():
            for dfmt in DATE_FMTS:
                ds = fmt_date(td, dfmt)
                try:
                    df = getattr(ns, name)("RELIANCE", ds)
                    if df is not None and hasattr(df, '__len__') and len(df) > 0:
                        return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d"), "sample": {"via": name, "fmt": dfmt}}
                except Exception:
                    pass
                try:
                    df = getattr(ns, name)("RELIANCE", from_date=ds, to_date=ds)
                    if df is not None and hasattr(df, '__len__') and len(df) > 0:
                        return {"rows": len(df), "latest_date": td.strftime("%Y-%m-%d"), "sample": {"via": name, "fmt": dfmt}}
                except Exception:
                    pass
    return {"rows": 0, "detail": "no price_volume function found"}
probe("price_volume", _price_volume)

# 5. index functions
def _index():
    td = TODAY
    for name in _top_funcs:
        nl = name.lower()
        if "index" in nl or "nifty" in nl:
            try:
                fn = getattr(ns, name)
                for idx_name in ["NIFTY 50", "NIFTY 50 index"]:
                    df = try_call(fn, idx_name)
                    if df is not None and hasattr(df, '__len__') and len(df) > 0:
                        return {"rows": len(df), "sample": {"via": name}}
            except Exception:
                continue
    for mod, fl in _mod_funcs.items():
        for fn in fl:
            nl = fn.lower()
            if "index" in nl or "nifty" in nl or "constituent" in nl:
                try:
                    f = getattr(getattr(ns, mod), fn)
                    for idx_name in ["NIFTY 50", "NIFTY 50 index"]:
                        df = try_call(f, idx_name)
                        if df is not None and hasattr(df, '__len__') and len(df) > 0:
                            return {"rows": len(df), "sample": {"via": f"{mod}.{fn}"}}
                except Exception:
                    continue
    return {"rows": 0, "detail": "no index function found"}
probe("index_constituents", _index)

# 6. corporate actions
def _corp_actions():
    for name in _top_funcs:
        nl = name.lower()
        if "corporate" in nl:
            try:
                df = getattr(ns, name)("RELIANCE")
                if df is not None and hasattr(df, '__len__') and len(df) > 0:
                    return {"rows": len(df), "sample": {"via": name}}
            except Exception:
                continue
    return {"rows": 0, "detail": "no corporate actions function"}
probe("corporate_actions", _corp_actions)

# 7. financial results
def _financials():
    for name in _top_funcs:
        nl = name.lower()
        if "financial" in nl:
            try:
                df = getattr(ns, name)("RELIANCE")
                if df is not None and hasattr(df, '__len__') and len(df) > 0:
                    cols = list(df.columns[:15]) if hasattr(df, 'columns') else []
                    return {"rows": len(df), "sample": {"via": name, "columns": cols[:10]}}
            except Exception:
                continue
    return {"rows": 0, "detail": "no financial results function"}
probe("financial_results", _financials)

# Summary
healthy = sum(1 for d in DOMAINS.values() if d["status"] == "healthy")
blocked = sum(1 for d in DOMAINS.values() if d["status"] == "blocked")
print(json.dumps({"probe": "nselib",
    "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    "healthy_domains": healthy, "total_domains": len(DOMAINS),
    "blocked_domains": blocked, "domains": DOMAINS}, indent=2))
sys.exit(0)
