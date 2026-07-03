#!/usr/bin/env python3
"""Probe nsetools for any still-usable domains."""

import json
import platform
import sys

try:
    import nsetools
    from nsetools import Nse
    VERSION = getattr(nsetools, "__version__", "unknown")
except Exception as exc:
    print(json.dumps({
        "provider": "nsetools",
        "installed": False,
        "error": str(exc)[:240],
    }))
    sys.exit(0)


def ok(detail, rows=1, sample_fields=None):
    payload = {"status": "healthy", "detail": detail, "rows": rows}
    if sample_fields:
        payload["sampleFields"] = sample_fields
    return payload


def fail(exc):
    return {
        "status": "failed",
        "detail": str(exc)[:240],
        "failureClass": type(exc).__name__,
    }


def probe():
    nse = Nse()
    domains = {}

    try:
      codes = nse.get_stock_codes()
      rows = len(codes) if hasattr(codes, "__len__") else 0
      sample = list(codes)[:6] if isinstance(codes, (list, tuple)) else list(codes.keys())[:6]
      domains["symbol_universe"] = ok("stock codes returned", rows, sample)
    except Exception as exc:
      domains["symbol_universe"] = fail(exc)

    try:
      quote = nse.get_quote("reliance")
      if isinstance(quote, dict) and quote:
          domains["quote"] = ok("quote returned", len(quote), list(quote.keys())[:6])
      else:
          domains["quote"] = {"status": "unavailable", "detail": "empty quote payload"}
    except Exception as exc:
      domains["quote"] = fail(exc)

    try:
      adv = nse.get_advances_declines()
      rows = len(adv) if hasattr(adv, "__len__") else 0
      domains["market_breadth"] = ok("advances/declines returned", rows)
    except Exception as exc:
      domains["market_breadth"] = fail(exc)

    healthy = sum(1 for d in domains.values() if d.get("status") == "healthy")
    print(json.dumps({
        "provider": "nsetools",
        "installed": True,
        "packageVersion": VERSION,
        "pythonVersion": platform.python_version(),
        "domains": domains,
        "healthy_probes": healthy,
        "total_probes": len(domains),
        "safeToActivate": domains.get("quote", {}).get("status") == "healthy",
        "warnings": [
            "Legacy library built on unofficial NSE scraping.",
            "Keep probe-only unless quote domain returns healthy consistently.",
        ],
    }))


if __name__ == "__main__":
    probe()
