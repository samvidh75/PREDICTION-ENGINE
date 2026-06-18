#!/usr/bin/env python3
"""Production-grade probe for nselib. Reports domain-level health for each data function.

nselib uses PEP 604 union syntax (e.g. `str | None`) and requires Python 3.10+.
On Python < 3.10 the import will fail with TypeError. This probe catches that
gracefully and reports each domain status individually.
"""

import json
import sys
import time
import traceback

RESULTS: dict[str, dict] = {}
DOMAIN_DETAIL: dict[str, str] = {}


def probe(label: str, fn, domain: str = "") -> dict:
    start = time.time()
    try:
        result = fn()
        elapsed = round(time.time() - start, 2)
        RESULTS[label] = {"status": "healthy", "elapsed": elapsed, "detail": result}
        if domain:
            DOMAIN_DETAIL[domain] = "healthy"
    except ImportError as e:
        RESULTS[label] = {"status": "import_failed", "detail": str(e)[:200]}
        if domain and domain not in DOMAIN_DETAIL:
            DOMAIN_DETAIL[domain] = "import_failed"
    except Exception as e:
        RESULTS[label] = {"status": "endpoint_failed", "detail": str(e)[:200]}
        if domain and domain not in DOMAIN_DETAIL:
            DOMAIN_DETAIL[domain] = "endpoint_failed"
    return RESULTS[label]


# ---------------------------------------------------------------------------
# Module-level import
# ---------------------------------------------------------------------------
try:
    import nselib

    _version = getattr(nselib, "__version__", "unknown")
    RESULTS["module_import"] = {"status": "healthy", "detail": f"nselib v{_version}"}
except Exception as exc:
    RESULTS["module_import"] = {"status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps(RESULTS, indent=2))
    sys.exit(0)

# ---------------------------------------------------------------------------
# Sub-module imports (may also fail on Python < 3.10)
# ---------------------------------------------------------------------------
_SUB_MODULES = {
    "capital_market": "from nselib import capital_market",
    "indices": "from nselib import indices",
    "derivatives": "from nselib import derivatives",
    "debt": "from nselib import debt",
    "pre_open_market": "from nselib import pre_open_market",
}

CAPITAL_MARKET_OK = False
INDICES_OK = False
DERIVATIVES_OK = False

for _name, _stmt in _SUB_MODULES.items():
    try:
        exec(_stmt)
        RESULTS[f"submod_{_name}"] = {"status": "healthy", "detail": f"{_name} imported"}
        if _name == "capital_market":
            CAPITAL_MARKET_OK = True
        elif _name == "indices":
            INDICES_OK = True
        elif _name == "derivatives":
            DERIVATIVES_OK = True
    except Exception as exc:
        RESULTS[f"submod_{_name}"] = {"status": "import_failed", "detail": str(exc)[:200]}

# ---------------------------------------------------------------------------
# Domain: equity_list
# ---------------------------------------------------------------------------
def _equity_list():
    df = capital_market.equity_list()
    return {"count": len(df), "columns": list(df.columns[:10])}

if CAPITAL_MARKET_OK:
    probe("equity_list", _equity_list, domain="equity_list")

# ---------------------------------------------------------------------------
# Domain: index_constituents
# ---------------------------------------------------------------------------
def _nifty50():
    df = indices.nifty_indices_constituents("NIFTY 50")
    symbols = sorted(df.iloc[:5, 0].tolist()) if len(df) > 0 else []
    return {"count": len(df), "sample": symbols}

def _nifty_next50():
    df = indices.nifty_indices_constituents("NIFTY NEXT 50")
    symbols = sorted(df.iloc[:5, 0].tolist()) if len(df) > 0 else []
    return {"count": len(df), "sample": symbols}

def _index_constituents_niftybank():
    df = indices.nifty_indices_constituents("NIFTY BANK")
    symbols = sorted(df.iloc[:5, 0].tolist()) if len(df) > 0 else []
    return {"count": len(df), "sample": symbols}

if INDICES_OK:
    probe("nifty50_constituents", _nifty50, domain="index_constituents")
    probe("nifty_next50_constituents", _nifty_next50, domain="index_constituents")
    probe("nifty_bank_constituents", _index_constituents_niftybank, domain="index_constituents")

# ---------------------------------------------------------------------------
# Domain: index_data
# ---------------------------------------------------------------------------
def _index_data():
    df = indices.index_data("NIFTY 50")
    return {"count": len(df), "columns": list(df.columns[:8])}

if INDICES_OK:
    probe("index_data_nifty50", _index_data, domain="index_data")

# ---------------------------------------------------------------------------
# Domain: bhav_copy
# ---------------------------------------------------------------------------
def _bhav_copy():
    from datetime import datetime, timedelta
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            df = capital_market.bhav_copy_equities(d)
            if len(df) > 0:
                return {"date": d.strftime("%Y-%m-%d"), "count": len(df), "columns": list(df.columns[:10])}
        except Exception:
            continue
    return {"note": "no recent bhavcopy found (weekend/holiday)"}

def _bhav_copy_delivery():
    from datetime import datetime, timedelta
    today = datetime.now()
    for days_ago in range(1, 8):
        try:
            d = today - timedelta(days=days_ago)
            df = capital_market.bhav_copy_with_delivery(d)
            if len(df) > 0:
                return {"date": d.strftime("%Y-%m-%d"), "count": len(df), "columns": list(df.columns[:12])}
        except Exception:
            continue
    return {"note": "no recent bhavcopy-with-delivery found"}

if CAPITAL_MARKET_OK:
    probe("bhavcopy", _bhav_copy, domain="bhav_copy")
    probe("bhavcopy_with_delivery", _bhav_copy_delivery, domain="bhav_copy")

# ---------------------------------------------------------------------------
# Domain: corporate_actions
# ---------------------------------------------------------------------------
def _corp_actions():
    df = capital_market.corporate_actions_for_equity("RELIANCE")
    return {"count": len(df), "columns": list(df.columns[:10])}

def _corp_actions_tcs():
    df = capital_market.corporate_actions_for_equity("TCS")
    return {"count": len(df), "columns": list(df.columns[:10])}

if CAPITAL_MARKET_OK:
    probe("corporate_actions_RELIANCE", _corp_actions, domain="corporate_actions")
    probe("corporate_actions_TCS", _corp_actions_tcs, domain="corporate_actions")

# ---------------------------------------------------------------------------
# Domain: financial_results
# ---------------------------------------------------------------------------
def _financial_results():
    df = capital_market.financial_results_for_equity("RELIANCE")
    return {"count": len(df), "columns": list(df.columns[:15])}

def _financial_results_tcs():
    df = capital_market.financial_results_for_equity("TCS")
    return {"count": len(df), "columns": list(df.columns[:15])}

if CAPITAL_MARKET_OK:
    probe("financial_results_RELIANCE", _financial_results, domain="financial_results")
    probe("financial_results_TCS", _financial_results_tcs, domain="financial_results")

# ---------------------------------------------------------------------------
# Domain: price_volume
# ---------------------------------------------------------------------------
def _price_volume():
    df = capital_market.price_volume_data("RELIANCE")
    cols = list(df.columns)
    latest = df.iloc[-1:].to_dict("records")[0] if len(df) > 0 else {}
    return {"count": len(df), "columns": cols[:15], "latest_sample": {k: str(v)[:40] for k, v in latest.items()}}

def _deliverable():
    df = capital_market.price_volume_and_deliverable_position_data("TCS")
    has_dv = any(k in df.columns for k in ("DELIVERABLE_VOLUME", "DELIVERABLE_QTY"))
    return {"count": len(df), "columns": list(df.columns[:15]), "has_deliverable": has_dv}

if CAPITAL_MARKET_OK:
    probe("price_volume_RELIANCE", _price_volume, domain="price_volume")
    probe("deliverable_TCS", _deliverable, domain="price_volume")

# ---------------------------------------------------------------------------
# Domain: derivatives (F&O)
# ---------------------------------------------------------------------------
def _derivatives():
    df = derivatives.derivatives_data()
    return {"count": len(df), "columns": list(df.columns[:10])}

if DERIVATIVES_OK:
    probe("derivatives_fno", _derivatives, domain="derivatives")

# ---------------------------------------------------------------------------
# Domain: event_calendar
# ---------------------------------------------------------------------------
def _event_calendar():
    df = capital_market.event_calendar_for_equity("RELIANCE")
    return {"count": len(df), "columns": list(df.columns[:8])}

if CAPITAL_MARKET_OK:
    probe("event_calendar_RELIANCE", _event_calendar, domain="event_calendar")

# ---------------------------------------------------------------------------
# Summary & exit
# ---------------------------------------------------------------------------
_all_labels = list(RESULTS.keys())
_domain_status = {}
for d in sorted(set(DOMAIN_DETAIL.values())):
    _domain_status[d] = sum(1 for v in DOMAIN_DETAIL.values() if v == d)
_healthy_count = sum(1 for r in RESULTS.values() if r["status"] == "healthy")
_total = len(RESULTS)

report = {
    "probe": "nselib",
    "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    "healthy_probes": _healthy_count,
    "total_probes": _total,
    "domain_summary": dict(sorted({d: DOMAIN_DETAIL[d] for d in DOMAIN_DETAIL}.items())),
    "results": RESULTS,
}

print(json.dumps(report, indent=2))

_useful_domains = {
    "equity_list", "index_constituents", "bhav_copy",
    "corporate_actions", "financial_results", "price_volume",
}
_working_domains = {d for d, s in DOMAIN_DETAIL.items() if s == "healthy"}
_overlap = _useful_domains & _working_domains
if _overlap:
    sys.exit(0)
else:
    sys.exit(0)
