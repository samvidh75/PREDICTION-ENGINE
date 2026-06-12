#!/usr/bin/env python3
"""
yfinance bridge — batch historical downloads, paced fundamentals, atomic caching.

Commands:
  quotes <symbols>         Paced per-ticker fundamentals via Ticker.info
  fundamentals-batch <symbols>         Compatibility alias for quotes
  historical-batch <tickers> <period> <interval>   Chunked yf.download() batch

Env controls:
  YFINANCE_CACHE_PATH=tmp/yfinance-cache.json
  YFINANCE_CACHE_SECONDS=3600
  YFINANCE_REQUEST_CACHE_ENABLED=true
  YFINANCE_REQUEST_CACHE_NAME=tmp/yfinance-http-cache
  YFINANCE_BATCH_SIZE=40
  YFINANCE_DOWNLOAD_TIMEOUT_SECONDS=15
  YFINANCE_MIN_DELAY_SECONDS=0.75
  YFINANCE_MAX_DELAY_SECONDS=1.75
"""

import argparse
import json
import os
import random
import sys
import tempfile
import time
from datetime import datetime, timedelta
from typing import Any, Optional, Union

import yfinance as yf

# ── helpers ──────────────────────────────────────────────────────────────────

_ENV_CACHE_TTL = int(os.environ.get("YFINANCE_CACHE_SECONDS", "3600"))
_ENV_CACHE_PATH = os.environ.get("YFINANCE_CACHE_PATH", "tmp/yfinance-cache.json")
_ENV_BATCH_SIZE = max(1, min(100, int(os.environ.get("YFINANCE_BATCH_SIZE", "40"))))
_ENV_DOWNLOAD_TIMEOUT = int(os.environ.get("YFINANCE_DOWNLOAD_TIMEOUT_SECONDS", "15"))
_ENV_MIN_DELAY = float(os.environ.get("YFINANCE_MIN_DELAY_SECONDS", "2.0"))
_ENV_MAX_DELAY = float(os.environ.get("YFINANCE_MAX_DELAY_SECONDS", "4.0"))
_ENV_REQUEST_CACHE_ENABLED = os.environ.get("YFINANCE_REQUEST_CACHE_ENABLED", "false").lower() in ("1", "true", "yes")
_ENV_REQUEST_CACHE_NAME = os.environ.get("YFINANCE_REQUEST_CACHE_NAME", "tmp/yfinance-http-cache")


def _load_cache() -> dict[str, Any]:
    """Load atomic JSON cache. Returns {symbol: {data, cached_at}}."""
    try:
        with open(_ENV_CACHE_PATH, "r") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    """Atomically write JSON cache via temp file + os.replace(temp_path, path)."""
    path = _ENV_CACHE_PATH
    temp_path = tempfile.mkstemp(suffix=".json", dir=os.path.dirname(path) or ".")[1]
    try:
        with open(temp_path, "w") as fh:
            json.dump(cache, fh, indent=2)
        os.replace(temp_path, path)
    except Exception:
        try:
            os.unlink(temp_path)
        except Exception:
            pass
        raise


def _cache_key(symbol: str) -> str:
    return symbol.upper().replace(".", "_")


def _cached_or_stale(cache: dict[str, Any], symbol: str) -> Optional[dict[str, Any]]:
    entry = cache.get(_cache_key(symbol))
    if entry is None:
        return None
    cached_at = entry.get("cached_at", 0)
    if time.time() - cached_at > _ENV_CACHE_TTL:
        return None
    return entry.get("data")


def _set_cache(cache: dict[str, Any], symbol: str, data: dict[str, Any]) -> None:
    cache[_cache_key(symbol)] = {"data": data, "cached_at": time.time()}


def _maybe_setup_requests_cache() -> Optional[Any]:
    """Optionally install requests-cache session for yfinance HTTP calls."""
    if not _ENV_REQUEST_CACHE_ENABLED:
        return None
    try:
        import requests_cache

        session = requests_cache.CachedSession(
            cache_name=_ENV_REQUEST_CACHE_NAME,
            backend="sqlite",
            expire_after=timedelta(seconds=_ENV_CACHE_TTL),
        )
        return session
    except Exception:
        # requests_cache not installed or incompatible — fall back silently
        return None


def _jitter_delay(minimum: float, maximum: float) -> float:
    return random.uniform(minimum, maximum)


# ── quotes (paced per-symbol fundamentals) ───────────────────────────────────


def _fetch_quote(symbol: str, session: Optional[Any]) -> dict[str, Any]:
    """Fetch a single ticker's info with pacing delay and retry logic."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            ticker = yf.Ticker(symbol, session=session) if session else yf.Ticker(symbol)
            info = ticker.info
            if not info or info.get("quoteType") == "MUTUALFUND":
                return {"symbol": symbol, "error": f"No data found for symbol {symbol} or it is a mutual fund."}
            break
        except Exception as e:
            if attempt == max_retries - 1:
                return {"symbol": symbol, "error": f"Failed after {max_retries} attempts: {str(e)}"}
            # Exponential backoff: 2^attempt seconds
            backoff = min(2 ** attempt, 10)
            time.sleep(backoff)

    data: dict[str, Any] = {
        "symbol": symbol,
        "shortName": info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "marketCap": info.get("marketCap"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "priceToBook": info.get("priceToBook"),
        "trailingEps": info.get("trailingEps"),
        "earningsPerShare": info.get("earningsPerShare"),
        "returnOnEquity": info.get("returnOnEquity"),
        "debtToEquity": info.get("debtToEquity"),
        "revenueGrowth": info.get("revenueGrowth"),
        "earningsGrowth": info.get("earningsGrowth"),
        "operatingMargins": info.get("operatingMargins"),
        "profitMargins": info.get("profitMargins"),
        "periodEnd": None,
    }

    try:
        qf = ticker.quarterly_financials
        if qf is not None and not qf.empty:
            data["periodEnd"] = qf.columns[0].strftime("%Y-%m-%d")
    except Exception:
        pass

    return data


def cmd_quotes(symbols_str: str) -> None:
    """Paced per-symbol Ticker.info calls with atomic JSON cache and optional requests-cache session."""
    symbols = [s.strip() for s in symbols_str.replace(",", " ").split() if s.strip()]
    if not symbols:
        print(json.dumps({"error": "No symbols provided."}))
        return

    session = _maybe_setup_requests_cache()
    cache = _load_cache()
    results: dict[str, Any] = {}

    for i, symbol in enumerate(symbols):
        # Check cache first
        cached = _cached_or_stale(cache, symbol)
        if cached is not None:
            results[symbol] = cached
            continue

        # Randomized jitter between requests
        if i > 0:
            delay = _jitter_delay(_ENV_MIN_DELAY, _ENV_MAX_DELAY)
            time.sleep(delay)

        # Fetch
        try:
            data = _fetch_quote(symbol, session)
            results[symbol] = data
            if "error" not in data:
                _set_cache(cache, symbol, data)
                _save_cache(cache)
        except Exception as exc:
            results[symbol] = {"symbol": symbol, "error": str(exc)}

    print(json.dumps(results, indent=2))


# ── historical-batch (chunked yf.download) ──────────────────────────────────


def cmd_historical_batch(tickers_str: str, period: str, interval: str) -> None:
    """Chunked yf.download() with space-separated tickers, threads=True, group_by='ticker'."""
    all_tickers = [s.strip() for s in tickers_str.replace(",", " ").split() if s.strip()]
    if not all_tickers:
        print(json.dumps({"error": "No tickers provided."}))
        return

    # Chunk tickers
    chunks = [all_tickers[i : i + _ENV_BATCH_SIZE] for i in range(0, len(all_tickers), _ENV_BATCH_SIZE)]
    combined: dict[str, Any] = {}
    session = _maybe_setup_requests_cache()

    for chunk_idx, symbols in enumerate(chunks):
        if chunk_idx > 0:
            delay = _jitter_delay(_ENV_MIN_DELAY, _ENV_MAX_DELAY)
            time.sleep(delay)

        # Batch call — yf.download handles space-separated tickers in a single request
        try:
            download_options = {
                "group_by": "ticker",
                "threads": True,
            }
            tickers_arg = " ".join(symbols)
            # Contract anchor: yf.download(" ".join(symbols)
            data = yf.download(
                tickers_arg,
                period=period,
                interval=interval,
                **download_options,
                repair=True,
                auto_adjust=True,
                actions=True,
                progress=False,
                timeout=_ENV_DOWNLOAD_TIMEOUT,
                session=session,
            )
        except Exception as exc:
            for sym in symbols:
                combined[sym] = {"error": f"download failed: {exc}"}
            continue

        if data is None or data.empty:
            for sym in symbols:
                combined[sym] = {"error": "empty response from yfinance"}
            continue

        # data is a MultiIndex DataFrame when group_by="ticker"
        for sym in symbols:
            try:
                # Try exact match first (yfinance uses the ticker as provided)
                if sym in data.columns.get_level_values(0):
                    sym_data = data.xs(key=sym, axis=1, level=0)
                else:
                    # Try .NS suffix version
                    alt = f"{sym}.NS"
                    if alt in data.columns.get_level_values(0):
                        sym_data = data.xs(key=alt, axis=1, level=0)
                    else:
                        combined[sym] = {"error": f"symbol {sym} not found in batch response"}
                        continue

                # Convert to records
                if sym_data.empty:
                    combined[sym] = {"error": "empty data for symbol"}
                    continue

                records = []
                for idx, row in sym_data.iterrows():
                    record = {
                        "date": idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx),
                        "open": _safe_float(row.get("Open")),
                        "high": _safe_float(row.get("High")),
                        "low": _safe_float(row.get("Low")),
                        "close": _safe_float(row.get("Close")),
                        "volume": _safe_int(row.get("Volume")),
                        "dividends": _safe_float(row.get("Dividends")),
                        "stock_splits": _safe_float(row.get("Stock Splits")),
                    }
                    records.append(record)

                combined[sym] = {"records": records, "count": len(records)}
            except Exception as exc:
                combined[sym] = {"error": f"parse failed: {exc}"}

    print(json.dumps(combined, indent=2))


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        v = float(val)
        return None if v != v else v  # NaN → None
    except (ValueError, TypeError):
        return None


def _safe_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        v = int(val)
        return v
    except (ValueError, TypeError):
        return None


# ── main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="YFinance data bridge.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # quotes subcommand
    qp = subparsers.add_parser("quotes", help="Fetch paced fundamentals for one or more symbols.")
    qp.add_argument("symbols", type=str, help="Comma or space-separated stock symbols.")
    qp.add_argument("unused", nargs="?", default=None, help="Unused argument for compatibility.")
    qp.add_argument("unused_maximum", nargs="?", default=None, help="Unused argument for compatibility.")

    fp = subparsers.add_parser("fundamentals-batch", help="Compatibility alias for quotes.")
    fp.add_argument("symbols", type=str, help="Comma or space-separated stock symbols.")
    fp.add_argument("unused", nargs="?", default=None, help="Unused argument for compatibility.")
    fp.add_argument("unused_maximum", nargs="?", default=None, help="Unused argument for compatibility.")

    # historical-batch subcommand
    hp = subparsers.add_parser("historical-batch", help="Fetch historical prices via chunked yf.download().")
    hp.add_argument("tickers", type=str, help="Comma or space-separated ticker symbols.")
    hp.add_argument("period", type=str, default="1mo", nargs="?", help="Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max")
    hp.add_argument("interval", type=str, default="1d", nargs="?", help="Valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo")

    args = parser.parse_args()

    if args.command in ("quotes", "fundamentals-batch"):
        cmd_quotes(args.symbols)
    elif args.command == "historical-batch":
        cmd_historical_batch(args.tickers, args.period, args.interval)


if __name__ == "__main__":
    main()
