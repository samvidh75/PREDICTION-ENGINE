#!/usr/bin/env python3
"""Domain-grade probe for nselib v1.x (capital_market, indices, derivatives submodules)."""

import json
import sys
import time
import traceback
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
    except ImportError as e:
        DOMAINS[domain] = {"domain": domain, "status": "import_failed", "detail": str(e)[:200]}
    except Exception as e:
        msg = str(e)[:300]
        if "401" in msg or "403" in msg:
            DOMAINS[domain] = {"domain": domain, "status": "blocked", "detail": msg}
        else:
            DOMAINS[domain] = {"domain": domain, "status": "endpoint_failed", "detail": msg[:120]}
    return DOMAINS[domain]

try:
    import nselib
    from nselib import capital_market, indices, derivatives
    _ver = getattr(nselib, "__version__", "unknown")
    DOMAINS["import"] = {"domain": "import", "status": "healthy", "detail": f"nselib v{_ver}"}
except Exception as exc:
    DOMAINS["import"] = {"domain": "import", "status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps({"probe": "nselib", "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", "domains": DOMAINS}, indent=2))
    sys.exit(0)

CM = capital_market
IND = indices
DER = derivatives

def fmt_ymd(d):
    return d.strftime("%Y-%m-%d")

def fmt_dmy(d):
    return d.strftime("%d-%m-%Y")

def recent_trading_date():
    for days_ago in range(1, 15):
        d = datetime.now() - timedelta(days=days_ago)
        if d.weekday() < 5:
            return d
    return datetime.now() - timedelta(days=1)

# 1. equity quote / price_volume_data
def _quote():
    df = CM.price_volume_data("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty or blocked"}
    recent = df.tail(1).to_dict("records")[0]
    return {"rows": len(df), "sample": {"symbol": "RELIANCE", "columns": list(df.columns[:8])}}
probe("equity_quote", _quote)

# 2. price_volume_data
def _price_volume():
    td = recent_trading_date()
    df = CM.price_volume_data("RELIANCE", fmt_ymd(td))
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no data"}
    return {"rows": len(df), "latest_date": fmt_ymd(td)}
probe("price_volume", _price_volume)

# 3. deliverable position
def _deliverable():
    td = recent_trading_date()
    df = CM.price_volume_and_deliverable_position_data("TCS", fmt_ymd(td))
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no data"}
    has_dv = any("deliver" in c.lower() for c in df.columns)
    return {"rows": len(df), "sample": {"has_deliverable": has_dv}}
probe("deliverable_position", _deliverable)

# 4. bhavcopy
def _bhavcopy():
    td = recent_trading_date()
    df = CM.bhav_copy_equities(fmt_dmy(td))
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no bhavcopy"}
    return {"rows": len(df), "latest_date": fmt_ymd(td), "sample": {"symbols": len(df)}}
probe("bhavcopy", _bhavcopy)

# 5. bhavcopy with delivery
def _bhav_delivery():
    td = recent_trading_date()
    df = CM.bhav_copy_with_delivery(fmt_dmy(td))
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no data"}
    return {"rows": len(df), "latest_date": fmt_ymd(td)}
probe("bhavcopy_with_delivery", _bhav_delivery)

# 6. index list
def _index_list():
    df = IND.nifty_indices_constituents("NIFTY 50")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty"}
    symbols = sorted(df.iloc[:5, 0].tolist()) if len(df) > 0 else []
    return {"rows": len(df), "sample": {"symbols": symbols}}
probe("index_list_nifty50", _index_list)

# 7. index data
def _index_data():
    df = IND.index_data("NIFTY 50")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty"}
    return {"rows": len(df), "sample": {"columns": list(df.columns[:8])}}
probe("index_data_nifty50", _index_data)

# 8. corporate actions
def _corp_actions():
    df = CM.corporate_actions_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no actions"}
    return {"rows": len(df)}
probe("corporate_actions", _corp_actions)

# 9. event calendar
def _event_calendar():
    df = CM.event_calendar_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no events"}
    return {"rows": len(df)}
probe("event_calendar", _event_calendar)

# 10. financial results
def _financials():
    df = CM.financial_results_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no results"}
    cols = list(df.columns[:15])
    numeric_cols = [c for c in cols if df[c].dtype in ("int64", "float64")] if len(df) > 0 else []
    return {"rows": len(df), "sample": {"columns": cols[:10], "numeric": numeric_cols[:5]}}
probe("financial_results", _financials)

# Summary
healthy = sum(1 for d in DOMAINS.values() if d["status"] == "healthy")
blocked = sum(1 for d in DOMAINS.values() if d["status"] == "blocked")
print(json.dumps({"probe": "nselib",
    "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    "healthy_domains": healthy, "total_domains": len(DOMAINS),
    "blocked_domains": blocked, "domains": DOMAINS}, indent=2))
sys.exit(0)
