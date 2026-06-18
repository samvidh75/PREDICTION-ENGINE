#!/usr/bin/env python3
"""Probe and bridge jugaad-data for usable Indian market data domains."""
import glob
import json
import os
import platform
import sys
import tempfile
from datetime import date, datetime, timedelta

try:
    import pandas as pd
    from jugaad_data.nse import NSELive, bhavcopy_save, index_df, stock_df
    import jugaad_data
    VERSION = getattr(jugaad_data, "__version__", "unknown")
except ImportError as e:
    print(json.dumps({"provider": "jugaad-data", "installed": False, "error": str(e)}))
    sys.exit(1)


def parse_iso_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


def clean_key(key):
    return str(key).strip().upper().replace(".", "").replace(" ", "_")


def records_from_df(df):
    if df is None or len(df) == 0:
        return []
    out = df.copy()
    out.columns = [clean_key(c) for c in out.columns]
    for col in out.columns:
        if "DATE" in col:
            out[col] = out[col].astype(str)
    out = out.where(pd.notnull(out), None)
    return out.to_dict(orient="records")


def ok(rows=1, sample=None):
    return {"status": "healthy", "detail": "usable data returned", "rows": rows, "sampleFields": sample or []}


def fail(exc):
    return {"status": "failed", "detail": str(exc)[:240], "failureClass": type(exc).__name__}


def stock_records(symbol, from_date, to_date):
    df = stock_df(symbol=symbol, from_date=parse_iso_date(from_date), to_date=parse_iso_date(to_date), series="EQ")
    return records_from_df(df)


def bhavcopy_records(day):
    target = parse_iso_date(day)
    with tempfile.TemporaryDirectory(prefix="ssi_bhavcopy_") as dest:
        bhavcopy_save(target, dest, skip_if_present=False)
        files = glob.glob(os.path.join(dest, "*.csv"))
        if not files:
            files = glob.glob(os.path.join(dest, "**", "*.csv"), recursive=True)
        if not files:
            raise FileNotFoundError(f"jugaad-data wrote no bhavcopy csv for {day}")
        return records_from_df(pd.read_csv(files[0]))


def index_records():
    df = index_df()
    return records_from_df(df)


def rbi_rates():
    try:
        from jugaad_data.rbi import RBI
        rbi = RBI()
        rates = getattr(rbi, "rates", None)
        if callable(rates):
            return rates()
        return {"status": "unavailable", "detail": "RBI.rates is unavailable in installed jugaad-data"}
    except Exception as exc:
        return {"status": "unavailable", "detail": str(exc)[:240]}


def probe_quote():
    try:
        q = NSELive().stock_quote("RELIANCE")
        price = q.get("priceInfo", {}).get("lastPrice") if isinstance(q, dict) else None
        if price:
            return ok(1, ["lastPrice", "change", "pChange", "open", "close"])
        return {"status": "unavailable", "detail": "empty quote response"}
    except Exception as exc:
        return fail(exc)


def probe_historical():
    try:
        rows = stock_records("RELIANCE", (date.today() - timedelta(days=30)).isoformat(), date.today().isoformat())
        return ok(len(rows), list(rows[0].keys())[:6]) if rows else {"status": "unavailable", "detail": "empty stock dataframe"}
    except Exception as exc:
        return fail(exc)


def probe_bhavcopy():
    for offset in range(1, 8):
        day = date.today() - timedelta(days=offset)
        try:
            rows = bhavcopy_records(day.isoformat())
            if rows:
                return ok(len(rows), list(rows[0].keys())[:6])
        except Exception:
            continue
    return {"status": "unavailable", "detail": "no recent bhavcopy csv returned"}


def probe_index():
    try:
        rows = index_records()
        return ok(len(rows), list(rows[0].keys())[:6]) if rows else {"status": "unavailable", "detail": "empty index dataframe"}
    except Exception as exc:
        return fail(exc)


def probe_rbi():
    data = rbi_rates()
    if isinstance(data, dict) and data.get("status") == "unavailable":
        return {"status": "unavailable", "detail": data.get("detail", "RBI unavailable")}
    return ok(1, list(data.keys())[:6] if isinstance(data, dict) else ["rbi_rates"])


def run_probe():
    domains = {
        "quote": probe_quote(),
        "historical": probe_historical(),
        "bhavcopy": probe_bhavcopy(),
        "index": probe_index(),
        "rbi": probe_rbi(),
    }
    healthy = sum(1 for d in domains.values() if d.get("status") == "healthy")
    result = {
        "provider": "jugaad-data",
        "installed": True,
        "packageVersion": VERSION,
        "pythonVersion": platform.python_version(),
        "domains": domains,
        "package_import": {"status": "healthy", "detail": f"jugaad-data {VERSION} import ok"},
        "stock_data_RELIANCE": domains["historical"],
        "bhavcopy": domains["bhavcopy"],
        "market_status": domains["index"],
        "rbi_rates": domains["rbi"],
        "all_indices": domains["index"],
        "healthy_probes": healthy,
        "total_probes": len(domains),
        "safeToActivate": healthy > 0,
        "warnings": ["Uses public NSE/RBI endpoints; unavailable domains must remain labelled."],
    }
    print(json.dumps(result, default=str))


def main():
    if len(sys.argv) == 1:
        run_probe()
        return
    mode = sys.argv[1]
    if mode == "stock":
        if len(sys.argv) != 5:
            raise SystemExit("usage: probe-jugaad-data-provider.py stock SYMBOL FROM_DATE TO_DATE")
        print(json.dumps(stock_records(sys.argv[2], sys.argv[3], sys.argv[4]), default=str))
    elif mode == "bhavcopy":
        if len(sys.argv) != 3:
            raise SystemExit("usage: probe-jugaad-data-provider.py bhavcopy YYYY-MM-DD")
        print(json.dumps(bhavcopy_records(sys.argv[2]), default=str))
    elif mode == "indices":
        print(json.dumps({"rows": index_records()}, default=str))
    elif mode == "rbi":
        print(json.dumps(rbi_rates(), default=str))
    else:
        raise SystemExit(f"unknown mode: {mode}")


if __name__ == "__main__":
    main()
