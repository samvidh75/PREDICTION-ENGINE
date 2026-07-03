#!/usr/bin/env python3
"""Probe nsepython SDK for usable Indian market data domains."""
import json
import platform
import signal
import sys
from datetime import date, timedelta

_TIMEOUT_SEC = 45

class _TimeoutError(Exception):
    pass

def _timeout_handler(signum, frame):
    raise _TimeoutError(f"Timed out after {_TIMEOUT_SEC}s")

signal.signal(signal.SIGALRM, _timeout_handler)
signal.alarm(_TIMEOUT_SEC)
try:
    import nsepython
    VERSION = getattr(nsepython, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "nsepython", "installed": False, "error": str(e)}))
    sys.exit(1)
except _TimeoutError as e:
    print(json.dumps({"provider": "nsepython", "installed": False, "error": "Import timed out — network blocked?"}))
    sys.exit(1)
finally:
    signal.alarm(0)


def as_date(value):
    if hasattr(value, "strftime"):
        return value.strftime("%d-%m-%Y")
    return str(value)


def safe_call(fn, *args, call_timeout=30):
    signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(call_timeout)
    try:
        result = fn(*args)
        count = len(result) if hasattr(result, "__len__") else 1
        if count == 0:
            return {"status": "unavailable", "detail": "empty response", "rows": 0}
        return {"status": "healthy", "detail": "usable data returned", "rows": count}
    except _TimeoutError:
        return {"status": "failed", "failureClass": "TimeoutError", "detail": f"Timed out after {call_timeout}s"}
    except Exception as e:
        return {"status": "failed", "failureClass": type(e).__name__, "detail": str(e)[:240]}
    finally:
        signal.alarm(0)


def main():
    start = as_date(date.today() - timedelta(days=30))
    end = as_date(date.today())
    bhav_date = as_date(date.today() - timedelta(days=2))

    results = {
        "nifty_quote": safe_call(nsepython.nse_get_index_quote, "NIFTY 50"),
        "bhavcopy": safe_call(nsepython.get_bhavcopy, bhav_date),
        "index_history": safe_call(nsepython.index_history, "NIFTY 50", start, end),
        "historical": safe_call(nsepython.equity_history, "SBIN", "EQ", start, end),
    }
    healthy = sum(1 for item in results.values() if item.get("status") == "healthy")
    report = {
        "provider": "nsepython",
        "installed": True,
        "packageVersion": VERSION,
        "pythonVersion": platform.python_version(),
        "probe": "nsepython",
        "healthy_probes": healthy,
        "total_probes": len(results),
        "results": results,
        "domains": {
            "index_quote": results["nifty_quote"],
            "bhavcopy": results["bhavcopy"],
            "index": results["index_history"],
            "historical": results["historical"],
        },
        "safeToActivate": healthy > 0,
        "warnings": ["Uses public NSE endpoints; unavailable domains must remain labelled."],
    }
    print(json.dumps(report, default=str))


if __name__ == "__main__":
    main()
