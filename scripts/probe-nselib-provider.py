#!/usr/bin/env python3
"""Domain-grade probe for nselib. Reports each domain independently.

nselib uses PEP 604 union syntax and requires Python 3.10+.
Each domain is tested separately so equity-blocked does not
disable bhavcopy/index if those work.
"""

import json
import sys
import time
import traceback
from datetime import datetime, timedelta

DOMAINS: dict[str, dict] = {}


def probe(domain: str, fn, timeout_sec: int = 30) -> dict:
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
        elif "Timeout" in msg or "timed out" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "timeout", "detail": msg}
        elif "Connection" in msg or "refused" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "unavailable", "detail": msg}
        elif "No data" in msg or "empty" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "no_rows", "detail": msg}
        elif "parsing" in msg.lower() or "parse" in msg.lower():
            DOMAINS[domain] = {"domain": domain, "status": "parse_failed", "detail": msg}
        else:
            DOMAINS[domain] = {"domain": domain, "status": "endpoint_failed", "detail": msg}
    return DOMAINS[domain]


# ---------------------------------------------------------------------------
# Module-level import
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# 1. equity quote / recent price
# ---------------------------------------------------------------------------
def _quote():
    df = CM.price_volume_data("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty dataframe"}
    recent = df.tail(1).to_dict("records")[0]
    price_keys = [c for c in df.columns if "close" in c.lower() or "last" in c.lower() or "price" in c.lower()]
    latest_price = str(recent.get(price_keys[0], "N/A"))[:30] if price_keys else "N/A"
    dt_col = [c for c in df.columns if "date" in c.lower()][0] if any("date" in c.lower() for c in df.columns) else None
    latest_date = str(recent.get(dt_col, "N/A"))[:20] if dt_col else "N/A"
    return {"rows": len(df), "latest_date": latest_date, "sample": {"symbol": "RELIANCE", "latest_price": latest_price}}

probe("equity_quote", _quote)


# ---------------------------------------------------------------------------
# 2. price_volume_data (historical OHLCV)
# ---------------------------------------------------------------------------
def _price_volume():
    df = CM.price_volume_data("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty dataframe"}
    cols = list(df.columns[:12])
    recent = df.tail(2).to_dict("records")
    dt_col = [c for c in cols if "date" in c.lower()]
    latest_date = str(recent[-1].get(dt_col[0], "N/A"))[:20] if dt_col else "N/A"
    return {"rows": len(df), "latest_date": latest_date, "sample": {"columns": cols, "records": len(df)}}

probe("price_volume", _price_volume)


# ---------------------------------------------------------------------------
# 3. deliverable position data
# ---------------------------------------------------------------------------
def _deliverable():
    df = CM.price_volume_and_deliverable_position_data("TCS")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty dataframe"}
    has_dv = any("deliver" in c.lower() for c in df.columns)
    return {"rows": len(df), "sample": {"has_deliverable_columns": has_dv}}

probe("deliverable_position", _deliverable)


# ---------------------------------------------------------------------------
# 4. bhav_copy_equities (daily)
# ---------------------------------------------------------------------------
def _bhav_copy():
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            df = CM.bhav_copy_equities(d)
            if df is not None and len(df) > 0:
                cols = [c for c in df.columns[:10]]
                return {"rows": len(df), "latest_date": d.strftime("%Y-%m-%d"), "sample": {"columns": cols, "symbols": len(df)}}
        except Exception:
            continue
    return {"rows": 0, "detail": "no recent bhavcopy (weekend/holiday?)"}

probe("bhavcopy_equities", _bhav_copy)


# ---------------------------------------------------------------------------
# 5. bhav_copy_with_delivery
# ---------------------------------------------------------------------------
def _bhav_delivery():
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            df = CM.bhav_copy_with_delivery(d)
            if df is not None and len(df) > 0:
                cols = [c for c in df.columns[:12]]
                return {"rows": len(df), "latest_date": d.strftime("%Y-%m-%d"), "sample": {"columns": cols}}
        except Exception:
            continue
    return {"rows": 0, "detail": "no recent bhavcopy-with-delivery"}

probe("bhavcopy_with_delivery", _bhav_delivery)


# ---------------------------------------------------------------------------
# 6. index list
# ---------------------------------------------------------------------------
def _index_list():
    df = IND.nifty_indices_constituents("NIFTY 50")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "NIFTY 50 empty"}
    return {"rows": len(df), "sample": {"constituents": len(df)}}

probe("index_list_nifty50", _index_list)


# ---------------------------------------------------------------------------
# 7. Nifty 50 constituents
# ---------------------------------------------------------------------------
def _nifty50_symbols():
    df = IND.nifty_indices_constituents("NIFTY 50")
    if df is None or len(df) == 0:
        return {"rows": 0}
    symbols = sorted(df.iloc[:10, 0].tolist()) if len(df) > 0 else []
    return {"rows": len(df), "sample": {"symbols": symbols}}

probe("nifty50_constituents", _nifty50_symbols)


# ---------------------------------------------------------------------------
# 8. market breadth / index data
# ---------------------------------------------------------------------------
def _index_data():
    df = IND.index_data("NIFTY 50")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "empty index data"}
    return {"rows": len(df), "sample": {"columns": list(df.columns[:8])}}

probe("index_data_nifty50", _index_data)


# ---------------------------------------------------------------------------
# 9. corporate_actions_for_equity
# ---------------------------------------------------------------------------
def _corp_actions():
    df = CM.corporate_actions_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no corporate actions"}
    return {"rows": len(df), "sample": {"columns": list(df.columns[:8])}}

probe("corporate_actions", _corp_actions)


# ---------------------------------------------------------------------------
# 10. event_calendar_for_equity
# ---------------------------------------------------------------------------
def _event_calendar():
    df = CM.event_calendar_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no events"}
    return {"rows": len(df), "sample": {"columns": list(df.columns[:8])}}

probe("event_calendar", _event_calendar)


# ---------------------------------------------------------------------------
# 11. financial_results_for_equity
# ---------------------------------------------------------------------------
def _financials():
    df = CM.financial_results_for_equity("RELIANCE")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no financial results"}
    cols = list(df.columns[:15])
    numeric_cols = [c for c in cols if df[c].dtype in ("int64", "float64")] if len(df) > 0 else []
    return {"rows": len(df), "sample": {"columns": cols, "numeric_columns": numeric_cols[:8]}}

probe("financial_results", _financials)

def _financials_tcs():
    df = CM.financial_results_for_equity("TCS")
    if df is None or len(df) == 0:
        return {"rows": 0, "detail": "no financial results for TCS"}
    cols = list(df.columns[:15])
    numeric_cols = [c for c in cols if df[c].dtype in ("int64", "float64")] if len(df) > 0 else []
    return {"rows": len(df), "sample": {"columns": cols, "numeric_columns": numeric_cols[:8]}}

probe("financial_results_tcs", _financials_tcs)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
domain_status_map = {d: info["status"] for d, info in DOMAINS.items()}

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
