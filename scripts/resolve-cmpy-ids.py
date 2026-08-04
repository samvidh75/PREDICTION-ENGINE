#!/usr/bin/env python3
"""
Resolves PSE Edge cmpy_id for every symbol in api/_lib/data/universe.ts's
PSE_STOCKS, via PSE Edge's own
/autoComplete/searchCompanyNameSymbol.ax?term={symbol} JSON endpoint.

Not part of the app's runtime — this is a maintenance tool for refreshing
KNOWN_CMPY_IDS in src/services/scrapers/PSEEdgeScraper.ts (e.g. after new
PSE listings). Re-run when the PSE_STOCKS list changes, then hand-merge
the output into KNOWN_CMPY_IDS — see that map's doc comment for the
current coverage (280/294 as of 2026-08-04) and why 14 symbols don't
resolve (mostly preferred-share/bond-style tickers).

Usage: python3 scripts/resolve-cmpy-ids.py
Writes: scripts/cmpy_ids_resolved.json
"""
import json
import re
import ssl
import time
import urllib.request

UNIVERSE_FILE = "api/_lib/data/universe.ts"
OUTPUT_FILE = "scripts/cmpy_ids_resolved.json"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def load_symbols() -> list[str]:
    with open(UNIVERSE_FILE) as f:
        content = f.read()
    match = re.search(r"PSE_STOCKS.*?=\s*\[(.*?)\n\];", content, re.DOTALL)
    if not match:
        raise RuntimeError(f"Could not find PSE_STOCKS array in {UNIVERSE_FILE}")
    return re.findall(r'symbol:\s*"([A-Z0-9&]+)"', match.group(1))


def resolve(symbol: str):
    url = f"https://edge.pse.com.ph/autoComplete/searchCompanyNameSymbol.ax?term={symbol}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e)}

    for item in data:
        if item.get("symbol") == symbol:
            return {"cmpyId": int(item["cmpyId"]), "cmpyNm": item.get("cmpyNm")}
    return {"error": "no_exact_match", "candidates": data}


def main():
    symbols = load_symbols()
    results = {}
    for i, sym in enumerate(symbols):
        results[sym] = resolve(sym)
        status = results[sym].get("cmpyId", results[sym].get("error"))
        print(f"[{i+1}/{len(symbols)}] {sym} -> {status}")
        time.sleep(0.4)
        if (i + 1) % 40 == 0:
            with open(OUTPUT_FILE, "w") as f:
                json.dump(results, f, indent=2)
            print(f"  ...checkpoint saved ({i+1} done)")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    resolved = sum(1 for r in results.values() if "cmpyId" in r)
    print(f"\nDone: {resolved}/{len(symbols)} resolved. Written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
