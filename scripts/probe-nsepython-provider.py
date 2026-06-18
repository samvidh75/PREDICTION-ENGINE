#!/usr/bin/env python3
"""Probe nsepython / nsepythonserver for available data functions. No credentials needed."""

import json
import sys
import time

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
        RESULTS[label] = {"status": "endpoint_failed", "detail": str(e)[:300]}
    return RESULTS[label]

def probe_nsepython():
    """Try nsepython first, then nsepythonserver."""
    try:
        import nsepython
        RESULTS["nsepython_import"] = {"status": "healthy", "detail": "nsepython imported"}
        
        # Test nifty quote
        def nifty_quote():
            try:
                from nsepython import nse_get_index_quote
                q = nse_get_index_quote("NIFTY 50")
                if isinstance(q, dict):
                    keys = list(q.keys())[:10]
                    return f"keys: {keys}"
                return f"type: {type(q).__name__}"
            except:
                from nsepython import nse_get_index
                q = nse_get_index("NIFTY 50")
                if isinstance(q, dict):
                    keys = list(q.keys())[:10]
                    return f"keys: {keys}"
                return f"type: {type(q).__name__}"
        probe("nifty_quote", nifty_quote)
        
        # Test equity quote
        def equity_quote():
            from nsepython import nse_get_quote
            q = nse_get_quote("RELIANCE")
            if isinstance(q, dict):
                keys = list(q.keys())[:15]
                lp = q.get('lastPrice', q.get('last_price', 'N/A'))
                return f"lastPrice={lp}, keys: {keys}"
            return f"type: {type(q).__name__}"
        probe("equity_quote_RELIANCE", equity_quote)
        
        # Test nse_get_history
        def history():
            try:
                from nsepython import nse_get_history
                df = nse_get_history("RELIANCE", series="EQ")
                count = len(df)
                cols = list(df.columns[:10]) if count > 0 else []
                return f"{count} rows, columns: {cols}"
            except:
                from nsepython import nse_get_bhavcopy
                df = nse_get_bhavcopy()
                count = len(df) if df is not None else 0
                return f"bhavcopy: {count} rows"
        probe("history_RELIANCE", history)
        
        # Test advanced decl
        def market_status():
            from nsepython import nse_get_advances_declines
            ad = nse_get_advances_declines()
            return str(ad)[:200]
        probe("market_breadth", market_status)
        
        # Test top gainers
        def top_gainers():
            from nsepython import nse_get_top_gainers
            tg = nse_get_top_gainers()
            return str(tg)[:200]
        probe("top_gainers", top_gainers)
        
    except ImportError:
        RESULTS["nsepython_import"] = {"status": "import_failed", "detail": "nsepython not installable"}
        
        # Try nsepythonserver
        try:
            import nsepythonserver
            RESULTS["nsepythonserver_import"] = {"status": "healthy", "detail": "nsepythonserver imported"}
        except ImportError:
            RESULTS["nsepythonserver_import"] = {"status": "import_failed", "detail": "nsepythonserver not installable"}

probe_nsepython()

healthy = sum(1 for r in RESULTS.values() if r["status"] == "healthy")
failed = sum(1 for r in RESULTS.values() if r["status"] != "healthy")
print(f"\n=== NSEPython Probe Summary: {healthy} healthy, {failed} failed ===\n")
print(json.dumps(RESULTS, indent=2))
sys.exit(0)
