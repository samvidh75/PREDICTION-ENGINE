#!/usr/bin/env python3
"""Probe jugaad-data for available data functions. No credentials needed."""
import json, sys, time
from datetime import datetime, timedelta

RESULTS = {}

def probe(label, fn, timeout_sec=30):
    start = time.time()
    try:
        import signal
        class TimeoutError_(Exception): pass
        def handler(signum, frame): raise TimeoutError_()
        signal.signal(signal.SIGALRM, handler)
        signal.alarm(timeout_sec)
        try:
            result = fn()
            signal.alarm(0)
            elapsed = round(time.time() - start, 2)
            RESULTS[label] = {"status": "healthy", "elapsed": elapsed, "detail": str(result)[:400]}
        except TimeoutError_:
            RESULTS[label] = {"status": "timeout", "detail": f"timed out after {timeout_sec}s"}
    except ImportError as e:
        RESULTS[label] = {"status": "import_failed", "detail": str(e)[:200]}
    except Exception as e:
        msg = str(e)[:400]
        if "not a trading day" in msg.lower():
            RESULTS[label] = {"status": "not_trading_day", "detail": msg}
        elif "blocked" in msg.lower() or "403" in msg or "401" in msg:
            RESULTS[label] = {"status": "blocked", "detail": msg}
        elif "timeout" in msg.lower() or "timed out" in msg.lower():
            RESULTS[label] = {"status": "timeout", "detail": msg}
        elif "JSONDecodeError" in msg or "Expecting value" in msg:
            RESULTS[label] = {"status": "empty_response", "detail": msg}
        elif "replace() takes no keyword arguments" in msg:
            RESULTS[label] = {"status": "python_version_incompatible", "detail": msg}
        else:
            RESULTS[label] = {"status": "endpoint_failed", "detail": msg}

def run():
    # 1. Package import
    def do_import():
        import jugaad_data
        return f"jugaad-data v{jugaad_data.__version__ if hasattr(jugaad_data, '__version__') else 'unknown'} imported"
    probe("package_import", do_import)
    if RESULTS.get("package_import", {}).get("status") != "healthy":
        print(json.dumps(RESULTS, indent=2))
        print("\n=== jugaad-data: 0/6 domains healthy (import failed) ===")
        sys.exit(0)

    # 2. Stock data (uses `stock_df` which has Python 3.9 bug with str.replace(day=1))
    def do_stock_data():
        from jugaad_data.nse import stock_df
        end = datetime.now()
        start = end - timedelta(days=30)
        fd = start.strftime("%d-%m-%Y")
        td = end.strftime("%d-%m-%Y")
        df = stock_df("RELIANCE", fd, td, series="EQ")
        if len(df) == 0:
            return "empty dataframe"
        cols = list(df.columns[:15])
        latest_close = float(df.iloc[-1]["CLOSE"])
        latest_date = str(df.iloc[-1]["DATE"])
        return f"symbol=RELIANCE rows={len(df)} cols={cols} latest_close={latest_close} latest_date={latest_date}"
    probe("stock_data_RELIANCE", do_stock_data)

    # 3. Bhavcopy (returns file path string)
    def do_bhavcopy():
        from jugaad_data.nse import bhavcopy_save
        import tempfile, os, shutil
        for offset in range(1, 10):
            d = datetime.now() - timedelta(days=offset)
            tmp = tempfile.mkdtemp()
            try:
                result = bhavcopy_save(d, tmp)
                # result is a file path string
                if isinstance(result, str) and os.path.exists(result):
                    files = os.listdir(tmp)
                    shutil.rmtree(tmp, ignore_errors=True)
                    return f"bhavcopy_save path={result} files={files}"
                shutil.rmtree(tmp, ignore_errors=True)
            except Exception:
                shutil.rmtree(tmp, ignore_errors=True)
                continue
        return "no recent bhavcopy available"
    probe("bhavcopy", do_bhavcopy)

    # 4. NSELive market status (works)
    def do_market_status():
        from jugaad_data.nse import NSELive
        nse = NSELive()
        status = nse.market_status()
        if isinstance(status, dict):
            mkt = status.get("marketState", [])
            cap = status.get("marketcap", {})
            return f"markets={len(mkt)} cap_date={cap.get('timeStamp','')} cap_inr={cap.get('marketCapinCRRupees','')}"
        return f"market_status type={type(status).__name__}"
    probe("market_status", do_market_status)

    # 5. RBI current rates via RBI class
    def do_rbi():
        from jugaad_data.rbi import RBI
        r = RBI()
        rates = r.current_rates()
        if isinstance(rates, dict):
            keys = list(rates.keys())[:6]
            samples = {k: str(rates[k])[:20] for k in keys}
            return f"RBI rates keys={keys} samples={samples}"
        return f"RBI rates type={type(rates).__name__}"
    probe("rbi_rates", do_rbi)

    # 6. NSELive live index (stock_quote_fno instead of futures_quote)
    def do_live_index():
        from jugaad_data.nse import NSELive
        nse = NSELive()
        idx = nse.all_indices()
        if isinstance(idx, dict):
            data = idx.get("data", idx)
            keys = list(data.keys())[:6] if isinstance(data, dict) else []
            return f"all_indices keys={keys}"
        return f"all_indices type={type(idx).__name__}"
    probe("all_indices", do_live_index)

run()

healthy = sum(1 for r in RESULTS.values() if r["status"] == "healthy")
degraded = sum(1 for r in RESULTS.values() if r["status"] in ("not_trading_day", "timeout", "empty_response", "python_version_incompatible"))
failed = sum(1 for r in RESULTS.values() if r["status"] not in ("healthy",) and r["status"] not in ("not_trading_day", "timeout", "empty_response", "python_version_incompatible"))
print(f"\n=== jugaad-data Probe Summary: {healthy} healthy, {degraded} degraded, {failed} failed ===\n")
print(json.dumps(RESULTS, indent=2))
sys.exit(0 if healthy > 0 else 1)
