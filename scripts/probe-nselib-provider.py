#!/usr/bin/env python3
"""Domain-grade probe for nselib. Discovers available modules and functions at runtime."""

import json, sys, time, inspect
from datetime import datetime, timedelta

DOMAINS = {}

def probe(domain, fn):
    start = time.time()
    try:
        r = fn()
        elapsed = round(time.time() - start, 2)
        rows = r.get("rows", 0) if isinstance(r, dict) else 0
        s = "healthy" if rows > 0 else "no_rows"
        e = {"domain": domain, "status": s, "elapsed": elapsed, "rows": rows}
        if isinstance(r, dict):
            for k in ("latest_date", "sample", "detail"):
                if k in r: e[k] = r[k]
        DOMAINS[domain] = e
    except Exception as e:
        msg = str(e)[:200]
        if "401" in msg or "403" in msg:
            DOMAINS[domain] = {"domain": domain, "status": "blocked", "detail": msg}
        else:
            DOMAINS[domain] = {"domain": domain, "status": "endpoint_failed", "detail": msg[:120]}
    return DOMAINS[domain]

# Import and discover
try:
    import nselib
    _ver = getattr(nselib, "__version__", "unknown")
    DOMAINS["import"] = {"domain": "import", "status": "healthy", "detail": f"nselib v{_ver}"}
except Exception as exc:
    DOMAINS["import"] = {"domain": "import", "status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps({"probe": "nselib", "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", "domains": DOMAINS}, indent=2))
    sys.exit(0)

# Discover API
_avail = {}
for attr_name in dir(nselib):
    if attr_name.startswith("_"):
        continue
    obj = getattr(nselib, attr_name)
    if inspect.ismodule(obj):
        funcs = [n for n in dir(obj) if not n.startswith("_") and callable(getattr(obj, n, None))]
        _avail[attr_name] = funcs[:30]
    elif callable(obj):
        _avail.setdefault("_top_level", []).append(attr_name)
DOMAINS["api_discovery"] = {"domain": "api_discovery", "status": "healthy",
    "detail": json.dumps(_avail, default=str)[:3000]}

# Dynamically resolve submodules
CM = None
IND = None
for candidate in ["capital_market", "equity", "nse_equity", "bhavcopy"]:
    if hasattr(nselib, candidate) and inspect.ismodule(getattr(nselib, candidate)):
        CM = getattr(nselib, candidate)
        break
for candidate in ["indices", "index", "nse_index", "nifty"]:
    if hasattr(nselib, candidate) and inspect.ismodule(getattr(nselib, candidate)):
        IND = getattr(nselib, candidate)
        break

def has(mod, name):
    return mod is not None and hasattr(mod, name) and callable(getattr(mod, name))

def fmt_dmy(d):
    return d.strftime("%d-%m-%Y")

def fmt_ymd(d):
    return d.strftime("%Y-%m-%d")

def last_td():
    for i in range(1, 15):
        d = datetime.now() - timedelta(days=i)
        if d.weekday() < 5:
            return d
    return datetime.now() - timedelta(days=1)

# Try each domain by checking available functions dynamically
domain_attempts = [
    ("equity_list", lambda: {"rows": len(CM.equity_list())} if has(CM, "equity_list") else exec('raise AttributeError("not found")')),
    ("price_volume", lambda: {"rows": len(CM.price_volume_data("RELIANCE", fmt_ymd(last_td())))} if has(CM, "price_volume_data") else exec('raise AttributeError("not found")')),
    ("deliverable_position", lambda: {"rows": len(CM.price_volume_and_deliverable_position_data("TCS", fmt_ymd(last_td())))} if has(CM, "price_volume_and_deliverable_position_data") else exec('raise AttributeError("not found")')),
    ("bhavcopy", lambda: {"rows": len(CM.bhav_copy_equities(fmt_dmy(last_td()))), "latest_date": fmt_ymd(last_td())} if has(CM, "bhav_copy_equities") else exec('raise AttributeError("not found")')),
    ("bhavcopy_delivery", lambda: {"rows": len(CM.bhav_copy_with_delivery(fmt_dmy(last_td()))), "latest_date": fmt_ymd(last_td())} if has(CM, "bhav_copy_with_delivery") else exec('raise AttributeError("not found")')),
    ("nifty50_constituents", lambda: {"rows": len(IND.nifty_indices_constituents("NIFTY 50"))} if has(IND, "nifty_indices_constituents") else exec('raise AttributeError("not found")')),
    ("index_data", lambda: {"rows": len(IND.index_data("NIFTY 50"))} if has(IND, "index_data") else exec('raise AttributeError("not found")')),
    ("corporate_actions", lambda: {"rows": len(CM.corporate_actions_for_equity("RELIANCE"))} if has(CM, "corporate_actions_for_equity") else exec('raise AttributeError("not found")')),
    ("event_calendar", lambda: {"rows": len(CM.event_calendar_for_equity("RELIANCE"))} if has(CM, "event_calendar_for_equity") else exec('raise AttributeError("not found")')),
    ("financial_results", lambda: {"rows": len(CM.financial_results_for_equity("RELIANCE"))} if has(CM, "financial_results_for_equity") else exec('raise AttributeError("not found")')),
]

for dname, dfn in domain_attempts:
    probe(dname, dfn)

healthy = sum(1 for d in DOMAINS.values() if d["status"] == "healthy")
blocked = sum(1 for d in DOMAINS.values() if d["status"] == "blocked")
print(json.dumps({"probe": "nselib",
    "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    "healthy_domains": healthy, "total_domains": len(DOMAINS),
    "blocked_domains": blocked, "domains": DOMAINS}, indent=2))
sys.exit(0)
