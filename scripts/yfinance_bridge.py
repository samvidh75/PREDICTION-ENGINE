"""TRACK-38 — YFinance Python Bridge
Provides JSON output for Node.js consumption.

Usage: python yfinance_bridge.py <command> <args>
Commands:
  historical <symbol> [period]
  historical-batch <symbols_csv> [period] [interval]
  quotes <symbols_csv> [min_delay_seconds] [max_delay_seconds]
  fundamentals-batch <symbols_csv> [min_delay_seconds] [max_delay_seconds]
  dividends <symbol>
  splits <symbol>

Safety and reliability controls:
  - Historical candles use yf.download() in bounded batches.
  - Ticker.info fundamentals remain per-symbol and use randomized pacing.
  - Results are cached on disk to avoid repeated requests during the TTL window.
  - requests-cache is used when installed and compatible; JSON cache remains the fallback.
"""
import hashlib
import json
import os
import random
import sys
import time
from typing import Any, Dict, Iterable, List, Optional

try:
    import yfinance as yf
except Exception:  # pragma: no cover - depends on optional local runtime
    yf = None

try:
    import requests_cache
except Exception:  # pragma: no cover - optional compatibility layer
    requests_cache = None


def ensure_yfinance():
    if yf is None:
        raise RuntimeError("Python package yfinance is required. Install requirements-yfinance.txt.")


def env_int(name: str, default: int, minimum: int = 1, maximum: int = 500) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(maximum, value))


def env_float(name: str, default: float, minimum: float = 0.0, maximum: float = 60.0) -> float:
    try:
        value = float(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(maximum, value))


def cache_settings():
    path = os.environ.get("YFINANCE_CACHE_PATH", "tmp/yfinance-cache.json")
    ttl_seconds = env_int("YFINANCE_CACHE_SECONDS", 3600, 1, 604800)
    return path, ttl_seconds


def load_cache() -> Dict[str, Any]:
    path, _ = cache_settings()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_cache(cache: Dict[str, Any]):
    path, _ = cache_settings()
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, separators=(",", ":"))
    os.replace(temp_path, path)


def cache_key(namespace: str, *parts: str) -> str:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return f"{namespace}:{digest}"


def get_cached(cache: Dict[str, Any], key: str):
    _, ttl_seconds = cache_settings()
    entry = cache.get(key)
    if not isinstance(entry, dict):
        return None
    if time.time() - float(entry.get("cachedAt", 0)) > ttl_seconds:
        return None
    return entry.get("data")


def put_cached(cache: Dict[str, Any], key: str, data: Any):
    cache[key] = {"cachedAt": time.time(), "data": data}


def make_cached_session():
    if requests_cache is None:
        return None
    enabled = os.environ.get("YFINANCE_REQUEST_CACHE_ENABLED", "true").strip().lower()
    if enabled not in {"1", "true", "yes"}:
        return None
    path, ttl_seconds = cache_settings()
    cache_name = os.environ.get("YFINANCE_REQUEST_CACHE_NAME", f"{path}.http")
    try:
        return requests_cache.CachedSession(cache_name=cache_name, backend="sqlite", expire_after=ttl_seconds)
    except Exception:
        return None


def ticker_for(symbol: str):
    ensure_yfinance()
    session = make_cached_session()
    if session is not None:
        try:
            return yf.Ticker(symbol, session=session)
        except Exception:
            pass
    return yf.Ticker(symbol)


def chunks(items: List[str], size: int) -> Iterable[List[str]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed != parsed or parsed in (float("inf"), float("-inf")):
        return None
    return parsed


def get_historical(symbol: str, period: str = "5y"):
    ticker = ticker_for(symbol)
    hist = ticker.history(period=period)
    if hist.empty:
        return []
    hist = hist.reset_index()
    rows = []
    for _, row in hist.iterrows():
        rows.append({
            "date": str(row["Date"].date()),
            "open": safe_float(row["Open"]),
            "high": safe_float(row["High"]),
            "low": safe_float(row["Low"]),
            "close": safe_float(row["Close"]),
            "volume": int(row["Volume"]) if safe_float(row["Volume"]) is not None else None,
            "dividends": safe_float(row.get("Dividends", 0)) or 0,
            "stock_splits": safe_float(row.get("Stock Splits", 0)) or 0,
        })
    return rows


def download_batch(symbols: List[str], period: str, interval: str):
    ensure_yfinance()
    kwargs = {
        "period": period,
        "interval": interval,
        "group_by": "ticker",
        "threads": True,
        "progress": False,
        "auto_adjust": False,
        "actions": True,
        "repair": True,
        "timeout": env_float("YFINANCE_DOWNLOAD_TIMEOUT_SECONDS", 15.0, 1.0, 60.0),
    }
    session = make_cached_session()
    if session is not None:
        try:
            return yf.download(" ".join(symbols), session=session, **kwargs)
        except Exception:
            pass
    return yf.download(" ".join(symbols), **kwargs)


def get_historical_batch(symbols: List[str], period: str = "1mo", interval: str = "1d"):
    normalized = sorted({symbol.strip().upper() for symbol in symbols if symbol.strip()})
    if not normalized:
        return {"symbols": [], "rows": 0, "latestClose": {}, "errors": []}
    cache = load_cache()
    key = cache_key("historical-batch", ",".join(normalized), period, interval)
    cached = get_cached(cache, key)
    if cached is not None:
        return cached

    latest_close: Dict[str, Optional[float]] = {}
    errors: List[str] = []
    total_rows = 0
    batch_size = env_int("YFINANCE_BATCH_SIZE", 40, 1, 100)
    for group in chunks(normalized, batch_size):
        try:
            data = download_batch(group, period, interval)
            if data is None or getattr(data, "empty", False):
                errors.append(f"empty download for batch: {','.join(group)}")
                for symbol in group:
                    latest_close[symbol] = None
                continue
            total_rows += int(len(data))
            for symbol in group:
                try:
                    close_series = data[symbol]["Close"] if len(group) > 1 else data["Close"]
                    close_series = close_series.dropna()
                    latest_close[symbol] = None if close_series.empty else float(close_series.iloc[-1])
                except Exception:
                    latest_close[symbol] = None
        except Exception as exc:
            errors.append(f"batch {','.join(group)} failed: {exc}")
            for symbol in group:
                latest_close[symbol] = None

    result = {"symbols": normalized, "rows": total_rows, "latestClose": latest_close, "errors": errors}
    put_cached(cache, key, result)
    save_cache(cache)
    return result


def quote_payload(symbol: str, info: Dict[str, Any]):
    return {
        "symbol": symbol,
        "marketCap": info.get("marketCap"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "priceToBook": info.get("priceToBook"),
        "earningsPerShare": info.get("trailingEps"),
        "dividendYield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "debtToEquity": info.get("debtToEquity"),
        "currentRatio": info.get("currentRatio"),
        "returnOnEquity": info.get("returnOnEquity"),
        "returnOnAssets": info.get("returnOnAssets"),
        "revenueGrowth": info.get("revenueGrowth"),
        "earningsGrowth": info.get("earningsGrowth"),
        "grossMargins": info.get("grossMargins"),
        "operatingMargins": info.get("operatingMargins"),
        "profitMargins": info.get("profitMargins"),
        "shortName": info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
    }


def get_quotes(symbols: List[str], min_delay_seconds: float = 0.75, max_delay_seconds: float = 1.75):
    normalized = sorted({symbol.strip().upper() for symbol in symbols if symbol.strip()})
    results: Dict[str, Any] = {}
    cache = load_cache()
    cache_changed = False
    minimum = max(0.0, min(min_delay_seconds, max_delay_seconds))
    maximum = max(minimum, max(min_delay_seconds, max_delay_seconds))
    for index, symbol in enumerate(normalized):
        key = cache_key("quote", symbol)
        cached = get_cached(cache, key)
        if cached is not None:
            results[symbol] = cached
            continue
        if index > 0:
            time.sleep(random.uniform(minimum, maximum))
        try:
            ticker = ticker_for(symbol)
            results[symbol] = quote_payload(symbol, ticker.info)
            put_cached(cache, key, results[symbol])
            cache_changed = True
        except Exception as exc:
            results[symbol] = {"error": str(exc)}
    if cache_changed:
        save_cache(cache)
    return results


def get_dividends(symbol: str):
    ticker = ticker_for(symbol)
    divs = ticker.dividends
    if divs.empty:
        return []
    return [{"date": str(date_val.date()), "amount": float(amount)} for date_val, amount in divs.items()]


def get_splits(symbol: str):
    ticker = ticker_for(symbol)
    splits = ticker.splits
    if splits.empty:
        return []
    return [{"date": str(date_val.date()), "ratio": float(ratio)} for date_val, ratio in splits.items()]


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        sys.exit(1)

    cmd = sys.argv[1]
    try:
        if cmd == "historical":
            symbol = sys.argv[2]
            period = sys.argv[3] if len(sys.argv) > 3 else "5y"
            print(json.dumps(get_historical(symbol, period)))
        elif cmd == "historical-batch":
            symbols = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
            period = sys.argv[3] if len(sys.argv) > 3 else "1mo"
            interval = sys.argv[4] if len(sys.argv) > 4 else "1d"
            print(json.dumps(get_historical_batch(symbols, period, interval)))
        elif cmd in {"quotes", "fundamentals-batch"}:
            symbols = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
            min_delay = float(sys.argv[3]) if len(sys.argv) > 3 else env_float("YFINANCE_MIN_DELAY_SECONDS", 0.75)
            max_delay = float(sys.argv[4]) if len(sys.argv) > 4 else env_float("YFINANCE_MAX_DELAY_SECONDS", 1.75)
            print(json.dumps(get_quotes(symbols, min_delay, max_delay)))
        elif cmd == "dividends":
            print(json.dumps(get_dividends(sys.argv[2])))
        elif cmd == "splits":
            print(json.dumps(get_splits(sys.argv[2])))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
            sys.exit(1)
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
