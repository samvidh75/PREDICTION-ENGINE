#!/usr/bin/env python3
"""Probe nsepython v2.97+ for available data functions. No credentials needed."""
import json, sys, time, traceback

RESULTS = {}

def probe(label, fn):
    start = time.time()
    try:
        result = fn()
        elapsed = round(time.time() - start, 2)
        RESULTS[label] = {"status": "healthy", "elapsed": elapsed, "detail": result}
    except ImportError as e:
        RESULTS[label] = {"status": "import_failed", "detail": str(e)[:300]}
    except Exception as e:
        RESULTS[label] = {"status": "endpoint_failed", "detail": str(e)[:300]}

try:
    import nsepython
    RESULTS["module_import"] = {"status": "healthy", "detail": f"nsepython v{getattr(nsepython, '__version__', 'unknown')}"}
except Exception as exc:
    RESULTS["module_import"] = {"status": "import_failed", "detail": str(exc)[:200]}
    print(json.dumps({"probe": "nsepython", "healthy_probes": 0, "total_probes": 1, "results": RESULTS}, indent=2))
    sys.exit(0)

# Index quote (works)
def _nifty_quote():
    from nsepython import nse_get_index_quote
    q = nse_get_index_quote("NIFTY 50")
    if isinstance(q, dict):
        keys = list(q.keys())[:12]
        lp = q.get("lastPrice", q.get("last_price", q.get("last", "N/A")))
        return {"lastPrice": lp, "keys": keys}
    return {"type": type(q).__name__, "sample": str(q)[:200]}
probe("nifty_quote", _nifty_quote)

# Equity quote via nse_quote (may fail - NSE blocks equity endpoints)
def _equity_quote():
    from nsepython import nse_quote
    q = nse_quote("RELIANCE")
    if isinstance(q, dict):
        lp = q.get("lastPrice", q.get("last_price", "N/A"))
        keys = list(q.keys())[:15]
        return {"lastPrice": lp, "keys": keys}
    if isinstance(q, str):
        return f"string_response={q[:100]}"
    return {"type": type(q).__name__}
probe("equity_quote_RELIANCE", _equity_quote)

# Historical via equity_history
def _history():
    from nsepython import equity_history
    from datetime import datetime, timedelta
    end = datetime.now().strftime("%d-%m-%Y")
    start = (datetime.now() - timedelta(days=30)).strftime("%d-%m-%Y")
    h = equity_history("RELIANCE", "EQ", start, end)
    if isinstance(h, (list, tuple)):
        return f"rows={len(h)}"
    if h is not None:
        return f"type={type(h).__name__} len={len(h) if hasattr(h,'__len__') else 'N/A'}"
    return "empty"
probe("history_RELIANCE", _history)

# Bhavcopy via get_bhavcopy
def _bhavcopy():
    from nsepython import get_bhavcopy
    from datetime import datetime, timedelta
    for offset in range(1, 10):
        d = (datetime.now() - timedelta(days=offset)).strftime("%d-%m-%Y")
        df = get_bhavcopy(d)
        if df is not None:
            rows = len(df)
            return f"date={d} rows={rows}"
    return "no recent bhavcopy"
probe("bhavcopy", _bhavcopy)

# Financial results via nse_results
def _results():
    from nsepython import nse_results
    r = nse_results("RELIANCE")
    if isinstance(r, dict) and len(r) > 0:
        return {k: str(v)[:100] for k, v in list(r.items())[:5]}
    if isinstance(r, list) and len(r) > 0:
        return f"results count={len(r)} first={str(r[0])[:200]}"
    return "empty_no_data"
probe("financial_results_RELIANCE", _results)

# Market breadth
def _market_breadth():
    from nsepython import nse_get_advances_declines
    ad = nse_get_advances_declines()
    if isinstance(ad, dict):
        return {k: str(v)[:60] for k, v in list(ad.items())[:8]}
    return {"raw": str(ad)[:200]}
probe("market_breadth", _market_breadth)

_healthy = sum(1 for r in RESULTS.values() if r["status"] == "healthy")
report = {"probe": "nsepython", "healthy_probes": _healthy, "total_probes": len(RESULTS), "results": RESULTS}
print(json.dumps(report, indent=2))
sys.exit(0)
