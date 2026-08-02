#!/usr/bin/env python3
"""
yfinance bridge — batch historical downloads, paced fundamentals, atomic caching.

Commands:
  quotes <symbols>                     Paced per-ticker fundamentals
  fundamentals-batch <symbols>         Compatibility alias for quotes
  historical-batch <tickers> <period> <interval>

Fundamentals strategy:
  1. Ticker.get_info() / Ticker.info
  2. Ticker.get_fast_info()
  3. Real values derived from income statements and balance sheets

Missing upstream values remain null. The bridge never invents fundamentals.
"""

import argparse
import json
import os
import random
import tempfile
import time
from datetime import timedelta
from typing import Any, Callable, Optional

try:
    import yfinance as yf
except Exception as exc:  # pragma: no cover - exercised only when optional dependency is absent
    yf = None
    _YFINANCE_IMPORT_ERROR = str(exc)
else:
    _YFINANCE_IMPORT_ERROR = ""

_ENV_CACHE_TTL = int(os.environ.get("YFINANCE_CACHE_SECONDS", "3600"))
_ENV_CACHE_PATH = os.environ.get("YFINANCE_CACHE_PATH", "tmp/yfinance-cache.json")
_ENV_BATCH_SIZE = max(1, min(100, int(os.environ.get("YFINANCE_BATCH_SIZE", "40"))))
_ENV_DOWNLOAD_TIMEOUT = int(os.environ.get("YFINANCE_DOWNLOAD_TIMEOUT_SECONDS", "15"))
_ENV_MIN_DELAY = float(os.environ.get("YFINANCE_MIN_DELAY_SECONDS", "0.75"))
_ENV_MAX_DELAY = float(os.environ.get("YFINANCE_MAX_DELAY_SECONDS", "1.75"))
_ENV_REQUEST_CACHE_ENABLED = os.environ.get("YFINANCE_REQUEST_CACHE_ENABLED", "false").lower() in ("1", "true", "yes")
_ENV_REQUEST_CACHE_NAME = os.environ.get("YFINANCE_REQUEST_CACHE_NAME", "tmp/yfinance-http-cache")


def _require_yfinance() -> None:
    if yf is None:
        raise RuntimeError(f"Python package yfinance is required. Install requirements-yfinance.txt. {_YFINANCE_IMPORT_ERROR}".strip())


def _safe_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed != parsed or parsed in (float("inf"), float("-inf")):
        return None
    return parsed


def _safe_int(value: Any) -> Optional[int]:
    parsed = _safe_float(value)
    return None if parsed is None else int(parsed)


def _coalesce(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def _normalize_key(value: Any) -> str:
    return "".join(character.lower() for character in str(value) if character.isalnum())


def _load_cache() -> dict[str, Any]:
    try:
        with open(_ENV_CACHE_PATH, "r", encoding="utf-8") as handle:
            loaded = json.load(handle)
            return loaded if isinstance(loaded, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    path = _ENV_CACHE_PATH
    directory = os.path.dirname(path) or "."
    os.makedirs(directory, exist_ok=True)
    descriptor, temp_path = tempfile.mkstemp(suffix=".json", dir=directory)
    os.close(descriptor)
    try:
        with open(temp_path, "w", encoding="utf-8") as handle:
            json.dump(cache, handle, indent=2)
        os.replace(temp_path, path)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def _cache_key(symbol: str) -> str:
    return symbol.upper().replace(".", "_")


def _cached_or_stale(cache: dict[str, Any], symbol: str) -> Optional[dict[str, Any]]:
    entry = cache.get(_cache_key(symbol))
    if not isinstance(entry, dict):
        return None
    cached_at = entry.get("cached_at", 0)
    if time.time() - float(cached_at) > _ENV_CACHE_TTL:
        return None
    data = entry.get("data")
    return data if isinstance(data, dict) else None


def _set_cache(cache: dict[str, Any], symbol: str, data: dict[str, Any]) -> None:
    cache[_cache_key(symbol)] = {"data": data, "cached_at": time.time()}


def _maybe_setup_requests_cache() -> Optional[Any]:
    if not _ENV_REQUEST_CACHE_ENABLED:
        return None
    try:
        import requests_cache

        return requests_cache.CachedSession(
            cache_name=_ENV_REQUEST_CACHE_NAME,
            backend="sqlite",
            expire_after=timedelta(seconds=_ENV_CACHE_TTL),
        )
    except Exception:
        return None


def _jitter_delay(minimum: float, maximum: float) -> float:
    return random.uniform(minimum, maximum)


def _new_ticker(symbol: str, session: Optional[Any], warnings: list[str]) -> Any:
    _require_yfinance()
    if session is not None:
        try:
            return yf.Ticker(symbol, session=session)
        except Exception as exc:
            warnings.append(f"cached session rejected; retried with native yfinance session: {exc}")
    return yf.Ticker(symbol)


def _safe_mapping(getter: Callable[[], Any], label: str, warnings: list[str]) -> dict[str, Any]:
    try:
        value = getter()
        if isinstance(value, dict):
            return value
        try:
            return dict(value)
        except Exception:
            return {}
    except Exception as exc:
        warnings.append(f"{label} unavailable: {exc}")
        return {}


def _safe_frame(getter: Callable[[], Any], label: str, warnings: list[str]) -> Any:
    try:
        frame = getter()
        if frame is not None and not getattr(frame, "empty", True):
            return frame
    except Exception as exc:
        warnings.append(f"{label} unavailable: {exc}")
    return None


def _statement_values(frame: Any, aliases: list[str]) -> list[float]:
    if frame is None:
        return []
    expected = {_normalize_key(alias) for alias in aliases}
    for index in getattr(frame, "index", []):
        if _normalize_key(index) not in expected:
            continue
        row = frame.loc[index]
        raw_values = row.tolist() if hasattr(row, "tolist") else list(row)
        values = [_safe_float(value) for value in raw_values]
        return [value for value in values if value is not None]
    return []


def _latest_period(*frames: Any) -> Optional[str]:
    for frame in frames:
        columns = getattr(frame, "columns", []) if frame is not None else []
        if len(columns) == 0:
            continue
        latest = columns[0]
        if hasattr(latest, "strftime"):
            return latest.strftime("%Y-%m-%d")
        return str(latest)[:10]
    return None


def _growth(values: list[float]) -> Optional[float]:
    if len(values) < 2 or values[1] == 0:
        return None
    return (values[0] - values[1]) / abs(values[1])


def _ratio(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def _tracked_count(data: dict[str, Any]) -> int:
    tracked = [
        "marketCap",
        "trailingPE",
        "forwardPE",
        "priceToBook",
        "trailingEps",
        "earningsPerShare",
        "returnOnEquity",
        "debtToEquity",
        "revenueGrowth",
        "earningsGrowth",
        "operatingMargins",
        "profitMargins",
    ]
    return sum(_safe_float(data.get(field)) is not None for field in tracked)


def _fetch_quote(symbol: str, session: Optional[Any]) -> dict[str, Any]:
    warnings: list[str] = []
    ticker = _new_ticker(symbol, session, warnings)

    info = _safe_mapping(lambda: ticker.get_info(), "Ticker.get_info", warnings)
    if not info:
        info = _safe_mapping(lambda: ticker.info, "Ticker.info", warnings)
    fast_info = _safe_mapping(lambda: ticker.get_fast_info(), "Ticker.get_fast_info", warnings)
    if not fast_info:
        fast_info = _safe_mapping(lambda: ticker.fast_info, "Ticker.fast_info", warnings)

    income = _safe_frame(lambda: ticker.get_income_stmt(freq="yearly"), "yearly income statement", warnings)
    if income is None:
        income = _safe_frame(lambda: ticker.get_income_stmt(freq="quarterly"), "quarterly income statement", warnings)
    balance = _safe_frame(lambda: ticker.get_balance_sheet(freq="yearly"), "yearly balance sheet", warnings)
    if balance is None:
        balance = _safe_frame(lambda: ticker.get_balance_sheet(freq="quarterly"), "quarterly balance sheet", warnings)

    revenues = _statement_values(income, ["Total Revenue", "TotalRevenue"])
    net_income = _statement_values(income, ["Net Income", "NetIncome", "Net Income Common Stockholders", "NetIncomeCommonStockholders"])
    operating_income = _statement_values(income, ["Operating Income", "OperatingIncome"])
    diluted_eps = _statement_values(income, ["Diluted EPS", "DilutedEPS", "Basic EPS", "BasicEPS"])
    equity = _statement_values(balance, ["Stockholders Equity", "StockholdersEquity", "Total Equity Gross Minority Interest", "TotalEquityGrossMinorityInterest"])
    total_debt = _statement_values(balance, ["Total Debt", "TotalDebt"])

    market_cap = _safe_float(_coalesce(info.get("marketCap"), fast_info.get("marketCap"), fast_info.get("market_cap")))
    shares = _safe_float(_coalesce(info.get("sharesOutstanding"), fast_info.get("shares")))
    latest_net_income = net_income[0] if net_income else None
    latest_revenue = revenues[0] if revenues else None
    latest_operating_income = operating_income[0] if operating_income else None
    latest_equity = equity[0] if equity else None
    latest_debt = total_debt[0] if total_debt else None
    derived_eps = diluted_eps[0] if diluted_eps else _ratio(latest_net_income, shares)

    data: dict[str, Any] = {
        "symbol": symbol,
        "shortName": _coalesce(info.get("shortName"), info.get("longName"), symbol),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "marketCap": market_cap,
        "trailingPE": _coalesce(info.get("trailingPE"), _ratio(market_cap, latest_net_income)),
        "forwardPE": info.get("forwardPE"),
        "priceToBook": _coalesce(info.get("priceToBook"), _ratio(market_cap, latest_equity)),
        "trailingEps": _coalesce(info.get("trailingEps"), derived_eps),
        "earningsPerShare": _coalesce(info.get("earningsPerShare"), derived_eps),
        "returnOnEquity": _coalesce(info.get("returnOnEquity"), _ratio(latest_net_income, latest_equity)),
        "debtToEquity": _coalesce(info.get("debtToEquity"), _ratio(latest_debt, latest_equity)),
        "revenueGrowth": _coalesce(info.get("revenueGrowth"), _growth(revenues)),
        "earningsGrowth": _coalesce(info.get("earningsGrowth"), _growth(net_income)),
        "operatingMargins": _coalesce(info.get("operatingMargins"), _ratio(latest_operating_income, latest_revenue)),
        "profitMargins": _coalesce(info.get("profitMargins"), _ratio(latest_net_income, latest_revenue)),
        "periodEnd": _latest_period(income, balance),
        "warnings": warnings,
    }

    if _tracked_count(data) == 0:
        data["error"] = "No usable fundamentals returned by yfinance info, fast_info, or structured statements."
    return data


def cmd_quotes(symbols_str: str) -> None:
    symbols = [symbol.strip() for symbol in symbols_str.replace(",", " ").split() if symbol.strip()]
    if not symbols:
        print(json.dumps({"error": "No symbols provided."}))
        return
    session = _maybe_setup_requests_cache()
    cache = _load_cache()
    results: dict[str, Any] = {}
    for index, symbol in enumerate(symbols):
        cached = _cached_or_stale(cache, symbol)
        if cached is not None:
            results[symbol] = cached
            continue
        if index > 0:
            time.sleep(_jitter_delay(_ENV_MIN_DELAY, _ENV_MAX_DELAY))
        data = _fetch_quote(symbol, session)
        results[symbol] = data
        if "error" not in data:
            _set_cache(cache, symbol, data)
            _save_cache(cache)
    print(json.dumps(results, indent=2))


def _download_chunk(symbols: list[str], period: str, interval: str, session: Optional[Any]) -> Any:
    _require_yfinance()
    options = {
        "group_by": "ticker",
        "threads": True,
        "repair": True,
        "auto_adjust": True,
        "actions": True,
        "progress": False,
        "timeout": _ENV_DOWNLOAD_TIMEOUT,
    }
    if session is not None:
        try:
            return yf.download(" ".join(symbols), period=period, interval=interval, session=session, **options)
        except Exception:
            pass
    return yf.download(" ".join(symbols), period=period, interval=interval, **options)


def cmd_historical_batch(tickers_str: str, period: str, interval: str) -> None:
    all_tickers = [symbol.strip() for symbol in tickers_str.replace(",", " ").split() if symbol.strip()]
    if not all_tickers:
        print(json.dumps({"error": "No tickers provided."}))
        return
    groups = [all_tickers[index:index + _ENV_BATCH_SIZE] for index in range(0, len(all_tickers), _ENV_BATCH_SIZE)]
    combined: dict[str, Any] = {}
    session = _maybe_setup_requests_cache()
    for group_index, symbols in enumerate(groups):
        if group_index > 0:
            time.sleep(_jitter_delay(_ENV_MIN_DELAY, _ENV_MAX_DELAY))
        try:
            data = _download_chunk(symbols, period, interval, session)
        except Exception as exc:
            for symbol in symbols:
                combined[symbol] = {"error": f"download failed: {exc}"}
            continue
        if data is None or data.empty:
            for symbol in symbols:
                combined[symbol] = {"error": "empty response from yfinance"}
            continue
        for symbol in symbols:
            try:
                if hasattr(data.columns, "get_level_values") and symbol in data.columns.get_level_values(0):
                    symbol_data = data.xs(key=symbol, axis=1, level=0)
                elif len(symbols) == 1:
                    symbol_data = data
                else:
                    combined[symbol] = {"error": f"symbol {symbol} not found in batch response"}
                    continue
                records = []
                for index, row in symbol_data.iterrows():
                    records.append({
                        "date": index.strftime("%Y-%m-%d") if hasattr(index, "strftime") else str(index),
                        "open": _safe_float(row.get("Open")),
                        "high": _safe_float(row.get("High")),
                        "low": _safe_float(row.get("Low")),
                        "close": _safe_float(row.get("Close")),
                        "volume": _safe_int(row.get("Volume")),
                        "dividends": _safe_float(row.get("Dividends")),
                        "stock_splits": _safe_float(row.get("Stock Splits")),
                    })
                combined[symbol] = {"records": records, "count": len(records)}
            except Exception as exc:
                combined[symbol] = {"error": f"parse failed: {exc}"}
    print(json.dumps(combined, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="YFinance data bridge.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    quote_parser = subparsers.add_parser("quotes", help="Fetch paced fundamentals for one or more symbols.")
    quote_parser.add_argument("symbols", type=str)
    quote_parser.add_argument("unused", nargs="?", default=None)
    quote_parser.add_argument("unused_maximum", nargs="?", default=None)
    fundamentals_parser = subparsers.add_parser("fundamentals-batch", help="Compatibility alias for quotes.")
    fundamentals_parser.add_argument("symbols", type=str)
    fundamentals_parser.add_argument("unused", nargs="?", default=None)
    fundamentals_parser.add_argument("unused_maximum", nargs="?", default=None)
    historical_parser = subparsers.add_parser("historical-batch", help="Fetch historical prices via chunked yf.download().")
    historical_parser.add_argument("tickers", type=str)
    historical_parser.add_argument("period", type=str, default="1mo", nargs="?")
    historical_parser.add_argument("interval", type=str, default="1d", nargs="?")
    args = parser.parse_args()
    if args.command in ("quotes", "fundamentals-batch"):
        cmd_quotes(args.symbols)
    elif args.command == "historical-batch":
        cmd_historical_batch(args.tickers, args.period, args.interval)


if __name__ == "__main__":
    main()
