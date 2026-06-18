#!/usr/bin/env python3
"""Probe nselib for available data functions. No credentials needed."""

import json
import sys
import time
import traceback

RESULTS = {}

def probe(label, fn):
    start = time.time()
    try:
        result = fn()
        elapsed = round(time.time() - start, 2)
        RESULTS[label] = {"status": "healthy", "elapsed": elapsed, "detail": result}
    except ImportError as e:
        RESULTS[label] = {"status": "import_failed", "detail": str(e)}
    except Exception as e:
        RESULTS[label] = {"status": "endpoint_failed", "detail": str(e)[:200]}
    return RESULTS[label]

# --- Import nselib ---
try:
    import nselib
    from nselib import capital_market, derivatives, debt, pre_open_market
    from nselib.nse_utils import get_nse_url
    RESULTS["import"] = {"status": "healthy", "detail": f"nselib v{nselib.__version__ if hasattr(nselib, '__version__') else 'unknown'}"}
except Exception as e:
    RESULTS["import"] = {"status": "import_failed", "detail": str(e)[:200]}
    print(json.dumps(RESULTS, indent=2))
    sys.exit(0)

# --- Equity list ---
def probe_equity_list():
    try:
        df = capital_market.equity_list()
        count = len(df)
        cols = list(df.columns)
        return f"{count} symbols, columns: {cols[:10]}"
    except Exception as e:
        # nselib may not have equity_list directly
        raise

probe("equity_list", probe_equity_list)

# --- Nifty 50 constituents ---
def probe_nifty50():
    try:
        from nselib import indices
        df = indices.nifty_indices_constituents("NIFTY 50")
        count = len(df)
        symbols = sorted(df.iloc[:5, 0].tolist()) if count > 0 else []
        return f"{count} constituents, sample: {symbols}"
    except Exception:
        raise

probe("nifty50_constituents", probe_nifty50)

# --- Index data ---
def probe_index_data():
    try:
        from nselib import indices
        df = indices.index_data("NIFTY 50")
        count = len(df)
        cols = list(df.columns[:8])
        return f"{count} rows, columns: {cols}"
    except Exception:
        raise

probe("index_data", probe_index_data)

# --- Price volume data for RELIANCE ---
def probe_price_volume():
    try:
        df = capital_market.price_volume_data("RELIANCE")
        count = len(df)
        cols = list(df.columns)
        latest = df.iloc[-1:].to_dict('records')[0] if count > 0 else {}
        latest_simple = {k: str(v)[:30] for k, v in latest.items()}
        return f"{count} rows, columns: {cols[:15]}, latest: {latest_simple}"
    except Exception:
        raise

probe("price_volume_RELIANCE", probe_price_volume)

# --- Price volume and deliverable for TCS ---
def probe_deliverable():
    try:
        df = capital_market.price_volume_and_deliverable_position_data("TCS")
        count = len(df)
        cols = list(df.columns)
        has_deliverable = "DELIVERABLE_VOLUME" in cols or "DELIVERABLE_QTY" in cols or "deliverable" in str(cols).lower()
        return f"{count} rows, columns: {cols[:15]}, has_deliverable: {has_deliverable}"
    except Exception:
        raise

probe("deliverable_TCS", probe_deliverable)

# --- Bhavcopy ---
def probe_bhavcopy():
    try:
        from datetime import datetime, timedelta
        today = datetime.now()
        # Try recent dates
        for days_ago in [1, 2, 3, 4, 5]:
            try:
                d = today - timedelta(days=days_ago)
                df = capital_market.bhav_copy_equities(d)
                if len(df) > 0:
                    return f"{len(df)} rows on {d.strftime('%Y-%m-%d')}, columns: {list(df.columns[:10])}"
            except:
                continue
        return "no recent bhavcopy data found (weekend/holiday)"
    except Exception:
        raise

probe("bhavcopy", probe_bhavcopy)

# --- Bhavcopy with delivery ---
def probe_bhavcopy_delivery():
    try:
        from datetime import datetime, timedelta
        today = datetime.now()
        for days_ago in [1, 2, 3, 4, 5]:
            try:
                d = today - timedelta(days=days_ago)
                df = capital_market.bhav_copy_with_delivery(d)
                if len(df) > 0:
                    return f"{len(df)} rows on {d.strftime('%Y-%m-%d')}, columns: {list(df.columns[:12])}"
            except:
                continue
        return "no recent bhavcopy with delivery found"
    except Exception:
        raise

probe("bhavcopy_with_delivery", probe_bhavcopy_delivery)

# --- Corporate actions ---
def probe_corporate_actions():
    try:
        df = capital_market.corporate_actions_for_equity("RELIANCE")
        count = len(df)
        cols = list(df.columns)
        return f"{count} actions, columns: {cols[:10]}"
    except Exception:
        raise

probe("corporate_actions_RELIANCE", probe_corporate_actions)

# --- Event calendar ---
def probe_event_calendar():
    try:
        df = capital_market.event_calendar_for_equity("RELIANCE")
        count = len(df)
        cols = list(df.columns)
        return f"{count} events, columns: {cols[:8]}"
    except Exception:
        raise

probe("event_calendar_RELIANCE", probe_event_calendar)

# --- Financial results ---
def probe_financial_results():
    try:
        df = capital_market.financial_results_for_equity("RELIANCE")
        count = len(df)
        cols = list(df.columns)
        return f"{count} results, columns: {cols[:15]}"
    except Exception:
        raise

probe("financial_results_RELIANCE", probe_financial_results)

# --- Derivatives (F&O) ---
def probe_derivatives():
    try:
        df = derivatives.derivatives_data()
        count = len(df)
        cols = list(df.columns[:10])
        return f"{count} rows, columns: {cols}"
    except Exception:
        raise

probe("derivatives", probe_derivatives)

# --- PE ratio / index stats ---
def probe_index_stats():
    try:
        from nselib import indices
        df = indices.index_data("NIFTY 50")
        cols = list(df.columns)
        pe_cols = [c for c in cols if 'pe' in c.lower() or 'PE' in c or 'p_e' in c.lower()]
        return f"index columns: {cols[:12]}, PE ratio columns: {pe_cols}"
    except Exception:
        raise

probe("index_stats", probe_index_stats)

# --- Nifty Next 50 ---
def probe_nifty_next50():
    try:
        from nselib import indices
        df = indices.nifty_indices_constituents("NIFTY NEXT 50")
        count = len(df)
        symbols = sorted(df.iloc[:5, 0].tolist()) if count > 0 else []
        return f"{count} constituents, sample: {symbols}"
    except Exception:
        raise

probe("nifty_next50_constituents", probe_nifty_next50)

# --- Summary ---
healthy = sum(1 for r in RESULTS.values() if r["status"] == "healthy")
failed = sum(1 for r in RESULTS.values() if r["status"] != "healthy")
print(f"\n=== NSELib Probe Summary: {healthy} healthy, {failed} failed ===\n")
print(json.dumps(RESULTS, indent=2))

# Exit 0 if at least one useful data domain works
useful_domains = ["equity_list", "nifty50_constituents", "price_volume_RELIANCE", "deliverable_TCS", "bhavcopy", "corporate_actions_RELIANCE"]
has_working = any(RESULTS.get(d, {}).get("status") == "healthy" for d in useful_domains)
if has_working:
    sys.exit(0)
else:
    print("\n⚠️  No useful nselib domain works")
    sys.exit(0)
